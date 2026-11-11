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
load('dog.js');
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
console.log('faces');
{
  const mk = (scene, fig, extra) => STICK.compile({ scene, figures: [{ id: 'a', ...fig }], timeline: [{ cmd: 'wait', dur: 1 }], ...extra });
  const f = rt => rt.figs.get('a'), headR = rt => STICK.geom(f(rt)).headR;
  if (f(mk({}, {})).face !== 'cartoon') fail('default face should be cartoon');
  if (f(mk({ face: 'dots' }, {})).face !== 'dots') fail('scene.face should set the default');
  if (f(mk({ face: 'dots' }, { face: 'classic' })).face !== 'classic') fail('figure face should override the scene');
  if (f(mk({}, { face: 'Big Eyes' })).face !== 'cartoon') fail('face aliases should resolve');
  if (!mk({}, { face: 'photoreal' }).warnings.some(w => /face/.test(w))) fail('bogus face should warn');
  if (!(headR(mk({}, {})) > headR(mk({}, { face: 'classic' })) * 1.15)) fail('abstract faces should have a bigger head than classic');
  if (f(mk({}, {})).unevenEyes !== 1) fail('unevenEyes should default to 1');
  if (f(mk({ unevenEyes: false }, {})).unevenEyes !== 0) fail('scene.unevenEyes should set the default');
  if (f(mk({ unevenEyes: false }, { unevenEyes: 1.5 })).unevenEyes !== 1.5) fail('figure unevenEyes should override the scene');
  if (f(mk({}, { character: 'twin' }, { characters: { twin: { unevenEyes: false } } })).unevenEyes !== 0) fail('a character should be able to set unevenEyes');
  if (!mk({}, { unevenEyes: 'lots' }).warnings.some(w => /unevenEyes/.test(w))) fail('bogus unevenEyes should warn');
  // a scene compiled after a dots scene must not inherit its face (no state leaks between compiles)
  mk({ face: 'dots' }, {});
  if (f(mk({}, {})).face !== 'cartoon') fail('scene.face leaked into the next compile');
  console.log('  ok');
}

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

// characters: default height, the cast, hunch, doc-level characters
console.log('characters');
{
  const mk = (figs, extra) => STICK.compile(Object.assign({ figures: figs, timeline: [{ cmd: 'wait', args: { dur: 2 } }] }, extra || {}));
  const eq = (a, b, what) => { if (Math.abs(a - b) > 1e-9 && a !== b) fail(`${what}: expected ${b}, got ${a}`); };
  eq(mk([{ id: 'a' }]).figs.get('a').height, 25, 'default height');
  eq(mk([{ id: 'a', archetype: ['kid'] }]).figs.get('a').height, 16, 'kid height');
  const cast = {
    pip: { h: 16.5, hunch: 0, mouth: null }, mo: { h: 28.75, hunch: 0.5, mouth: null }, bea: { h: 23.75, hunch: 0, mouth: null },
    gus: { h: 23, hunch: 0, mouth: 'pipe' }, zed: { h: 26.25, hunch: 0, mouth: 'cigarette' }, nan: { h: 21.25, hunch: 1, mouth: null },
  };
  for (const [name, want] of Object.entries(cast)) {
    const rt = mk([{ id: name, character: name }]), f = rt.figs.get(name);
    if (rt.warnings.length) fail(`cast ${name} warns: ${rt.warnings.join(' | ')}`);
    eq(f.height, want.h, name + ' height'); eq(f.hunch, want.hunch, name + ' hunch'); eq(f.mouthItem, want.mouth, name + ' mouthItem');
  }
  if (mk([{ id: 'a', character: 'nan', height: 30, hunch: 0 }]).figs.get('a').hunch !== 0 || mk([{ id: 'a', character: 'nan', height: 30 }]).figs.get('a').height !== 30) fail('raw fields must beat the preset');
  if (mk([{ id: 'a', character: 'pip', wobble: 0.1 }]).figs.get('a').wobble !== 0.1 || mk([{ id: 'a', character: 'pip' }]).figs.get('a').wobble !== 1) fail('preset wobble / raw override wrong');
  if (mk([{ id: 'a', character: 'nobody' }]).warnings.length !== 1) fail('unknown character should warn once');
  if (!mk([{ id: 'a', mouth: 'kazoo' }]).warnings.some(w => /mouth/.test(w))) fail('unknown mouth should warn');
  if (mk([{ id: 'a', mouth: 'Pipe' }]).figs.get('a').mouthItem !== 'pipe') fail('mouth should normalise case');
  // hunch tilts the head forward, and survives a mood command
  const headX = (rt, t) => { const P = STICK.computeFigure(rt, rt.figs.get('a'), t); return P.headC.x; };
  const flat = mk([{ id: 'a', wobble: 0 }, ]), hun = mk([{ id: 'a', hunch: 1, wobble: 0 }]);
  if (!(headX(hun, 0.5) > headX(flat, 0.5) + 0.3)) fail('hunch should push the head forward');
  const mood = h => STICK.compile({ figures: [{ id: 'a', hunch: h, wobble: 0 }], timeline: [{ cmd: 'mood', target: 'a', args: { name: 'happy' } }, { cmd: 'wait', args: { dur: 2 } }] });
  if (!(headX(mood(1), 2.5) > headX(mood(0), 2.5) + 0.3)) fail('hunch must survive a mood command');
  const stoop = STICK.compile({ figures: [{ id: 'a', age: 'elderly', hunch: 1, wobble: 0 }], timeline: [{ cmd: 'wait', args: { dur: 2 } }] });
  const old = STICK.compile({ figures: [{ id: 'a', age: 'elderly', wobble: 0 }], timeline: [{ cmd: 'wait', args: { dur: 2 } }] });
  if (!(headX(stoop, 0.5) > headX(old, 0.5)) || headX(stoop, 0.5) - headX(old, 0.5) > 3) fail('elderly + hunch should stack but stay sane');
  // doc-level characters: custom, override built-in, extends, no global mutation
  const doc = { characters: { boss: { hat: 'fedora', hunch: 0.3, height: 27 }, gus: { height: 30 }, kid2: { extends: 'pip', hat: 'cap' }, loop: { extends: 'ghost' } },
    figures: [{ id: 'b', character: 'boss' }, { id: 'g', character: 'gus' }, { id: 'k', character: 'kid2' }, { id: 'u' }] };
  const rt = mk(doc.figures, { characters: doc.characters });
  const F = id => rt.figs.get(id);
  eq(F('b').height, 27, 'boss height'); eq(F('b').hat, 'fedora', 'boss hat'); eq(F('b').hunch, 0.3, 'boss hunch');
  eq(F('g').height, 30, 'override height'); eq(F('g').mouthItem, null, 'override replaces (not merges with) the built-in');
  eq(F('k').height, 16.5, 'extends inherits height'); eq(F('k').hat, 'cap', 'extends adds hat'); eq(F('k').hair, 'tuft', 'extends inherits hair');
  eq(F('u').height, 25, 'unnamed figure stays generic');
  if (rt.warnings.length) fail('doc characters warn: ' + rt.warnings.join(' | '));
  if (STICK.presets.characters.boss || STICK.presets.characters.gus.height !== 23) fail('doc characters must not mutate the global presets');
  const ext = mk([{ id: 'g', character: 'gus' }], { characters: { gus: { extends: 'gus', hat: 'beanie' } } }).figs.get('g');
  if (ext.hat !== 'beanie' || ext.mouthItem !== 'pipe') fail('a doc character extending its own built-in name should layer on the built-in');
  if (!mk([{ id: 'a', character: 'loop' }], { characters: { loop: { extends: 'ghost' } } }).warnings.some(w => /ghost/.test(w))) fail('extends of unknown character should warn');
  if (mk([{ id: 'a' }], { characters: 'nope' }).warnings.length !== 1) fail('non-object characters should warn');
  // held props scale with the holder
  const prop = h => { const r2 = STICK.compile({ figures: [{ id: 'a', height: h }], timeline: [{ cmd: 'give', target: 'a', args: { prop: 'apple', scale: 2 } }] }); return r2.ch.get('a_apple.scale', 0); };
  eq(prop(20), 2, 'prop scale at height 20'); eq(prop(25), 2.5, 'prop scale at height 25');
  console.log('  ok');
}

// dog: a first-class four-legged figure
console.log('dog');
{
  const comp = d => STICK.compile(JSON.parse(JSON.stringify(d)));
  const dog = o => Object.assign({ id: 'rex', kind: 'dog', pos: { x: 50, y: 70 } }, o);
  const pointsOf = P => [P.pelvis, P.neck, P.headC, P.sh, P.ctrl, P.legL.knee, P.legL.ank, P.legL.foot, P.legR.knee, P.legR.ank, P.legR.foot,
    P.armL.elb, P.armL.hand, P.armR.elb, P.armR.hand, P.mouth, ...P.tail,
    P.world.head, P.world.chest, P.world.pos, P.world.handL, P.world.handR, P.world.footL, P.world.footR, ...P.world.extra];
  const finite = (rt, what) => {
    for (let i = 0; i <= 200; i++) {
      const t = (rt.duration * i) / 200;
      for (const fig of rt.figs.values()) {
        const P = STICK.computeFigure(rt, fig, t);
        const nums = [P.x, P.y, P.fc, P.rot, P.g.h, P.g.headR, P.headA, P.earN, P.earF, ...Object.values(P.face).filter(v => typeof v === 'number')];
        if (fig.kind === 'dog') nums.push(P.mouthAngle, P.shadow.rx, P.shadow.ry, P.shadow.dx);
        const pts = fig.kind === 'dog' ? pointsOf(P) : [P.headC, P.world.head];
        if (!nums.every(v => v === undefined || isFinite(v)) || !pts.every(q => q && isFinite(q.x) && isFinite(q.y))) { fail(`${what}: non-finite pose for ${fig.id} at t=${t.toFixed(2)}`); return; }
        if (fig.kind === 'dog' && Math.max(P.legL.ank.y, P.legR.ank.y, P.armL.hand.y, P.armR.hand.y, P.headC.y + P.g.headR * 0.9) > 1e-6) { fail(`${what}: ${fig.id} sinks into the floor at t=${t.toFixed(2)}`); return; }
      }
    }
  };
  // declaring one: kind, archetype alias, the rex character, default height
  const decl = comp({ figures: [dog({}), { id: 'b', archetype: ['dog'] }, { id: 'c', character: 'rex' }, { id: 'p' }], timeline: [{ cmd: 'wait', dur: 1 }] });
  if (decl.warnings.length) fail('dog declarations warn: ' + decl.warnings.join(' | '));
  for (const id of ['rex', 'b', 'c']) if (decl.figs.get(id).kind !== 'dog' || decl.figs.get(id).height !== 12.5) fail(`${id} should be a dog of height 12.5`);
  if (decl.figs.get('p').kind !== 'person' || decl.figs.get('c').mood !== 'happy') fail('person kind / rex mood wrong');
  if (!comp({ figures: [{ id: 'a', kind: 'cat' }], timeline: [{ cmd: 'wait' }] }).warnings.some(w => /kind/.test(w))) fail('unknown kind should warn');
  // height = top of the head when standing
  { const rt = comp({ figures: [dog({ wobble: 0, mood: 'neutral', height: 14 })], timeline: [{ cmd: 'wait', dur: 1 }] }), P = STICK.computeFigure(rt, rt.figs.get('rex'), 0.5);
    if (Math.abs((70 - (P.world.head.y - P.g.headR)) - 14) > 0.5) fail('dog height should be the top of the head: ' + (70 - (P.world.head.y - P.g.headR))); }

  // walk, run, sit, lie, hop, turning through front/back, tilt, the clips: no warnings, all finite
  const tour = comp({ figures: [dog({ mood: 'happy' })], timeline: [
    { target: 'rex', cmd: 'move', args: { style: 'walk', to: { x: 70, y: 70 } } },
    { target: 'rex', cmd: 'move', args: { style: 'run', to: { x: 20, y: 70 }, via: [{ x: 40, y: 66 }] } },
    { target: 'rex', cmd: 'move', args: { style: 'slide', to: { x: 30, y: 70 } } },
    { target: 'rex', cmd: 'pose.tween', args: { base: 'sit' } }, { target: 'rex', cmd: 'hop' },
    { target: 'rex', cmd: 'pose.tween', args: { base: 'lie' } }, { target: 'rex', cmd: 'pose.tween', args: { base: 'sleep' } },
    { target: 'rex', cmd: 'pose.tween', args: { base: 'crouch', bend: 0.3, lean: -0.1, headTilt: 0.2, tilt: 12 } },
    { target: 'rex', cmd: 'pose.tween', args: { base: 'stand', bend: 0, lean: 0, headTilt: 0, tilt: 0 } },
    { target: 'rex', cmd: 'hop', args: { height: 6 } },
    { target: 'rex', cmd: 'turn', args: { to: 'front' } }, { target: 'rex', cmd: 'turn', args: { to: 'back' } },
    { target: 'rex', cmd: 'turn', args: { to: 'left' } }, { target: 'rex', cmd: 'facing', args: { dir: 'right' } },
    { target: 'rex', cmd: 'expression', args: { smile: 1, mouthOpen: 1, eyeOpen: 0.2, browTilt: -1, tears: 1 } },
    { target: 'rex', cmd: 'lookAt', args: { to: { x: 80, y: 30 } } }, { target: 'rex', cmd: 'blink' },
    { target: 'rex', cmd: 'say', args: { text: 'Woof!' } }, { target: 'rex', cmd: 'think', args: { text: 'Ball?' } },
    { target: 'rex', cmd: 'emote', args: { symbol: 'heart' } }, { target: 'rex', cmd: 'burst' },
    { target: 'rex', cmd: 'dog', args: { wag: 2, tail: -1, ears: 1, beg: 1, bow: 1, cock: -1 } },
    { cmd: 'camera.focus', args: { on: 'rex.face' } }, { cmd: 'camera.follow', args: { target: 'rex' } }, { cmd: 'camera.cut', args: { on: 'rex' } }, { cmd: 'camera.reset' },
    ...['wag', 'bark', 'beg', 'playBow', 'tiltHead', 'nod', 'hopJoy'].map(name => ({ target: 'rex', cmd: 'playClip', args: { name } })),
  ] });
  if (tour.warnings.length) fail('dog tour warns: ' + tour.warnings.join(' | '));
  finite(tour, 'dog tour');
  if (!tour.overlays.some(o => o.type === 'sfx' && o.name === 'woof')) fail('bark should play the woof sfx');
  for (const mood of Object.keys(STICK.presets.moods)) {
    const rt = comp({ figures: [dog({ mood: 'neutral', wobble: 1 })], timeline: [{ target: 'rex', cmd: 'mood', args: { name: mood } }, { cmd: 'wait', dur: 2 },
      { target: 'rex', cmd: 'move', args: { style: 'run', to: { x: 80, y: 70 } } }, { target: 'rex', cmd: 'pose.tween', args: { base: 'sit' } }, { target: 'rex', cmd: 'pose.tween', args: { base: 'lie' } }] });
    if (rt.warnings.length) fail(`dog mood ${mood} warns: ` + rt.warnings.join(' | '));
    finite(rt, 'dog mood ' + mood);
    if (!STICK.dogMoods[mood]) fail(`no tail/ear entry for mood "${mood}"`);
  }
  // feeling is in the tail: happy carries it high and wags, sad hangs it, and wobble 0 is still
  { const tip = (mood, wobble) => { const rt = comp({ figures: [dog({ mood, wobble })], timeline: [{ cmd: 'wait', dur: 3 }] }); let lo = Infinity, hi = -Infinity;
      let x0 = Infinity, x1 = -Infinity;
      for (let t = 1; t < 3; t += 0.02) { const q = STICK.computeFigure(rt, rt.figs.get('rex'), t).tail[2]; lo = Math.min(lo, q.y); hi = Math.max(hi, q.y); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); } return { lo, hi, sweep: Math.hypot(hi - lo, x1 - x0) }; };
    const happy = tip('happy', 0.6), sad = tip('sad', 0.6), still = tip('neutral', 0);
    if (!(happy.hi < sad.lo)) fail('a happy tail should be carried above a sad one');
    if (!(happy.sweep > 2) || sad.sweep > 0.3) fail(`happy should wag and sad should not: ${happy.sweep} / ${sad.sweep}`);
    if (still.sweep > 1e-9) fail('wobble 0 should still the tail: ' + still.sweep); }

  // human-only commands and clips warn once per name and never throw; they leave the dog alone
  { const rt = comp({ figures: [dog({}), { id: 'ann', pos: { x: 20, y: 70 } }], timeline: [
      { target: 'rex', cmd: 'joints', args: { shoulderR: 120 } }, { target: 'rex', cmd: 'joints', args: { kneeL: 40 } },
      { target: ['ann', 'rex'], cmd: 'raiseArm', args: { side: 'both' } }, { target: 'rex', cmd: 'lowerArm' }, { target: 'rex', cmd: 'liftLeg' }, { target: 'rex', cmd: 'lowerLeg' },
      { target: 'rex', cmd: 'point', args: { to: 'ann.head' } }, { target: 'rex', cmd: 'reachTo', args: { to: 'ann.head' } }, { target: 'rex', cmd: 'pin', args: { foot: 'both' } },
      { target: 'rex', cmd: 'hands', args: { shape: 'fist' } }, { target: 'rex', cmd: 'playClip', args: { name: 'wave' } }, { target: 'rex', cmd: 'playClip', args: { name: 'wave' } },
      { target: 'ann', cmd: 'playClip', args: { name: 'wag' } }, { target: 'ann', cmd: 'dog', args: { wag: 1 } }, { cmd: 'wait', dur: 1 }] });
    const want = ['joints', 'raiseArm', 'lowerArm', 'liftLeg', 'lowerLeg', 'point', 'reachTo', 'pin', 'hands'];
    for (const c of want) if (rt.warnings.filter(w => w.indexOf(`"${c}" is not available for a dog`) >= 0).length !== 1) fail(`"${c}" on a dog should warn exactly once`);
    if (rt.warnings.filter(w => /clip "wave" is not available for a dog/.test(w)).length !== 1) fail('a human clip on a dog should warn once');
    if (!rt.warnings.some(w => /only for a dog/.test(w)) || !rt.warnings.some(w => /only works on a dog/.test(w))) fail('dog clip / dog cmd on a person should warn');
    if (rt.warnings.length !== want.length + 3) fail('unexpected dog warnings: ' + rt.warnings.join(' | '));
    if (rt.ch.get('ann.shR', 5) !== 160) fail('a mixed target must still drive the person');
    if (rt.ch.m.get('rex.shR').tracks.length || rt.ch.m.get('rex.pinFL').tracks.length) fail('human-only commands must not touch the dog');
    finite(rt, 'human-only on dog'); }

  // fetch: the prop is carried in the mouth; auto-framing covers the dog; the bundled examples are clean
  { const rt = comp(STICK.examples.fetch), rex = rt.figs.get('rex');
    const grip = rt.grips.find(g => g.fig === 'rex');
    if (!grip || grip.hand !== 'R') fail('fetch: the dog should grip the ball (mouth = hand R)');
    else {
      const t = grip.t0 + 0.8, P = STICK.computeFigure(rt, rex, t);
      if (Math.hypot(P.world.handR.x - P.toWorld(P.mouth).x, P.world.handR.y - P.toWorld(P.mouth).y) > 1e-9) fail('world.handR must be the mouth');
      const head = P.world.head, d = Math.hypot(P.world.handR.x - head.x, P.world.handR.y - head.y);
      if (!(d > 0.5 * P.g.headR && d < 2 * P.g.headR) || (P.world.handR.x - head.x) * P.fc <= 0) fail('the mouth should sit just in front of the head');
      // at the grab the snout is on the ball (no pop), and the dog did not have to shuffle
      const ball = rt.objs.get(grip.obj), bx = ball.pivot.x + rt.ch.get(grip.obj + '.tx', grip.t0 - 1e-3), by = ball.pivot.y + rt.ch.get(grip.obj + '.ty', grip.t0 - 1e-3);
      const G0 = STICK.computeFigure(rt, rex, grip.t0).world.handR;
      if (Math.hypot(G0.x - bx, G0.y - by) > 0.6) fail(`pickUp: the mouth is ${Math.hypot(G0.x - bx, G0.y - by).toFixed(2)} from the ball at the grab`);
      const give = comp({ figures: [dog({})], timeline: [{ target: 'rex', cmd: 'give', args: { prop: 'ball', hand: 'left' } }, { cmd: 'wait', dur: 1 }, { target: 'rex', cmd: 'drop', args: { hand: 'left', to: 'ground' } }] });
      if (give.warnings.length || give.grips[0].hand !== 'R' || give.grips[0].t1 === Infinity) fail('give/drop on a dog should use the mouth whatever "hand" says: ' + give.warnings.join(' | '));
      if (give.ch.m.get('rex.shR').tracks.length !== 0 && STICK.computeFigure(give, give.figs.get('rex'), 0.5).armR.hand.y < -1) fail('a dog must not strike an arm-holding pose');
    }
    for (const name of ['fetch', 'the W-word']) {
      const r2 = comp(STICK.examples[name]);
      if (r2.warnings.length) fail(`${name} warns: ` + r2.warnings.join(' | '));
      for (let i = 0; i <= 150; i++) {
        const t = (r2.duration * i) / 150, v = STICK.visibleRect(r2, t), b = STICK.figureBounds(r2, 'rex', t);
        if (b.x < v.x - 1e-6 || b.y < v.y - 1e-6 || b.x + b.w > v.x + v.w + 1e-6 || b.y + b.h > v.y + v.h + 1e-6) { fail(`${name}: the dog leaves the frame at t=${t.toFixed(2)}`); break; }
      }
    }
    const solo = comp({ figures: [dog({})], timeline: [{ target: 'rex', cmd: 'say', args: { text: 'Woof!' } }] });
    if (!solo.autoFrame || !(solo.autoFrame.z > 1.5)) fail('a lone dog should be auto-framed closer: ' + JSON.stringify(solo.autoFrame));
    const B = STICK.figureBounds(solo, 'rex', 0.5), Ps = STICK.computeFigure(solo, solo.figs.get('rex'), 0.5);
    for (const q of Ps.world.extra) if (q.x < B.x || q.x > B.x + B.w || q.y < B.y || q.y > B.y + B.h) fail('figureBounds should cover the tail and snout');
  }

  // the head leads the chest in the facing direction, both ways (and in every base pose)
  for (const facing of ['right', 'left']) for (const base of ['stand', 'sit', 'lie', 'crouch']) {
    const rt = comp({ figures: [dog({ facing, pose: { base } })], timeline: [{ cmd: 'wait', dur: 2 }] });
    for (let t = 0; t <= 2; t += 0.25) {
      const P = STICK.computeFigure(rt, rt.figs.get('rex'), t), sgn = facing === 'right' ? 1 : -1;
      if (P.fc !== sgn || (P.world.head.x - P.world.chest.x) * sgn <= 0.5 || (P.world.handR.x - P.world.head.x) * sgn <= 0) { fail(`facing ${facing} / ${base}: head should be ahead of the chest`); break; }
    }
  }
  console.log('  ok');
}

// the deployed system prompt must match PROMPT.md (regenerate: node scripts/gen-prompt.js)
console.log('prompt sync');
if (!require(path.join(__dirname, '..', 'scripts', 'gen-prompt.js')).inSync()) fail('netlify/edge-functions/_lib/stick-prompt.ts is out of date — run: node scripts/gen-prompt.js');
else console.log('  ok');

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nall good');
