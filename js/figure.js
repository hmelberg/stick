/* stick — figure math: normalization, channel setup, pose computation.
   Drawing lives in styles.js — every visual style renders the same skeleton.

   Conventions (documented once, used everywhere):
   - Figure-local space: origin at the ground point between the feet,
     +x = facing direction, +y = down (same as SVG).
   - Joint angles in degrees: 0 = limb hanging straight down,
     positive = forward (toward facing). Knee/elbow are relative bends:
     positive knee bends the shin backward, positive elbow bends the forearm forward.
   - Body group transform: translate(x,y) scale(facing,1) rotate(rot),
     so the same pose JSON works facing either way. */
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;
  const STICK = (G.STICK = G.STICK || {});
  const { clamp, lerp } = STICK;

  const rad = d => (d * Math.PI) / 180;
  const sind = d => Math.sin(rad(d));
  const cosd = d => Math.cos(rad(d));
  const dirDown = a => ({ x: sind(a), y: cosd(a) });
  const dirUp = a => ({ x: sind(a), y: -cosd(a) });
  const add = (p, d, len) => ({ x: p.x + d.x * len, y: p.y + d.y * len });
  const mixP = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) });
  const rand01 = (k, seed) => {
    const v = Math.sin(k * 12.9898 + seed * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };

  /* Rickert-approved proportions: bigger head, arms to thigh level, legs
     about half the body. headScale lets kids keep an adult-sized head. */
  STICK.geom = f => {
    const h = typeof f === 'number' ? f : f.height;
    const hs = typeof f === 'object' && f.headScale ? f.headScale : 1;
    return {
      h,
      thigh: 0.22 * h, shin: 0.22 * h,
      torso: 0.30 * h, neckLen: 0.045 * h, headR: 0.135 * h * hs,
      upper: 0.20 * h, fore: 0.175 * h,
      foot: 0.10 * h, stroke: 0.05 * h,
    };
  };

  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);

  const BODY_COLORS = ['#b9cfe4', '#e8cfb4', '#c5dec0', '#e3d3a8', '#d8c2dd', '#bcd8d8'];

  STICK.normalizeFigure = function (raw, i, warn, defaultStyle) {
    raw = raw && typeof raw === 'object' ? raw : {};
    let preset = {};
    if (raw.character) {
      const c = STICK.presets.characters[raw.character];
      if (c) preset = { ...preset, ...c };
      else warn(`unknown character "${raw.character}"`);
    }
    const archList = Array.isArray(raw.archetype) ? raw.archetype : raw.archetype ? [raw.archetype] : [];
    for (const a of archList) {
      const p = STICK.presets.archetypes[a];
      if (p) preset = { ...preset, ...p };
      else warn(`unknown archetype "${a}"`);
    }
    let style = raw.style || preset.style || defaultStyle || 'sketch';
    if (STICK.styles && !STICK.styles[style]) { warn(`unknown style "${style}" — using sketch`); style = 'sketch'; }
    const fig = {
      id: String(raw.id || raw.name || 'fig' + i),
      name: raw.name || String(raw.id || 'fig' + i),
      archetype: archList,
      character: raw.character || null,
      voice: raw.voice && typeof raw.voice === 'object' ? raw.voice : null,
      style,
      height: num(raw.height, num(preset.height, 20)),
      headScale: num(raw.headScale, num(preset.headScale, 1)),
      color: raw.color || preset.color || '#2a2a35',
      bodyColor: raw.bodyColor || preset.bodyColor || BODY_COLORS[i % BODY_COLORS.length],
      hair: raw.hair != null ? raw.hair : preset.hair || 'none',
      glasses: raw.glasses != null ? !!raw.glasses : !!preset.glasses,
      hat: raw.hat != null ? raw.hat : preset.hat || null,
      // body variant: 'full' (default) or 'bust' = floating head + neck + arms (no
      // torso/legs), handy for a talking-head explainer. `bust: true` is an alias.
      body: (raw.body === 'bust' || raw.body === 'head' || raw.bust === true) ? 'bust' : (preset.body || 'full'),
      pos: { x: num(raw.pos && raw.pos.x, 50), y: num(raw.pos && raw.pos.y, 70) },
      // yaw: 0 front, ±1 side (left/right), ±2 back (continuous, tweenable)
      facing: (f => f === 'front' || f === 0 ? 0 : f === 'left' ? -1 : f === 'right' ? 1 : f === 'back' ? 2
        : (typeof f === 'number' && isFinite(f)) ? clamp(f, -2, 2) : 1)(raw.facing),
      pose: raw.pose || {},
      expression: raw.expression || {},
      mood: raw.mood || preset.mood || 'neutral',
      seed: (i + 1) * 0.731,
    };
    if (!STICK.presets.moods[fig.mood]) { warn(`unknown mood "${fig.mood}" — using neutral`); fig.mood = 'neutral'; }
    return fig;
  };

  const STANCE = { together: -1, normal: 0, wide: 1 };

  STICK.initFigureChannels = function (rt, fig) {
    const ch = rt.ch, id = fig.id, P = fig.pose;
    const mood = STICK.presets.moods[fig.mood];
    const set = (s, v) => ch.setBase(id + '.' + s, v);

    set('x', fig.pos.x); set('y', fig.pos.y);
    set('facing', fig.facing);

    let base = P.base || 'stand';
    let tilt = num(P.tilt, 0);
    if (base === 'mjLean') { base = 'stand'; if (!P.tilt) tilt = 22; }
    set('tilt', tilt);
    set('sit', base === 'sit' ? 1 : 0);
    set('crouch', base === 'crouch' ? 1 : 0);
    set('lie', base === 'lie' || base === 'sleep' ? 1 : 0);

    set('bend', num(P.bend, num(mood.pose.bend, 0.02)));
    set('lean', num(P.lean, 0));
    set('headTilt', num(P.headTilt, num(mood.pose.headTilt, 0)));
    const st = P.stance;
    set('stanceW', typeof st === 'number' ? st : STANCE[st] != null ? STANCE[st] : 0);

    set('shL', 0); set('shR', 0); set('elL', 8); set('elR', 8);
    set('hipL', 0); set('hipR', 0); set('kneeL', 0); set('kneeR', 0);
    set('handL', 'relaxed'); set('handR', 'relaxed');
    // A "bust" (floating head + arms) has no legs, so straight-down arms read as
    // legs. Rest its arms bent and forward so they clearly look like gesturing arms.
    if (fig.body === 'bust') { set('shL', 22); set('shR', 22); set('elL', 64); set('elR', 64); }

    const E = { ...mood.expr, ...fig.expression };
    if (base === 'sleep') E.eyeOpen = 0.04;
    set('smile', num(E.smile, 0));
    set('eyeOpen', num(E.eyeOpen, 1));
    set('browTilt', num(E.browTilt, 0));
    set('browRaise', num(E.browRaise, 0));
    set('mouthOpen', num(E.mouthOpen, 0));
    set('pupX', num(E.pupilX, 0));
    set('pupY', num(E.pupilY, 0));

    set('mood', base === 'sleep' ? 'sleepy' : fig.mood);
    set('reachLon', 0); set('reachLx', 0); set('reachLy', 0);
    set('reachRon', 0); set('reachRx', 0); set('reachRy', 0);
    set('pinFL', null); set('pinFR', null);
  };

  /* two-bone analytic IK: returns mid joint + (clamped) end point.
     side: -1 bends the mid joint forward (+x, knees), +1 backward (elbows). */
  function ik2(p, tgt, l1, l2, side) {
    let dx = tgt.x - p.x, dy = tgt.y - p.y;
    let d = Math.hypot(dx, dy) || 1e-4;
    const dc = clamp(d, Math.abs(l1 - l2) + 0.02, l1 + l2 - 0.02);
    const ux = dx / d, uy = dy / d;
    const end = { x: p.x + ux * dc, y: p.y + uy * dc };
    const a = Math.acos(clamp((l1 * l1 + dc * dc - l2 * l2) / (2 * l1 * dc), -1, 1));
    const base = Math.atan2(end.y - p.y, end.x - p.x);
    const ang = base + side * a;
    return { mid: { x: p.x + l1 * Math.cos(ang), y: p.y + l1 * Math.sin(ang) }, end };
  }

  function activeLoco(rt, figId, t) {
    let found = null;
    for (const l of rt.loco) if (l.fig === figId && t >= l.t0 && t <= l.t1 + 0.05) found = l;
    return found;
  }

  const GAIT = {
    walk:     { stride: 0.62, hip: 27, knee: 38, arm: 19, elbow: 10, elbowSwing: 7, bob: 0.017, lean: 2,  lift: 0.05 },
    run:      { stride: 0.95, hip: 44, knee: 65, arm: 32, elbow: 70, elbowSwing: 0, bob: 0.045, lean: 10, lift: 0.10 },
    moonwalk: { stride: 0.45, hip: 13, knee: 0,  arm: 0,  elbow: 6,  elbowSwing: 0, bob: 0.004, lean: -7, lift: 0 },
    slide:    { stride: 1,    hip: 0,  knee: 0,  arm: 0,  elbow: 10, elbowSwing: 0, bob: 0,     lean: -9, lift: 0 },
  };

  function gaitOffsets(rt, fig, t, g, loco) {
    const p = GAIT[loco.style] || GAIT.walk;
    const x = rt.ch.get(fig.id + '.x', t), y = rt.ch.get(fig.id + '.y', t);
    const traveled = Math.hypot(x - loco.x0, y - loco.y0);
    const ramp = clamp(Math.min((t - loco.t0) / 0.25, (loco.t1 - t) / 0.3, 1), 0, 1);
    const phi = (traveled / (p.stride * g.h)) * Math.PI * 2;
    const o = { hipL: 0, hipR: 0, kneeL: 0, kneeR: 0, shL: 0, shR: 0, elL: 0, elR: 0, bobUp: 0, lean: 0, liftL: 0, liftR: 0, ramp };
    if (ramp <= 0) return o;
    const s = Math.sin(phi);
    if (loco.style === 'slide') {
      o.hipL = 16; o.hipR = -12; o.kneeL = 14; o.kneeR = 14; o.shL = 18; o.shR = -14;
    } else if (loco.style === 'moonwalk') {
      o.hipL = p.hip * s; o.hipR = -p.hip * s;
      o.kneeL = 36 * Math.pow(Math.max(0, Math.sin(phi)), 3);
      o.kneeR = 36 * Math.pow(Math.max(0, Math.sin(phi + Math.PI)), 3);
      o.shL = -8; o.shR = -8;
    } else {
      o.hipL = p.hip * s; o.hipR = -p.hip * s;
      // A leg is in *swing* (foot recovering forward, off the ground) while its hip
      // sweeps forward — cos(phi) > 0 for the left leg, anti-phase for the right.
      // Bend the knee AND lift the foot there so the step clears the ground and
      // reads as forward walking (not a planted-foot skate / backward moonwalk).
      const swingL = Math.max(0, Math.cos(phi)), swingR = Math.max(0, -Math.cos(phi));
      o.kneeL = p.knee * swingL; o.kneeR = p.knee * swingR;
      o.shL = -p.arm * s; o.shR = p.arm * s;
      o.elL = p.elbowSwing * Math.sin(phi + 1); o.elR = p.elbowSwing * Math.sin(phi + 1 + Math.PI);
      o.liftL = p.lift * g.h * swingL; o.liftR = p.lift * g.h * swingR;
    }
    o.elL += p.elbow; o.elR += p.elbow;
    o.bobUp = p.bob * g.h * Math.abs(s);
    o.lean = p.lean;
    for (const k of ['hipL', 'hipR', 'kneeL', 'kneeR', 'shL', 'shR', 'elL', 'elR', 'bobUp', 'lean', 'liftL', 'liftR']) o[k] *= ramp;
    return o;
  }

  function blinkAmt(t, seed) {
    const L = 3.4, k = Math.floor(t / L);
    const bt = k * L + 0.5 + rand01(k, seed) * 2.3;
    const d = Math.abs(t - bt), w = 0.07;
    return d < w ? 1 - d / w : 0;
  }

  /* The pure pose function: figure state at time t, in local coords + transform. */
  STICK.computeFigure = function (rt, fig, t) {
    const ch = rt.ch, id = fig.id;
    const g = STICK.geom(fig);
    const get = (s, d) => ch.getDef(id + '.' + s, t, d === undefined ? 0 : d);

    const x = get('x', 50), y = get('y', 70);
    // yaw: 0 front, ±1 side, ±2 back (continuous, tweenable)
    const yawV = clamp(get('facing', 1), -2, 2);
    const at = Math.abs(yawV) * 90;                                 // |yaw| in degrees
    const fc = yawV >= 0 ? 1 : -1;
    const lateralAmt = at <= 90 ? 1 - at / 90 : (at - 90) / 90;     // limbs spread laterally near front AND back
    const latSign = at <= 90 ? 1 : -1;                              // back mirrors left/right
    const faceFront = clamp(1 - at / 90, 0, 1);                     // eye symmetry: 1 front, 0 by side
    const faceShow = clamp(1 - Math.max(0, at - 90) / 90, 0, 1);   // face fades to blank by the back
    let bend = get('bend'), lean = get('lean'), headTilt = get('headTilt');
    const stanceW = get('stanceW');
    const wSit = clamp(get('sit'), 0, 1), wCr = clamp(get('crouch'), 0, 1), wLie = clamp(get('lie'), 0, 1);

    const loco = activeLoco(rt, id, t);
    const gait = loco ? gaitOffsets(rt, fig, t, g, loco) : { hipL: 0, hipR: 0, kneeL: 0, kneeR: 0, shL: 0, shR: 0, elL: 0, elR: 0, bobUp: 0, lean: 0, liftL: 0, liftR: 0, ramp: 0 };

    // idle life: breathing, sway, joy-bounce — scaled down while walking
    const moodName = ch.getDef(id + '.mood', t, 'neutral');
    const prof = (STICK.presets.moods[moodName] || STICK.presets.moods.neutral).idle;
    const idleK = (1 - gait.ramp) * (1 - wLie * 0.7);
    const ph0 = fig.seed * 6.283;
    const f = 0.22 + 0.12 * prof.energy;
    bend += 0.012 * (0.5 + prof.sway) * Math.sin(6.283 * f * t + ph0) * idleK;
    headTilt += 0.018 * prof.sway * Math.sin(6.283 * f * 0.6 * t + ph0 * 1.7) * idleK;
    const shIdle = 2.2 * prof.sway * Math.sin(6.283 * f * 0.5 * t + ph0 * 0.6) * idleK
      + prof.bounce * 6 * Math.sin(6.283 * 2.1 * t + ph0) * idleK;
    const bobIdle = prof.bounce ? 0.035 * g.h * prof.bounce * Math.max(0, Math.sin(6.283 * 2.1 * t + ph0)) * idleK : 0;

    // legs: blended base pose + stance + explicit joints + gait
    const baseHip = wSit * 78 + wCr * 62;
    const baseKnee = wSit * 78 + wCr * 105;
    const splay = Math.max(0.5, 3 + stanceW * 4) * (1 - wLie) * (1 - wSit * 0.6);
    let hipLA = baseHip + splay + get('hipL') + gait.hipL;
    let hipRA = baseHip - splay + get('hipR') + gait.hipR;
    let kneeLA = baseKnee + get('kneeL') + gait.kneeL;
    let kneeRA = baseKnee + get('kneeR') + gait.kneeR;

    const legVert = (hip, knee) => g.thigh * cosd(hip) + g.shin * cosd(hip - knee);
    let ph = Math.max(legVert(hipLA, kneeLA), legVert(hipRA, kneeRA));
    ph = Math.max(ph, 0.3 * (g.thigh + g.shin));
    ph *= 1 - 0.82 * wLie;
    ph += gait.bobUp + bobIdle;

    const rot = get('tilt') + -88 * wLie;
    const pelvis = { x: 0, y: -ph };

    // torso & head
    const torsoA = lean * 55 + bend * 40 + gait.lean;
    const neck = add(pelvis, dirUp(torsoA), g.torso);
    const tv = { x: neck.x - pelvis.x, y: neck.y - pelvis.y };
    const tl = Math.hypot(tv.x, tv.y) || 1;
    const back = { x: tv.y / tl, y: -tv.x / tl };
    const mid = mixP(pelvis, neck, 0.5);
    const ctrl = { x: mid.x + back.x * (bend * 2.8 + 0.12), y: mid.y + back.y * (bend * 2.8 + 0.12) };
    const headA = torsoA * 0.45 + headTilt * 55;
    const headC = add(neck, dirUp(headA), g.neckLen + g.headR);
    const sh = mixP(pelvis, neck, 0.92);

    // transform helpers
    const cr = Math.cos(rad(rot)), sr = Math.sin(rad(rot));
    const toWorld = p => ({ x: x + fc * (p.x * cr - p.y * sr), y: y + (p.x * sr + p.y * cr) });
    const toLocal = w => {
      const qx = (w.x - x) * fc, qy = w.y - y;
      return { x: qx * cr + qy * sr, y: -qx * sr + qy * cr };
    };

    // arms (FK, then reach-IK blend)
    const armFollow = torsoA * 0.5;
    const sw = 0.13 * g.h; // shoulder half-spread when facing front
    const mkArm = (side, rest) => {
      const a = get('sh' + side) + (side === 'L' ? gait.shL : gait.shR) + shIdle * 0.6 + armFollow + rest;
      const e = get('el' + side) + (side === 'L' ? gait.elL : gait.elR);
      // sagittal (side) pose
      let elb = add(sh, dirDown(a), g.upper);
      let hand = add(elb, dirDown(a + e), g.fore);
      const on = clamp(get('reach' + side + 'on'), 0, 1);
      // frontal (front) pose — same joint angles, but the arm swings out to the
      // body's side instead of forward; faded out while reaching
      const fa = lateralAmt * (1 - on);
      if (fa > 0.001) {
        const eta = (side === 'L' ? -1 : 1) * latSign;
        const shF = { x: sh.x + eta * sw, y: sh.y };
        const elbF = { x: shF.x + eta * sind(a) * g.upper, y: shF.y + cosd(a) * g.upper };
        const handF = { x: elbF.x + eta * sind(a + e) * g.fore, y: elbF.y + cosd(a + e) * g.fore };
        elb = mixP(elb, elbF, fa); hand = mixP(hand, handF, fa);
      }
      if (on > 0.01) {
        const tgt = toLocal({ x: get('reach' + side + 'x'), y: get('reach' + side + 'y') });
        const ik = ik2(sh, tgt, g.upper, g.fore, 1);
        elb = mixP(elb, ik.mid, on);
        hand = mixP(hand, ik.end, on);
      }
      return { elb, hand };
    };
    const armL = mkArm('L', -3), armR = mkArm('R', 3);

    // legs (FK, then pin-IK)
    const hw = 0.075 * g.h; // hip half-spread when facing front
    const mkLeg = (hipA, kneeA, pinName, side, lift) => {
      let knee = add(pelvis, dirDown(hipA), g.thigh);
      let ank = add(knee, dirDown(hipA - kneeA), g.shin);
      const pin = ch.getDef(id + '.' + pinName, t, null);
      // frontal pose: legs planted apart, ~straight down (faded out when walking/pinned)
      const fa = lateralAmt * (pin ? 0 : 1) * (1 - gait.ramp);
      let footX = g.foot;
      if (fa > 0.001) {
        const eta = (side === 'L' ? -1 : 1) * latSign, spread = 7;
        const kneeF = { x: pelvis.x + eta * hw + eta * sind(spread) * g.thigh, y: pelvis.y + cosd(spread) * g.thigh };
        const ankF = { x: kneeF.x + eta * sind(spread) * g.shin, y: kneeF.y + cosd(spread) * g.shin };
        knee = mixP(knee, kneeF, fa); ank = mixP(ank, ankF, fa);
        footX = g.foot * (1 - fa) + eta * g.foot * 0.55 * fa;
      }
      // raise the swing foot (and knee a touch) for step clearance — ignored when pinned
      if (lift) { knee.y -= lift * 0.35; ank.y -= lift; }
      if (pin && typeof pin === 'object') {
        const ik = ik2(pelvis, toLocal(pin), g.thigh, g.shin, -1);
        knee = ik.mid; ank = ik.end;
      }
      const foot = { x: ank.x + footX, y: ank.y + 0.12 };
      return { knee, ank, foot };
    };
    const legL = mkLeg(hipLA, kneeLA, 'pinFL', 'L', gait.liftL);
    const legR = mkLeg(hipRA, kneeRA, 'pinFR', 'R', gait.liftR);

    // face
    const blink = blinkAmt(t, fig.seed);
    const face = {
      smile: clamp(get('smile'), -1, 1),
      eyeOpen: clamp(get('eyeOpen', 1), 0, 1) * (1 - blink),
      browTilt: clamp(get('browTilt'), -1, 1),
      browRaise: clamp(get('browRaise'), -0.3, 1),
      mouthOpen: clamp(get('mouthOpen'), 0, 1),
      pupX: clamp(get('pupX'), -1, 1),
      pupY: clamp(get('pupY'), -1, 1),
      front: faceFront, show: faceShow,
    };

    return {
      x, y, fc, rot, g, pelvis, neck, ctrl, sh, headC, headA,
      lateral: lateralAmt, // 1 = facing front/back (limbs symmetric), 0 = full side
      legL, legR, armL, armR, face, toWorld,
      hands: {
        L: ch.getDef(id + '.handL', t, 'open'),
        R: ch.getDef(id + '.handR', t, 'open'),
      },
      world: {
        head: toWorld(headC),
        chest: toWorld(neck),
        handL: toWorld(armL.hand), handR: toWorld(armR.hand),
        footL: toWorld(legL.ank), footR: toWorld(legR.ank),
        pos: { x, y },
      },
    };
  };
})();
