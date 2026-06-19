/* Node smoke test: compile every bundled example, sample the whole timeline,
   assert no exceptions / NaN poses / compile warnings. Run: node test/smoke.js */
'use strict';
global.window = undefined; // modules fall back to globalThis

const path = require('path');
const load = f => require(path.join(__dirname, '..', 'js', f));
load('presets.js');
load('engine.js');
load('figure.js');
load('styles.js');
load('scene.js');
load('commands.js');
load('examples.js');

const STICK = globalThis.STICK;
let failures = 0;
const fail = msg => { failures++; console.error('  FAIL: ' + msg); };

for (const [name, doc] of Object.entries(STICK.examples)) {
  console.log(`example: ${name}`);
  let rt;
  try {
    rt = STICK.compile(JSON.parse(JSON.stringify(doc)));
  } catch (e) {
    fail(`compile threw: ${e.stack}`);
    continue;
  }
  if (rt.warnings.length) fail('warnings: ' + rt.warnings.join(' | '));
  if (!(rt.duration > 1) || !isFinite(rt.duration)) fail('bad duration ' + rt.duration);
  console.log(`  duration ${rt.duration.toFixed(1)}s, channels ${rt.ch.m.size}, overlays ${rt.overlays.length}`);

  const steps = 120;
  for (let i = 0; i <= steps; i++) {
    const t = (rt.duration * i) / steps;
    for (const fig of rt.figs.values()) {
      let P;
      try {
        P = STICK.computeFigure(rt, fig, t);
      } catch (e) {
        fail(`computeFigure threw at t=${t.toFixed(2)} for ${fig.id}: ${e.stack}`);
        i = steps + 1;
        break;
      }
      const pts = [P.pelvis, P.neck, P.headC, P.sh, P.legL.knee, P.legL.ank, P.legR.ank,
        P.armL.elb, P.armL.hand, P.armR.hand, P.world.head];
      for (const p of pts) {
        if (!isFinite(p.x) || !isFinite(p.y)) {
          fail(`NaN point at t=${t.toFixed(2)} for ${fig.id}`);
          i = steps + 1;
          break;
        }
      }
      if (!isFinite(P.rot) || !isFinite(P.x) || !isFinite(P.y)) fail(`NaN transform at t=${t.toFixed(2)} for ${fig.id}`);
    }
    for (const obj of rt.objs.values()) {
      for (const s of ['tx', 'ty', 'scale', 'rot', 'opacity']) {
        if (!isFinite(rt.ch.get(obj.id + '.' + s, t))) {
          fail(`NaN object channel ${obj.id}.${s} at t=${t.toFixed(2)}`);
          i = steps + 1; break;
        }
      }
    }
  }
}

// forgiveness checks: broken input must warn, not throw
console.log('forgiveness checks');
try {
  const rt = STICK.compile({
    figures: [{ id: 'a', mood: 'confuzzled', archetype: ['alien'] }],
    timeline: [
      { cmd: 'explode', target: 'a' },
      { cmd: 'move', target: 'ghost', args: { to: { x: 1, y: 2 } } },
      { cmd: 'move', target: 'a', args: { style: 'teleport', to: 'nowhere.here' } },
      { at: 'whenever', cmd: 'mood', target: 'a', args: { name: 'happy' } },
      { cmd: 'playClip', target: 'a', args: { name: 'nope' } },
      'not even an object',
    ],
  });
  if (rt.warnings.length < 5) fail('expected several warnings, got: ' + rt.warnings.join(' | '));
  STICK.computeFigure(rt, rt.figs.get('a'), 1.0);
  console.log(`  ok — ${rt.warnings.length} warnings, no exceptions`);
} catch (e) {
  fail('forgiveness test threw: ' + e.stack);
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nall good');
