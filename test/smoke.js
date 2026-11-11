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
load('props.js');
load('board.js');
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

// auto-framing + aspect
console.log('auto-framing / aspect');
{
  const comp = d => STICK.compile(JSON.parse(JSON.stringify(d)));
  const cam = rt => ['cam.x', 'cam.y', 'cam.z'].map(k => rt.ch.m.get(k).base);
  const rt = comp(STICK.examples['three styles']);
  if (!(cam(rt)[2] > 1)) fail('"three styles" should auto-zoom, cam.z=' + cam(rt)[2]);
  for (let i = 0; i <= 120; i++) {
    const t = (rt.duration * i) / 120, v = STICK.visibleRect(rt, t);
    for (const fig of rt.figs.values()) {
      const b = STICK.figureBounds(rt, fig.id, t);
      if (b.x < v.x - 1e-6 || b.y < v.y - 1e-6 || b.x + b.w > v.x + v.w + 1e-6 || b.y + b.h > v.y + v.h + 1e-6) { fail(`figure ${fig.id} leaves the visible rect at t=${t.toFixed(2)}`); i = 121; break; }
    }
  }
  const lec = comp(STICK.examples['guided tour']);
  if (cam(lec).join() !== '50,50,1') fail('scene with camera commands must keep cam 50/50/1, got ' + cam(lec));
  const street = comp(STICK.examples['moonwalk']);
  if (cam(street).join() !== '50,50,1') fail('full-scenery scene must stay at z=1, got ' + cam(street));
  const off = comp({ scene: { autoFrame: false }, figures: [{ id: 'a', pos: { x: 50, y: 70 } }], timeline: [{ cmd: 'say', target: 'a', args: { text: 'hi' } }] });
  if (cam(off).join() !== '50,50,1') fail('autoFrame:false must keep the default camera');
  const wide = comp({ scene: { aspect: '16:9' }, figures: [{ id: 'a', pos: { x: 50, y: 70 } }], timeline: [{ cmd: 'say', target: 'a', args: { text: 'hi' } }] });
  if (Math.abs(wide.view.w - 177.78) > 0.01 || wide.view.h !== 100 || wide.warnings.length) fail('16:9 view wrong: ' + JSON.stringify(wide.view) + wide.warnings);
  const portrait = comp({ scene: { aspect: '9:16' }, figures: [{ id: 'a' }], timeline: [{ cmd: 'say', target: 'a', args: { text: 'hi' } }] });
  if (portrait.view.w !== 100 || Math.abs(portrait.view.h - 177.78) > 0.01) fail('9:16 view wrong: ' + JSON.stringify(portrait.view));
  const bogus = comp({ scene: { aspect: 'banana' }, figures: [{ id: 'a' }], timeline: [{ cmd: 'say', target: 'a', args: { text: 'hi' } }] });
  if (!bogus.warnings.some(w => /aspect/.test(w)) || bogus.view.w !== 100) fail('bogus aspect should warn and fall back to 1:1');
  console.log(`  ok — three styles z=${cam(rt)[2]}, 16:9 view.w=${wide.view.w.toFixed(2)}`);
}

// wobble: a still figure really is still at 0, and the scene default / names / bad values behave
console.log('wobble');
{
  const mk = (scene, fig) => STICK.compile({ scene, figures: [{ id: 'a', ...fig }], timeline: [{ cmd: 'wait', args: { dur: 3 } }] });
  const drift = rt => { const f = rt.figs.get('a'); let lo = Infinity, hi = -Infinity; for (let t = 0; t < 3; t += 0.05) { const x = STICK.computeFigure(rt, f, t).world.head.x; lo = Math.min(lo, x); hi = Math.max(hi, x); } return hi - lo; };
  const still = mk({ wobble: 0 }, {}), dflt = mk({}, {}), lively = mk({}, { wobble: 'high' });
  if (drift(still) > 1e-9) fail('wobble 0 still drifts: ' + drift(still));
  if (!(drift(dflt) > 0 && drift(lively) > drift(dflt))) fail(`wobble ordering wrong: default ${drift(dflt)}, high ${drift(lively)}`);
  if (dflt.figs.get('a').wobble !== 0.6 || mk({ wobble: 'low' }, {}).figs.get('a').wobble !== 0.3) fail('wobble defaults/names wrong');
  if (mk({ wobble: 0 }, { wobble: 1 }).figs.get('a').wobble !== 1) fail('per-figure wobble should override the scene');
  if (!mk({}, { wobble: 'jelly' }).warnings.some(w => /wobble/.test(w))) fail('bogus wobble should warn');
  console.log('  ok');
}

// the deployed system prompt must match PROMPT.md (regenerate: node scripts/gen-prompt.js)
console.log('prompt sync');
if (!require(path.join(__dirname, '..', 'scripts', 'gen-prompt.js')).inSync()) fail('netlify/edge-functions/_lib/stick-prompt.ts is out of date — run: node scripts/gen-prompt.js');
else console.log('  ok');

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nall good');
