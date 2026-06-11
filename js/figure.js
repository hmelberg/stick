/* stick — figure: normalization, channel setup, pose computation, SVG drawing.

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

  STICK.geom = h => ({
    h,
    thigh: 0.24 * h, shin: 0.24 * h,
    torso: 0.34 * h, neckLen: 0.06 * h, headR: 0.13 * h,
    upper: 0.20 * h, fore: 0.18 * h,
    foot: 0.09 * h, stroke: 0.055 * h,
  });

  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);

  STICK.normalizeFigure = function (raw, i, warn) {
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
    const fig = {
      id: String(raw.id || raw.name || 'fig' + i),
      name: raw.name || String(raw.id || 'fig' + i),
      height: num(raw.height, num(preset.height, 16)),
      color: raw.color || preset.color || '#2a2a35',
      hair: raw.hair != null ? raw.hair : preset.hair || 'none',
      glasses: raw.glasses != null ? !!raw.glasses : !!preset.glasses,
      hat: raw.hat != null ? raw.hat : preset.hat || null,
      pos: { x: num(raw.pos && raw.pos.x, 50), y: num(raw.pos && raw.pos.y, 70) },
      facing: raw.facing === 'left' || raw.facing === -1 ? -1 : 1,
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
    walk:     { stride: 0.62, hip: 27, knee: 34, kneePh: 1.1, arm: 19, elbow: 10, elbowSwing: 7, bob: 0.017, lean: 2 },
    run:      { stride: 0.95, hip: 44, knee: 65, kneePh: 1.0, arm: 32, elbow: 70, elbowSwing: 0, bob: 0.045, lean: 10 },
    moonwalk: { stride: 0.45, hip: 13, knee: 0,  kneePh: 0,   arm: 0,  elbow: 6,  elbowSwing: 0, bob: 0.004, lean: -7 },
    slide:    { stride: 1,    hip: 0,  knee: 0,  kneePh: 0,   arm: 0,  elbow: 10, elbowSwing: 0, bob: 0,     lean: -9 },
  };

  function gaitOffsets(rt, fig, t, g, loco) {
    const p = GAIT[loco.style] || GAIT.walk;
    const x = rt.ch.get(fig.id + '.x', t), y = rt.ch.get(fig.id + '.y', t);
    const traveled = Math.hypot(x - loco.x0, y - loco.y0);
    const ramp = clamp(Math.min((t - loco.t0) / 0.25, (loco.t1 - t) / 0.3, 1), 0, 1);
    const phi = (traveled / (p.stride * g.h)) * Math.PI * 2;
    const o = { hipL: 0, hipR: 0, kneeL: 0, kneeR: 0, shL: 0, shR: 0, elL: 0, elR: 0, bobUp: 0, lean: 0, ramp };
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
      o.kneeL = p.knee * Math.max(0, Math.sin(phi - p.kneePh));
      o.kneeR = p.knee * Math.max(0, Math.sin(phi - p.kneePh + Math.PI));
      o.shL = -p.arm * s; o.shR = p.arm * s;
      o.elL = p.elbowSwing * Math.sin(phi + 1); o.elR = p.elbowSwing * Math.sin(phi + 1 + Math.PI);
    }
    o.elL += p.elbow; o.elR += p.elbow;
    o.bobUp = p.bob * g.h * Math.abs(s);
    o.lean = p.lean;
    for (const k of ['hipL', 'hipR', 'kneeL', 'kneeR', 'shL', 'shR', 'elL', 'elR', 'bobUp', 'lean']) o[k] *= ramp;
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
    const g = STICK.geom(fig.height);
    const get = (s, d) => ch.getDef(id + '.' + s, t, d === undefined ? 0 : d);

    const x = get('x', 50), y = get('y', 70);
    const fc = get('facing', 1) >= 0 ? 1 : -1;
    let bend = get('bend'), lean = get('lean'), headTilt = get('headTilt');
    const stanceW = get('stanceW');
    const wSit = clamp(get('sit'), 0, 1), wCr = clamp(get('crouch'), 0, 1), wLie = clamp(get('lie'), 0, 1);

    const loco = activeLoco(rt, id, t);
    const gait = loco ? gaitOffsets(rt, fig, t, g, loco) : { hipL: 0, hipR: 0, kneeL: 0, kneeR: 0, shL: 0, shR: 0, elL: 0, elR: 0, bobUp: 0, lean: 0, ramp: 0 };

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
    const mkArm = (side, rest) => {
      const a = get('sh' + side) + (side === 'L' ? gait.shL : gait.shR) + shIdle * 0.6 + armFollow + rest;
      const e = get('el' + side) + (side === 'L' ? gait.elL : gait.elR);
      let elb = add(sh, dirDown(a), g.upper);
      let hand = add(elb, dirDown(a + e), g.fore);
      const on = clamp(get('reach' + side + 'on'), 0, 1);
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
    const mkLeg = (hipA, kneeA, pinName) => {
      let knee = add(pelvis, dirDown(hipA), g.thigh);
      let ank = add(knee, dirDown(hipA - kneeA), g.shin);
      const pin = ch.getDef(id + '.' + pinName, t, null);
      if (pin && typeof pin === 'object') {
        const ik = ik2(pelvis, toLocal(pin), g.thigh, g.shin, -1);
        knee = ik.mid; ank = ik.end;
      }
      const foot = { x: ank.x + g.foot, y: ank.y + 0.12 };
      return { knee, ank, foot };
    };
    const legL = mkLeg(hipLA, kneeLA, 'pinFL');
    const legR = mkLeg(hipRA, kneeRA, 'pinFR');

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
    };

    return {
      x, y, fc, rot, g, pelvis, neck, ctrl, sh, headC, headA,
      legL, legR, armL, armR, face, toWorld,
      world: {
        head: toWorld(headC),
        chest: toWorld(neck),
        handL: toWorld(armL.hand), handR: toWorld(armR.hand),
        footL: toWorld(legL.ank), footR: toWorld(legR.ank),
        pos: { x, y },
      },
    };
  };

  /* ------------------------- SVG construction ------------------------- */
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, parent) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  };
  const pt = p => p.x.toFixed(2) + ' ' + p.y.toFixed(2);

  function hairFor(fig, r, parent, ink) {
    const stroke = { stroke: ink, 'stroke-width': 0.16 * r, fill: 'none', 'stroke-linecap': 'round' };
    const style = fig.hair;
    if (style === 'short' || style === 'spiky') {
      let d = '';
      for (let k = 0; k <= 6; k++) {
        const th = rad(160 - k * (140 / 6));
        const R = r * (k % 2 ? 1.26 : 1.02);
        const p = { x: Math.cos(th) * R, y: -Math.sin(th) * R };
        d += (k ? 'L' : 'M') + pt(p);
      }
      mk('path', { d, ...stroke }, parent);
    } else if (style === 'tuft' || style === 'curly') {
      mk('path', {
        d: `M ${0.05 * r} ${-1.02 * r} Q ${-0.1 * r} ${-1.5 * r} ${0.4 * r} ${-1.42 * r} Q ${0.15 * r} ${-1.36 * r} ${0.22 * r} ${-1.06 * r}`,
        ...stroke,
      }, parent);
    } else if (style === 'long') {
      mk('path', { d: `M ${0.15 * r} ${-0.99 * r} Q ${-1.1 * r} ${-0.8 * r} ${-0.95 * r} ${0.6 * r}`, ...stroke }, parent);
      mk('path', { d: `M ${-0.35 * r} ${-0.93 * r} Q ${-1.3 * r} ${-0.45 * r} ${-1.1 * r} ${0.8 * r}`, ...stroke }, parent);
    } else if (style === 'bun') {
      mk('circle', { cx: -0.8 * r, cy: -0.62 * r, r: 0.3 * r, fill: ink }, parent);
    } else if (style === 'sides') {
      mk('circle', { cx: -0.72 * r, cy: 0.3 * r, r: 0.27 * r, fill: ink }, parent);
      mk('path', { d: `M ${-0.1 * r} ${-1.05 * r} Q 0 ${-1.32 * r} ${0.18 * r} ${-1.12 * r}`, ...stroke }, parent);
    }
  }

  function hatFor(fig, r, parent, ink) {
    if (fig.hat === 'fedora') {
      mk('path', { d: `M ${-1.25 * r} ${-0.55 * r} L ${1.05 * r} ${-0.55 * r}`, stroke: ink, 'stroke-width': 0.16 * r, 'stroke-linecap': 'round', fill: 'none' }, parent);
      mk('path', { d: `M ${-0.7 * r} ${-0.58 * r} L ${-0.58 * r} ${-1.3 * r} Q 0 ${-1.44 * r} ${0.5 * r} ${-1.28 * r} L ${0.62 * r} ${-0.58 * r} Z`, fill: ink }, parent);
    }
  }

  STICK.buildFigureNode = function (fig, parent) {
    const g = STICK.geom(fig.height);
    const r = g.headR, ink = fig.color, w = g.stroke;
    const root = mk('g', { class: 'fig' }, parent);
    const limb = { stroke: ink, 'stroke-width': w, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };

    const farG = mk('g', { opacity: 0.62 }, root);
    const far = mk('path', { ...limb, 'stroke-width': w * 0.9 }, farG);
    const torso = mk('path', limb, root);
    const head = mk('circle', { r, fill: 'var(--paper, #f7f2e9)', stroke: ink, 'stroke-width': w * 0.85 }, root);
    const headG = mk('g', {}, root);
    hairFor(fig, r, headG, ink);

    const fw = 0.09 * r; // face stroke width
    const eyeN = mk('ellipse', { cx: 0.14 * r, cy: -0.15 * r, rx: 0.15 * r, fill: ink }, headG);
    const eyeF = mk('ellipse', { cx: 0.52 * r, cy: -0.15 * r, rx: 0.15 * r, fill: ink }, headG);
    const pupN = mk('circle', { r: 0.07 * r, fill: 'var(--paper, #f7f2e9)' }, headG);
    const pupF = mk('circle', { r: 0.07 * r, fill: 'var(--paper, #f7f2e9)' }, headG);
    const browN = mk('path', { stroke: ink, 'stroke-width': fw * 1.4, fill: 'none', 'stroke-linecap': 'round' }, headG);
    const browF = mk('path', { stroke: ink, 'stroke-width': fw * 1.4, fill: 'none', 'stroke-linecap': 'round' }, headG);
    const mouth = mk('path', { stroke: ink, 'stroke-width': fw * 1.5, fill: 'none', 'stroke-linecap': 'round' }, headG);
    const mouthO = mk('ellipse', { fill: ink }, headG);
    if (fig.glasses) {
      const gl = { stroke: ink, 'stroke-width': fw, fill: 'none' };
      mk('circle', { cx: 0.14 * r, cy: -0.15 * r, r: 0.27 * r, ...gl }, headG);
      mk('circle', { cx: 0.52 * r, cy: -0.15 * r, r: 0.27 * r, ...gl }, headG);
      mk('path', { d: `M ${-0.13 * r} ${-0.15 * r} L ${-0.85 * r} ${-0.28 * r}`, ...gl }, headG);
    }
    hatFor(fig, r, headG, ink);

    const nearG = mk('g', {}, root);
    const near = mk('path', limb, nearG);

    return { root, far, torso, head, headG, eyeN, eyeF, pupN, pupF, browN, browF, mouth, mouthO, near, r, fig };
  };

  STICK.updateFigureNode = function (n, P) {
    const r = n.r;
    n.root.setAttribute('transform', `translate(${P.x.toFixed(2)} ${P.y.toFixed(2)}) scale(${P.fc} 1) rotate(${P.rot.toFixed(2)})`);

    const legD = l => `M ${pt(P.pelvis)} L ${pt(l.knee)} L ${pt(l.ank)} L ${pt(l.foot)}`;
    const armD = a => `M ${pt(P.sh)} L ${pt(a.elb)} L ${pt(a.hand)}`;
    n.far.setAttribute('d', legD(P.legL) + ' ' + armD(P.armL));
    n.near.setAttribute('d', legD(P.legR) + ' ' + armD(P.armR));
    n.torso.setAttribute('d', `M ${pt(P.pelvis)} Q ${pt(P.ctrl)} ${pt(P.neck)} L ${pt(mixCN(P))}`);
    n.head.setAttribute('cx', P.headC.x.toFixed(2));
    n.head.setAttribute('cy', P.headC.y.toFixed(2));
    n.headG.setAttribute('transform', `translate(${P.headC.x.toFixed(2)} ${P.headC.y.toFixed(2)}) rotate(${P.headA.toFixed(2)})`);

    const F = P.face;
    const ry = Math.max(0.022 * r, 0.19 * r * F.eyeOpen);
    for (const e of [n.eyeN, n.eyeF]) { e.setAttribute('ry', ry.toFixed(3)); }
    const showPup = F.eyeOpen > 0.35;
    for (const [pup, eye] of [[n.pupN, n.eyeN], [n.pupF, n.eyeF]]) {
      pup.setAttribute('visibility', showPup ? 'visible' : 'hidden');
      if (showPup) {
        pup.setAttribute('cx', (parseFloat(eye.getAttribute('cx')) + 0.02 * r + F.pupX * 0.055 * r).toFixed(3));
        pup.setAttribute('cy', (-0.15 * r + F.pupY * 0.05 * r).toFixed(3));
      }
    }
    const by = -0.46 * r - F.browRaise * 0.16 * r;
    const k = -F.browTilt * 0.1 * r;
    const brow = cx => `M ${(cx - 0.17 * r).toFixed(3)} ${(by - k).toFixed(3)} L ${(cx + 0.17 * r).toFixed(3)} ${(by + k).toFixed(3)}`;
    n.browN.setAttribute('d', brow(0.14 * r));
    n.browF.setAttribute('d', brow(0.52 * r));

    const mx = 0.36 * r, my = 0.48 * r, hw = 0.28 * r;
    n.mouth.setAttribute('d', `M ${(mx - hw).toFixed(3)} ${my.toFixed(3)} Q ${mx.toFixed(3)} ${(my + F.smile * 0.36 * r).toFixed(3)} ${(mx + hw).toFixed(3)} ${my.toFixed(3)}`);
    if (F.mouthOpen > 0.06) {
      n.mouthO.setAttribute('visibility', 'visible');
      n.mouthO.setAttribute('cx', mx.toFixed(3));
      n.mouthO.setAttribute('cy', (my + 0.1 * r + 0.1 * r * F.mouthOpen).toFixed(3));
      n.mouthO.setAttribute('rx', (0.13 * r).toFixed(3));
      n.mouthO.setAttribute('ry', (0.17 * r * F.mouthOpen).toFixed(3));
    } else n.mouthO.setAttribute('visibility', 'hidden');
  };

  // small neck stub from the neck point toward the head
  function mixCN(P) {
    const d = { x: P.headC.x - P.neck.x, y: P.headC.y - P.neck.y };
    const l = Math.hypot(d.x, d.y) || 1;
    const stub = Math.max(0, l - P.g.headR);
    return { x: P.neck.x + (d.x / l) * stub, y: P.neck.y + (d.y / l) * stub };
  }
})();
