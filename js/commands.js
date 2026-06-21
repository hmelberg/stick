/* stick — commands: every timeline command is a macro that expands into
   channel tweens (plus overlay/locomotion records). Unknown or broken events
   warn and are skipped — the show must go on. */
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;
  const STICK = (G.STICK = G.STICK || {});
  const { clamp, parseDur, EASE } = STICK;
  const DUR = STICK.DUR;

  const dv = (s, rt) => {
    if (DUR[s] != null) return DUR[s];
    const n = parseFloat(s);
    if (!isNaN(n)) return Math.max(0, n);
    rt.warn(`unknown duration "${s}" in "at" — using 0.5`);
    return 0.5;
  };

  /* Timing rules (GSAP-flavoured):
     no "at"        -> starts when the previous event ends (sequential)
     "at": 2.5      -> absolute seconds (relative to clip start inside a clip)
     "at": "+slow"  -> previous end + offset       "-slow" -> previous end - offset
     "at": "<"      -> together with previous       "<+fast" -> previous start + offset */
  function resolveAt(at, cur, rt) {
    if (at == null) return cur.end;
    if (typeof at === 'number' && isFinite(at)) return Math.max(0, cur.origin + at);
    if (typeof at === 'string') {
      const s = at.trim();
      if (s === '<') return cur.start;
      let m;
      if ((m = s.match(/^<\+(.+)$/))) return cur.start + dv(m[1], rt);
      if ((m = s.match(/^<-(.+)$/))) return Math.max(0, cur.start - dv(m[1], rt));
      if ((m = s.match(/^\+(.+)$/))) return cur.end + dv(m[1], rt);
      if ((m = s.match(/^-(.+)$/))) return Math.max(0, cur.end - dv(m[1], rt));
      const n = parseFloat(s);
      if (!isNaN(n)) return Math.max(0, cur.origin + n);
    }
    rt.warn(`bad "at" value ${JSON.stringify(at)} — placing sequentially`);
    return cur.end;
  }

  function figOf(ctx) {
    const rt = ctx.rt;
    if (ctx.targetId != null) {
      const f = rt.figs.get(String(ctx.targetId));
      if (f) return f;
      rt.warn(`unknown target "${ctx.targetId}" for cmd "${ctx.ev.cmd}"`);
      return null;
    }
    if (rt.figs.size === 1) return rt.figs.values().next().value;
    rt.warn(`cmd "${ctx.ev.cmd}" has no target`);
    return null;
  }

  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const durOf = (ctx, def) => parseDur(ctx.ev.dur != null ? ctx.ev.dur : ctx.args.dur, def, ctx.rt.warn);
  const easeOf = (ctx, def) => EASE[ctx.ev.ease || ctx.args.ease] || def;
  const tw = (ctx, fig, suf, t0, dur, to, ease) => ctx.rt.ch.tween(fig.id + '.' + suf, t0, dur, to, ease);
  const st = (ctx, fig, suf, t0, v) => ctx.rt.ch.set(fig.id + '.' + suf, t0, v);
  const cv = (ctx, fig, suf) => ctx.rt.ch.get(fig.id + '.' + suf, ctx.t0);
  const sidesOf = (v, def) => (v === 'both' ? ['L', 'R'] : v === 'left' ? ['L'] : v === 'right' ? ['R'] : [def]);

  const JOINTS = {
    shoulderL: 'shL', shoulderR: 'shR', elbowL: 'elL', elbowR: 'elR',
    hipL: 'hipL', hipR: 'hipR', kneeL: 'kneeL', kneeR: 'kneeR',
    shL: 'shL', shR: 'shR', elL: 'elL', elR: 'elR',
  };
  const EXPR = {
    smile: 'smile', eyeOpen: 'eyeOpen', browTilt: 'browTilt', browRaise: 'browRaise',
    mouthOpen: 'mouthOpen', pupilX: 'pupX', pupilY: 'pupY',
    browSkew: 'browSkew', tears: 'tears', blush: 'blush',
  };
  const STANCE = { together: -1, normal: 0, wide: 1 };
  const SPEED = { walk: 11, run: 26, slide: 22, moonwalk: 7.5 };

  const H = {};

  /* ------------------------------ movement ------------------------------ */
  H.move = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const rt = ctx.rt, a = ctx.args;
    const to = STICK.resolvePoint(rt, a.to, ctx.t0);
    if (!to) { rt.warn('move: missing/unresolvable "to"'); return 0; }
    let style = a.style || 'walk';
    if (!SPEED[style]) { rt.warn(`unknown move style "${style}" — walking`); style = 'walk'; }
    const x0 = cv(ctx, fig, 'x'), y0 = cv(ctx, fig, 'y');
    // optional `via` waypoints -> a polyline path: start -> via... -> to
    const via = Array.isArray(a.via) ? a.via.map(p => STICK.resolvePoint(rt, p, ctx.t0)).filter(Boolean) : [];
    const pts = [{ x: x0, y: y0 }, ...via, to];
    const segLen = []; let total = 0;
    for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); segLen.push(L); total += L; }
    if (total < 0.4) return 0;
    const dur = ctx.ev.dur != null || ctx.args.dur != null ? durOf(ctx, 1) : clamp(total / SPEED[style], 0.35, 8);
    const ease = style === 'slide' ? EASE.out : EASE.sine;
    const autoFace = a.face !== false && a.autoFace !== false;
    let tAcc = ctx.t0;
    for (let i = 1; i < pts.length; i++) {
      const segDur = dur * (segLen[i - 1] / total), dx = pts[i].x - pts[i - 1].x;
      if (autoFace && Math.abs(dx) > 0.5) st(ctx, fig, 'facing', tAcc, (dx > 0 ? 1 : -1) * (style === 'moonwalk' ? -1 : 1));
      const segEase = pts.length === 2 ? ease : EASE.linear; // constant speed along a multi-point path
      tw(ctx, fig, 'x', tAcc, segDur, pts[i].x, segEase);
      tw(ctx, fig, 'y', tAcc, segDur, pts[i].y, segEase);
      tAcc += segDur;
    }
    rt.loco.push({ fig: fig.id, t0: ctx.t0, t1: ctx.t0 + dur, style, x0, y0 });
    return dur;
  };
  H.walk = ctx => { ctx.args = { ...ctx.args, style: 'walk' }; return H.move(ctx); };
  H.run = ctx => { ctx.args = { ...ctx.args, style: 'run' }; return H.move(ctx); };
  H.slide = ctx => { ctx.args = { ...ctx.args, style: 'slide' }; return H.move(ctx); };
  H.moonwalk = ctx => { ctx.args = { ...ctx.args, style: 'moonwalk' }; return H.move(ctx); };

  H.hop = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const dur = durOf(ctx, 0.55);
    const hgt = num(ctx.args.height, 2.2);
    const y0 = cv(ctx, fig, 'y');
    const up = dur * 0.45;
    tw(ctx, fig, 'y', ctx.t0, up, y0 - hgt, EASE.out);
    tw(ctx, fig, 'y', ctx.t0 + up, dur - up, y0, EASE.in);
    const k0L = cv(ctx, fig, 'kneeL'), k0R = cv(ctx, fig, 'kneeR');
    tw(ctx, fig, 'kneeL', ctx.t0, up * 0.7, k0L + 50, EASE.out);
    tw(ctx, fig, 'kneeR', ctx.t0, up * 0.7, k0R + 50, EASE.out);
    tw(ctx, fig, 'kneeL', ctx.t0 + up * 0.7, dur - up * 0.7, k0L, EASE.in);
    tw(ctx, fig, 'kneeR', ctx.t0 + up * 0.7, dur - up * 0.7, k0R, EASE.in);
    return dur;
  };

  const turnVal = d => d === 'front' || d === 0 ? 0 : d === 'left' ? -1 : d === 'right' ? 1 : d === 'back' ? 2
    : (typeof d === 'number' && isFinite(d)) ? clamp(d, -2, 2) : 1;
  H.facing = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const v = turnVal(ctx.args.dir != null ? ctx.args.dir : ctx.args.to);
    const durA = ctx.ev.dur != null ? ctx.ev.dur : ctx.args.dur;
    if (durA != null) { const dur = durOf(ctx, DUR.quick); tw(ctx, fig, 'facing', ctx.t0, dur, v, EASE.inOut); return dur; } // turn smoothly (passes through front)
    st(ctx, fig, 'facing', ctx.t0, v);
    return 0.02;
  };
  H.turn = ctx => { ctx.ev = Object.assign({}, ctx.ev, { dur: ctx.ev.dur != null ? ctx.ev.dur : (ctx.args.dur != null ? ctx.args.dur : 'quick') }); return H.facing(ctx); };

  /* ------------------------------ pose ------------------------------ */
  const BASES = { stand: [0, 0, 0], sit: [1, 0, 0], crouch: [0, 1, 0], lie: [0, 0, 1], sleep: [0, 0, 1] };
  H['pose.tween'] = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const a = ctx.args, dur = durOf(ctx, DUR.quick), ease = easeOf(ctx, EASE.inOut);
    let base = a.base;
    if (base === 'mjLean') { base = 'stand'; if (a.tilt == null) tw(ctx, fig, 'tilt', ctx.t0, dur, 22, ease); }
    if (base != null) {
      const w = BASES[base];
      if (!w) ctx.rt.warn(`unknown pose base "${base}"`);
      else {
        tw(ctx, fig, 'sit', ctx.t0, dur, w[0], ease);
        tw(ctx, fig, 'crouch', ctx.t0, dur, w[1], ease);
        tw(ctx, fig, 'lie', ctx.t0, dur, w[2], ease);
        if (base === 'sleep') {
          tw(ctx, fig, 'eyeOpen', ctx.t0, dur, 0.04, ease);
          st(ctx, fig, 'mood', ctx.t0, 'sleepy');
        }
      }
    }
    for (const k of ['bend', 'lean', 'headTilt', 'tilt']) {
      if (typeof a[k] === 'number') tw(ctx, fig, k, ctx.t0, dur, a[k], ease);
    }
    if (a.stance != null) {
      const v = typeof a.stance === 'number' ? a.stance : STANCE[a.stance];
      if (v != null) tw(ctx, fig, 'stanceW', ctx.t0, dur, v, ease);
      else ctx.rt.warn(`unknown stance "${a.stance}"`);
    }
    return dur;
  };
  H['pose.set'] = ctx => { ctx.ev = { ...ctx.ev, dur: 0.02 }; return H['pose.tween'](ctx); };
  H.pose = H['pose.tween'];

  H.joints = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const dur = durOf(ctx, DUR.quick), ease = easeOf(ctx, EASE.inOut);
    for (const k in ctx.args) {
      if (k === 'dur' || k === 'ease') continue;
      const suf = JOINTS[k];
      if (!suf) { ctx.rt.warn(`unknown joint "${k}"`); continue; }
      if (typeof ctx.args[k] === 'number') tw(ctx, fig, suf, ctx.t0, dur, ctx.args[k], ease);
    }
    return dur;
  };

  /* ------------------------------ face ------------------------------ */
  H.expression = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const dur = durOf(ctx, DUR.quick), ease = easeOf(ctx, EASE.inOut);
    for (const k in ctx.args) {
      if (k === 'dur' || k === 'ease' || k === 'showEyebrows') continue;
      const suf = EXPR[k];
      if (!suf) { ctx.rt.warn(`unknown expression field "${k}"`); continue; }
      if (typeof ctx.args[k] === 'number') tw(ctx, fig, suf, ctx.t0, dur, ctx.args[k], ease);
    }
    return dur;
  };
  H.expr = H.expression;
  H.face = H.expression;

  const MOOD_PFX = { very: 1.6, really: 1.6, super: 1.9, extremely: 2, slightly: 0.55, mildly: 0.6, 'a bit': 0.6, 'a little': 0.6 };
  H.mood = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    let name = ctx.args.name || ctx.args.mood;
    let pfx = 1; // word prefix like "very angry" / "slightly sad"
    if (typeof name === 'string') {
      const m = name.trim().toLowerCase().match(/^(very|really|super|extremely|slightly|mildly|a bit|a little)\s+(.+)$/);
      if (m) { name = m[2]; pfx = MOOD_PFX[m[1]] || 1; }
    }
    const preset = STICK.presets.moods[name];
    if (!preset) { ctx.rt.warn(`unknown mood "${name}"`); return 0; }
    const dur = ctxx_animated(ctx) ? durOf(ctx, DUR.quick) : 0.02;
    const ease = EASE.inOut;
    const E = preset.expr;
    // intensity: 1 = the preset's strength; scales each value's deviation from neutral.
    const I = clamp(num(ctx.args.intensity, 1) * pfx, 0, 2.5);
    const sv = (v, base) => base + (v - base) * I;
    tw(ctx, fig, 'smile', ctx.t0, dur, sv(num(E.smile, 0.08), 0.08), ease);
    tw(ctx, fig, 'eyeOpen', ctx.t0, dur, sv(num(E.eyeOpen, 1), 1), ease);
    tw(ctx, fig, 'browTilt', ctx.t0, dur, sv(num(E.browTilt, 0), 0), ease);
    tw(ctx, fig, 'browRaise', ctx.t0, dur, sv(num(E.browRaise, 0), 0), ease);
    tw(ctx, fig, 'mouthOpen', ctx.t0, dur, sv(num(E.mouthOpen, 0), 0), ease);
    tw(ctx, fig, 'pupX', ctx.t0, dur, sv(num(E.pupilX, 0), 0), ease);
    tw(ctx, fig, 'pupY', ctx.t0, dur, sv(num(E.pupilY, 0), 0), ease);
    tw(ctx, fig, 'browSkew', ctx.t0, dur, sv(num(E.browSkew, 0), 0), ease);
    tw(ctx, fig, 'tears', ctx.t0, dur, sv(num(E.tears, 0), 0), ease);
    tw(ctx, fig, 'blush', ctx.t0, dur, sv(num(E.blush, 0), 0), ease);
    if (preset.pose) {
      if (typeof preset.pose.bend === 'number') tw(ctx, fig, 'bend', ctx.t0, dur, sv(preset.pose.bend, 0.02), ease);
      if (typeof preset.pose.headTilt === 'number') tw(ctx, fig, 'headTilt', ctx.t0, dur, sv(preset.pose.headTilt, 0), ease);
      if (typeof preset.pose.lean === 'number') tw(ctx, fig, 'lean', ctx.t0, dur, sv(preset.pose.lean, 0), ease);
    }
    const prevMood = ctx.rt.ch.getDef(fig.id + '.mood', ctx.t0, 'neutral');
    if (name === 'angry') { st(ctx, fig, 'handL', ctx.t0, 'fist'); st(ctx, fig, 'handR', ctx.t0, 'fist'); }
    else if (prevMood === 'angry') { st(ctx, fig, 'handL', ctx.t0, 'relaxed'); st(ctx, fig, 'handR', ctx.t0, 'relaxed'); }
    st(ctx, fig, 'mood', ctx.t0, name);
    return dur;
  };
  const ctxx_animated = ctx => ctx.args.animated !== false;

  H.blink = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const v0 = cv(ctx, fig, 'eyeOpen');
    tw(ctx, fig, 'eyeOpen', ctx.t0, 0.06, 0.02, EASE.out);
    tw(ctx, fig, 'eyeOpen', ctx.t0 + 0.06, 0.09, v0, EASE.in);
    return 0.15;
  };

  /* ------------------------------ gestures ------------------------------ */
  H.raiseArm = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const dur = durOf(ctx, DUR.fast), ease = easeOf(ctx, EASE.backOut);
    const ang = num(ctx.args.angle, 160);
    for (const s of sidesOf(ctx.args.side || ctx.args.arm, 'R')) {
      tw(ctx, fig, 'sh' + s, ctx.t0, dur, ang, ease);
      tw(ctx, fig, 'el' + s, ctx.t0, dur, 10, ease);
    }
    return dur;
  };
  H.lowerArm = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const dur = durOf(ctx, DUR.fast);
    for (const s of sidesOf(ctx.args.side || ctx.args.arm, 'R')) {
      tw(ctx, fig, 'sh' + s, ctx.t0, dur, 0, EASE.inOut);
      tw(ctx, fig, 'el' + s, ctx.t0, dur, 8, EASE.inOut);
      st(ctx, fig, 'hand' + s, ctx.t0, 'relaxed');
    }
    return dur;
  };
  H.liftLeg = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const dur = durOf(ctx, DUR.fast), ease = easeOf(ctx, EASE.backOut);
    const ang = num(ctx.args.angle, 70);
    for (const s of sidesOf(ctx.args.side || ctx.args.leg, 'R')) {
      tw(ctx, fig, 'hip' + s, ctx.t0, dur, ang, ease);
      tw(ctx, fig, 'knee' + s, ctx.t0, dur, 25, ease);
    }
    return dur;
  };
  H.lowerLeg = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const dur = durOf(ctx, DUR.fast);
    for (const s of sidesOf(ctx.args.side || ctx.args.leg, 'R')) {
      tw(ctx, fig, 'hip' + s, ctx.t0, dur, 0, EASE.inOut);
      tw(ctx, fig, 'knee' + s, ctx.t0, dur, 0, EASE.inOut);
    }
    return dur;
  };

  function lookTweens(ctx, fig, to, dur) {
    const P = STICK.computeFigure(ctx.rt, fig, ctx.t0);
    const head = P.world.head;
    const dxl = (to.x - head.x) * P.fc, dy = to.y - head.y;
    tw(ctx, fig, 'pupX', ctx.t0, dur, clamp(dxl / 18, -1, 1), EASE.inOut);
    tw(ctx, fig, 'pupY', ctx.t0, dur, clamp(dy / 18, -1, 1), EASE.inOut);
    tw(ctx, fig, 'headTilt', ctx.t0, dur, clamp(dy / 55, -0.18, 0.25), EASE.inOut);
  }

  H.lookAt = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const dur = durOf(ctx, DUR.fast);
    if (ctx.args.to == null) {
      tw(ctx, fig, 'pupX', ctx.t0, dur, 0, EASE.inOut);
      tw(ctx, fig, 'pupY', ctx.t0, dur, 0, EASE.inOut);
      return dur;
    }
    const to = STICK.resolvePoint(ctx.rt, ctx.args.to, ctx.t0);
    if (!to) return 0;
    lookTweens(ctx, fig, to, dur);
    return dur;
  };

  H.point = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const to = STICK.resolvePoint(ctx.rt, ctx.args.to, ctx.t0);
    if (!to) { ctx.rt.warn('point: missing "to"'); return 0; }
    const dur = durOf(ctx, DUR.fast), ease = easeOf(ctx, EASE.backOut);
    const P = STICK.computeFigure(ctx.rt, fig, ctx.t0);
    const shW = P.toWorld(P.sh);
    const dxl = (to.x - shW.x) * P.fc, dy = to.y - shW.y;
    const ang = (Math.atan2(dxl, dy) * 180) / Math.PI;
    for (const s of sidesOf(ctx.args.hand || ctx.args.side, 'R')) {
      tw(ctx, fig, 'sh' + s, ctx.t0, dur, ang, ease);
      tw(ctx, fig, 'el' + s, ctx.t0, dur, 2, ease);
      st(ctx, fig, 'hand' + s, ctx.t0, 'point');
    }
    lookTweens(ctx, fig, to, dur);
    return dur;
  };

  /* hands: { "hand": "right", "shape": "fist" } or { "left": "fist", "right": "open" }
     shapes: open | fist | point | spread */
  const HAND_SHAPES = ['open', 'fist', 'point', 'spread', 'relaxed'];
  H.hands = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const a = ctx.args;
    const apply = (side, shape) => {
      if (!HAND_SHAPES.includes(shape)) { ctx.rt.warn(`unknown hand shape "${shape}"`); return; }
      st(ctx, fig, 'hand' + side, ctx.t0, shape);
    };
    if (a.left) apply('L', a.left);
    if (a.right) apply('R', a.right);
    if (a.shape && !a.left && !a.right) {
      const sides = a.hand || a.side ? sidesOf(a.hand || a.side, 'R') : ['L', 'R'];
      for (const s of sides) apply(s, a.shape);
    }
    return 0.02;
  };

  H.reachTo = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const dur = durOf(ctx, DUR.fast);
    const sides = sidesOf(ctx.args.hand || ctx.args.side, 'R');
    if (ctx.args.to == null) {
      for (const s of sides) tw(ctx, fig, 'reach' + s + 'on', ctx.t0, dur, 0, EASE.inOut);
      return dur;
    }
    const to = STICK.resolvePoint(ctx.rt, ctx.args.to, ctx.t0);
    if (!to) return 0;
    const P = STICK.computeFigure(ctx.rt, fig, ctx.t0);
    for (const s of sides) {
      const hand = s === 'L' ? P.world.handL : P.world.handR;
      const on = cv(ctx, fig, 'reach' + s + 'on');
      if (on < 0.01) { st(ctx, fig, 'reach' + s + 'x', ctx.t0, hand.x); st(ctx, fig, 'reach' + s + 'y', ctx.t0, hand.y); }
      tw(ctx, fig, 'reach' + s + 'x', ctx.t0, dur, to.x, EASE.inOut);
      tw(ctx, fig, 'reach' + s + 'y', ctx.t0, dur, to.y, EASE.inOut);
      tw(ctx, fig, 'reach' + s + 'on', ctx.t0, dur, 1, EASE.inOut);
    }
    return dur;
  };

  H.release = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const dur = durOf(ctx, DUR.fast);
    const a = ctx.args;
    if (a.hand) for (const s of sidesOf(a.hand, 'R')) tw(ctx, fig, 'reach' + s + 'on', ctx.t0, dur, 0, EASE.inOut);
    if (a.foot) for (const s of sidesOf(a.foot, 'R')) st(ctx, fig, 'pinF' + s, ctx.t0, null);
    if (!a.hand && !a.foot) {
      for (const s of ['L', 'R']) { tw(ctx, fig, 'reach' + s + 'on', ctx.t0, dur, 0, EASE.inOut); st(ctx, fig, 'pinF' + s, ctx.t0, null); }
    }
    return dur;
  };

  H.pin = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const a = ctx.args;
    const to = a.to != null ? STICK.resolvePoint(ctx.rt, a.to, ctx.t0) : null;
    const P = STICK.computeFigure(ctx.rt, fig, ctx.t0);
    if (a.foot === false) { st(ctx, fig, 'pinFL', ctx.t0, null); st(ctx, fig, 'pinFR', ctx.t0, null); }
    else if (a.foot) {
      const sides = sidesOf(a.foot, 'R');
      for (const s of sides) {
        const cap = s === 'L' ? P.world.footL : P.world.footR;
        let tgt = to ? { ...to } : cap;
        if (to && sides.length === 2) tgt = { x: to.x + (s === 'L' ? -0.8 : 0.8), y: to.y };
        st(ctx, fig, 'pinF' + s, ctx.t0, tgt);
      }
    }
    if (a.hand === false) { st(ctx, fig, 'reachLon', ctx.t0, 0); st(ctx, fig, 'reachRon', ctx.t0, 0); }
    else if (a.hand) {
      for (const s of sidesOf(a.hand, 'R')) {
        const cap = s === 'L' ? P.world.handL : P.world.handR;
        const tgt = to ? { ...to } : cap;
        st(ctx, fig, 'reach' + s + 'x', ctx.t0, tgt.x);
        st(ctx, fig, 'reach' + s + 'y', ctx.t0, tgt.y);
        st(ctx, fig, 'reach' + s + 'on', ctx.t0, 1);
      }
    }
    return 0.02;
  };

  /* ------------------------------ talk & text ------------------------------ */
  H.say = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const text = String(ctx.args.text != null ? ctx.args.text : '...');
    const dur = durOf(ctx, clamp(1 + text.length * 0.045, 1.2, 6));
    ctx.rt.overlays.push({ type: 'say', fig: fig.id, text, t0: ctx.t0, t1: ctx.t0 + dur, args: ctx.args });
    const v0 = cv(ctx, fig, 'mouthOpen');
    const n = clamp(Math.floor(dur / 0.4), 1, 6);
    for (let i = 0; i < n; i++) {
      const ts = ctx.t0 + i * 0.4;
      tw(ctx, fig, 'mouthOpen', ts, 0.13, 0.3, EASE.inOut);
      tw(ctx, fig, 'mouthOpen', ts + 0.13, 0.2, 0.05, EASE.inOut);
    }
    tw(ctx, fig, 'mouthOpen', ctx.t0 + n * 0.4, 0.15, v0, EASE.inOut);
    return dur;
  };

  // confetti / particle burst: many tiny shapes fan out, arc under gravity, and fade.
  const prand = i => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  H.burst = ctx => {
    const a = ctx.args, rt = ctx.rt;
    let at;
    if (ctx.targetId != null && rt.figs.has(String(ctx.targetId))) {
      const P = STICK.computeFigure(rt, rt.figs.get(String(ctx.targetId)), ctx.t0);
      at = { x: P.world.head.x, y: P.world.head.y - P.g.headR * 1.4 };
    } else at = STICK.resolvePoint(rt, a.at != null ? a.at : a.to, ctx.t0) || { x: 50, y: 42 };
    const n = clamp(Math.round(num(a.count, 18)), 3, 60);
    const dur = durOf(ctx, DUR.slow);
    const palette = a.color != null ? [].concat(a.color) : ['#e0533a', '#3a86e0', '#2e9e6b', '#d99a2b', '#9b6ee0', '#e8556f'];
    const spread = num(a.spread, 1);
    for (let i = 0; i < n; i++) {
      const r1 = prand(i * 1.7 + 1), r2 = prand(i * 2.3 + 5), r3 = prand(i * 3.1 + 9);
      const ang = -Math.PI / 2 + (r1 - 0.5) * Math.PI * 1.4 * spread; // fan upward
      const sp = 9 + r2 * 16, sz = 0.5 + r3 * 0.7;
      const id = '_burst' + rt.objs.size + '_' + i;
      const shape = i % 3 === 0 ? 'rect' : 'circle', fill = palette[i % palette.length];
      const props = shape === 'rect' ? { x: -sz, y: -sz * 0.7, w: sz * 2, h: sz * 1.3, fill } : { cx: 0, cy: 0, r: sz, fill };
      const obj = { id, shape, layer: 'front', props, hidden: false, directional: false, baseAngle: 0, opacity: 1, pivot: { x: 0, y: 0 } };
      rt.objs.set(id, obj); STICK.initObjectChannels(rt, obj);
      const ex = at.x + Math.cos(ang) * sp, up = -Math.sin(ang) * sp;
      rt.ch.set(id + '.tx', ctx.t0, at.x); rt.ch.set(id + '.ty', ctx.t0, at.y);
      rt.ch.tween(id + '.tx', ctx.t0, dur, ex, EASE.out);
      rt.ch.tween(id + '.ty', ctx.t0, dur * 0.35, at.y - up, EASE.out);     // rise
      rt.ch.tween(id + '.ty', ctx.t0 + dur * 0.35, dur * 0.65, at.y + 8 + r2 * 9, EASE.in); // fall
      rt.ch.tween(id + '.opacity', ctx.t0 + dur * 0.5, dur * 0.5, 0, EASE.in);
      rt.ch.tween(id + '.rot', ctx.t0, dur, (r1 - 0.5) * 720, EASE.linear);
    }
    return dur;
  };

  H.sfx = ctx => { // play a synthesised sound effect (when the viewer has sound on)
    const name = ctx.args.name != null ? ctx.args.name : ctx.args.sound;
    if (name == null) { ctx.rt.warn('sfx: missing "name"'); return 0; }
    ctx.rt.overlays.push({ type: 'sfx', name: String(name), t0: ctx.t0, t1: ctx.t0 + 0.6 });
    return 0;
  };

  H.think = ctx => { // silent thought bubble (no speech / mouth movement)
    const fig = figOf(ctx); if (!fig) return 0;
    const text = String(ctx.args.text != null ? ctx.args.text : '…');
    const dur = durOf(ctx, clamp(1 + text.length * 0.045, 1.2, 6));
    ctx.rt.overlays.push({ type: 'think', fig: fig.id, text, t0: ctx.t0, t1: ctx.t0 + dur, args: ctx.args });
    return dur;
  };

  const EMOTES = {
    question: '?', '?': '?', exclaim: '!', '!': '!', dots: '…', ellipsis: '…', '...': '…',
    heart: '♥', '♥': '♥', music: '♪', note: '♪', '♪': '♪', sparkle: '✦', star: '✦',
    zzz: 'zzz', sleep: 'zzz', sweat: '💧', idea: '💡',
  };
  H.emote = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const raw = ctx.args.symbol != null ? String(ctx.args.symbol) : '?';
    const symbol = EMOTES[raw] || (raw.length <= 3 ? raw : '?');
    const dur = durOf(ctx, 1.2);
    ctx.rt.overlays.push({ type: 'emote', fig: fig.id, symbol, t0: ctx.t0, t1: ctx.t0 + dur });
    return dur;
  };

  H['scene.caption'] = ctx => {
    const text = String(ctx.args.text != null ? ctx.args.text : '');
    const dur = durOf(ctx, DUR.slow);
    ctx.rt.overlays.push({ type: 'caption', text, t0: ctx.t0, t1: ctx.t0 + dur });
    return dur;
  };
  H.caption = H['scene.caption'];

  /* ------------------------------ camera ------------------------------ */
  H['camera.set'] = ctx => {
    const a = ctx.args;
    const to = a.to != null ? STICK.resolvePoint(ctx.rt, a.to, ctx.t0) : null;
    if (to) { ctx.rt.ch.set('cam.x', ctx.t0, to.x); ctx.rt.ch.set('cam.y', ctx.t0, to.y); }
    if (typeof a.x === 'number') ctx.rt.ch.set('cam.x', ctx.t0, a.x);
    if (typeof a.y === 'number') ctx.rt.ch.set('cam.y', ctx.t0, a.y);
    const z = a.scale != null ? a.scale : a.zoom;
    if (typeof z === 'number') ctx.rt.ch.set('cam.z', ctx.t0, clamp(z, 0.2, 8));
    const tl = a.tilt != null ? a.tilt : a.rot;
    if (typeof tl === 'number') ctx.rt.ch.set('cam.rot', ctx.t0, tl);
    return 0.02;
  };
  H['camera.panTo'] = ctx => {
    const dur = durOf(ctx, DUR.slow);
    const to = STICK.resolvePoint(ctx.rt, ctx.args.to, ctx.t0);
    if (!to) { ctx.rt.warn('camera.panTo: missing "to"'); return 0; }
    ctx.rt.ch.tween('cam.x', ctx.t0, dur, to.x, EASE.inOut);
    ctx.rt.ch.tween('cam.y', ctx.t0, dur, to.y, EASE.inOut);
    return dur;
  };
  H['camera.zoom'] = ctx => {
    const dur = durOf(ctx, DUR.slow);
    const z = num(ctx.args.scale != null ? ctx.args.scale : ctx.args.zoom, 1.5);
    ctx.rt.ch.tween('cam.z', ctx.t0, dur, clamp(z, 0.2, 8), EASE.inOut);
    const to = ctx.args.to != null ? STICK.resolvePoint(ctx.rt, ctx.args.to, ctx.t0) : null;
    if (to) {
      ctx.rt.ch.tween('cam.x', ctx.t0, dur, to.x, EASE.inOut);
      ctx.rt.ch.tween('cam.y', ctx.t0, dur, to.y, EASE.inOut);
    }
    return dur;
  };

  // Compute a {cx,cy,z} framing that fits a target: an explicit rect (a region/
  // "section"), a board, or a figure / figure.face / figure.head (auto-fit to its
  // bounds). Returns null when there's no fittable box (caller uses a point+scale).
  const frameBox = (box, pad) => ({
    cx: box.x + box.w / 2, cy: box.y + box.h / 2,
    z: clamp((100 - 2 * pad) / Math.max(box.w, box.h), 0.2, 8),
  });
  function cameraFrame(rt, a, t) {
    if (a.rect && typeof a.rect === 'object') {
      const r = a.rect;
      const box = { x: num(r.x, 0), y: num(r.y, 0), w: Math.max(1, num(r.w, 1)), h: Math.max(1, num(r.h, 1)) };
      return frameBox(box, num(a.pad, 6));
    }
    const id = a.on != null ? a.on : a.target != null ? a.target : a.to;
    if (id == null || typeof id === 'number') return null;
    const board = rt.boards.get(String(id));
    if (board) { const r = board.rect; return frameBox({ x: r.x, y: r.y, w: r.w, h: r.h }, num(a.pad, 6)); }
    // figures auto-fit to their bounds, unless the author forces an explicit scale
    if (a.scale == null) {
      const b = STICK.figureBounds(rt, id, t);
      if (b) return frameBox(b, num(a.pad, b.tight ? 4 : 8));
    }
    return null;
  }

  // Zoom/pan so a target fills the frame; reset returns to the scene.
  //   on: "boardId" | "figId" (whole figure) | "figId.face" (head close-up)
  //   rect: {x,y,w,h} frames a region; scale: n overrides auto-fit for a point.
  H['camera.focus'] = ctx => {
    const dur = durOf(ctx, DUR.slow);
    const a = ctx.args;
    let cx, cy, z;
    const f = cameraFrame(ctx.rt, a, ctx.t0);
    if (f) { cx = f.cx; cy = f.cy; z = f.z; }
    else {
      const id = a.on != null ? a.on : a.target != null ? a.target : a.to;
      const p = STICK.resolvePoint(ctx.rt, id, ctx.t0);
      if (!p) { ctx.rt.warn('camera.focus: missing/unresolvable "on"'); return 0; }
      cx = p.x; cy = p.y; z = clamp(num(a.scale, 2), 0.2, 8);
    }
    ctx.rt.ch.tween('cam.z', ctx.t0, dur, z, EASE.inOut);
    ctx.rt.ch.tween('cam.x', ctx.t0, dur, cx, EASE.inOut);
    ctx.rt.ch.tween('cam.y', ctx.t0, dur, cy, EASE.inOut);
    if (typeof a.tilt === 'number') ctx.rt.ch.tween('cam.rot', ctx.t0, dur, a.tilt, EASE.inOut);
    return dur;
  };
  // full-frame colour wash for time-of-day / mood. Named presets or color+amount.
  const TINTS = {
    sunset: ['#ff7a3d', 0.32], dawn: ['#ffb27a', 0.24], day: ['#000000', 0],
    night: ['#16223f', 0.46], dusk: ['#3a3560', 0.34], alert: ['#ff2a2a', 0.3],
    dream: ['#9b6ee0', 0.26], cold: ['#5aa0e0', 0.22], warm: ['#ffb44a', 0.2], spooky: ['#163a2a', 0.4],
  };
  H['scene.tint'] = ctx => {
    const a = ctx.args, dur = durOf(ctx, DUR.slow);
    let color = a.color, amount = a.amount;
    const name = a.to || a.name;
    if (name && TINTS[name]) { color = color || TINTS[name][0]; if (amount == null) amount = TINTS[name][1]; }
    if (color != null) ctx.rt.ch.set('tint.color', ctx.t0, String(color));
    ctx.rt.ch.tween('tint.a', ctx.t0, dur, clamp(num(amount, 0.3), 0, 1), EASE.inOut);
    return dur;
  };
  H['scene.untint'] = ctx => { const dur = durOf(ctx, DUR.slow); ctx.rt.ch.tween('tint.a', ctx.t0, dur, 0, EASE.inOut); return dur; };

  // Arrow / connector between two anchors (a single path: shaft + arrowhead).
  // Endpoints are resolved once, at creation time. Becomes an object you can recolour/hide.
  function arrowD(a, b, hs, twoWay) {
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const head = (p, dir) => {
      const h1x = p.x - dir * hs * Math.cos(ang - 0.42), h1y = p.y - dir * hs * Math.sin(ang - 0.42);
      const h2x = p.x - dir * hs * Math.cos(ang + 0.42), h2y = p.y - dir * hs * Math.sin(ang + 0.42);
      return ` M ${p.x.toFixed(2)} ${p.y.toFixed(2)} L ${h1x.toFixed(2)} ${h1y.toFixed(2)} M ${p.x.toFixed(2)} ${p.y.toFixed(2)} L ${h2x.toFixed(2)} ${h2y.toFixed(2)}`;
    };
    let d = `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} L ${b.x.toFixed(2)} ${b.y.toFixed(2)}` + head(b, 1);
    if (twoWay) d += head(a, -1);
    return d;
  }
  H.arrow = H.connect = ctx => {
    const a = ctx.args, rt = ctx.rt;
    const from = STICK.resolvePoint(rt, a.from, ctx.t0), to = STICK.resolvePoint(rt, a.to, ctx.t0);
    if (!from || !to) { rt.warn('arrow: needs "from" and "to"'); return 0; }
    let id = a.id || ('arrow' + rt.objs.size);
    if (rt.objs.has(id) || rt.figs.has(id)) { let i = 2; while (rt.objs.has(id + i) || rt.figs.has(id + i)) i++; id += i; }
    const obj = {
      id, shape: 'path', layer: a.layer || 'mid', hidden: false, directional: false, baseAngle: 0, opacity: 1,
      props: { d: arrowD(from, to, num(a.head, 2.2), !!a.twoWay), stroke: a.color || '#2a2a35', strokeWidth: num(a.width, 0.4), fill: 'none' },
      pivot: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 },
    };
    rt.objs.set(id, obj);
    STICK.initObjectChannels(rt, obj);
    const dur = durOf(ctx, 0.02);
    if (dur > 0.05) { rt.ch.set(id + '.opacity', ctx.t0, 0); rt.ch.tween(id + '.opacity', ctx.t0, dur, 1, EASE.inOut); }
    return dur > 0.05 ? dur : 0;
  };

  H['camera.reset'] = ctx => {
    const dur = durOf(ctx, DUR.slow);
    ctx.rt.ch.tween('cam.z', ctx.t0, dur, 1, EASE.inOut);
    ctx.rt.ch.tween('cam.x', ctx.t0, dur, 50, EASE.inOut);
    ctx.rt.ch.tween('cam.y', ctx.t0, dur, 50, EASE.inOut);
    ctx.rt.ch.tween('cam.rot', ctx.t0, dur, 0, EASE.inOut);
    ctx.rt.ch.set('cam.shake', ctx.t0, 0);
    return dur;
  };

  // tilt (Dutch angle), shake, instant cut to a framing, and follow a figure.
  H['camera.tilt'] = ctx => {
    const dur = durOf(ctx, DUR.slow);
    const cur = ctx.rt.ch.get('cam.rot', ctx.t0);
    const to = typeof ctx.args.by === 'number' ? cur + ctx.args.by : num(ctx.args.to, num(ctx.args.deg, 0));
    ctx.rt.ch.tween('cam.rot', ctx.t0, dur, to, EASE.inOut);
    return dur;
  };
  H['camera.shake'] = ctx => {
    const dur = durOf(ctx, 0.6);
    ctx.rt.ch.set('cam.shake', ctx.t0, num(ctx.args.amount, num(ctx.args.amp, 1.5)));
    ctx.rt.ch.tween('cam.shake', ctx.t0, dur, 0, EASE.out);
    return dur;
  };
  H['camera.cut'] = ctx => {
    const a = ctx.args, set = (s, v) => ctx.rt.ch.set(s, ctx.t0, v);
    const f = cameraFrame(ctx.rt, a, ctx.t0); // board / figure / figure.face / rect
    if (f) {
      set('cam.x', f.cx); set('cam.y', f.cy); set('cam.z', f.z);
    } else {
      const id = a.on != null ? a.on : a.to;
      if (id != null && typeof id !== 'number') {
        const p = STICK.resolvePoint(ctx.rt, id, ctx.t0);
        if (p) { set('cam.x', p.x); set('cam.y', p.y); }
        if (a.scale != null) set('cam.z', clamp(num(a.scale, 1), 0.2, 8));
      } else {
        if (typeof a.x === 'number') set('cam.x', a.x);
        if (typeof a.y === 'number') set('cam.y', a.y);
        if (a.scale != null) set('cam.z', clamp(num(a.scale, 1), 0.2, 8));
      }
    }
    if (typeof a.tilt === 'number') set('cam.rot', a.tilt);
    return 0.02;
  };
  H['camera.follow'] = ctx => {
    const a = ctx.args;
    const id = a.target != null ? a.target : a.on != null ? a.on : a.of;
    const fig = id != null ? ctx.rt.figs.get(String(id)) : null;
    if (!fig) { ctx.rt.warn('camera.follow: needs a figure "target"'); return 0; }
    const dur = durOf(ctx, DUR.slow), offset = num(a.offset, 0);
    const steps = Math.max(4, Math.min(60, Math.round(dur / 0.2))), seg = dur / steps;
    const followY = !!a.y;
    for (let k = 1; k <= steps; k++) {
      const tk = ctx.t0 + seg * k;
      ctx.rt.ch.tween('cam.x', ctx.t0 + seg * (k - 1), seg, ctx.rt.ch.get(fig.id + '.x', tk) + offset, EASE.linear);
      if (followY) ctx.rt.ch.tween('cam.y', ctx.t0 + seg * (k - 1), seg, ctx.rt.ch.get(fig.id + '.y', tk), EASE.linear);
    }
    return dur;
  };

  // swap the backdrop (new scenery) — fade for a soft transition, cut for instant.
  function backdropDef(a) {
    return (a.to && typeof a.to === 'object') ? a.to
      : { theme: a.theme || (typeof a.to === 'string' ? a.to : undefined), bg: a.bg, elements: a.elements, items: a.items, floor: a.floor, floorY: a.floorY, parallax: a.parallax, style: a.style };
  }
  H['scene.fade'] = ctx => {
    const dur = durOf(ctx, DUR.slow);
    ctx.rt.backdrops.push({ t0: ctx.t0, fade: dur, scene: STICK.buildScene(backdropDef(ctx.args), ctx.rt.warn) });
    return dur;
  };
  H['scene.cut'] = ctx => {
    ctx.rt.backdrops.push({ t0: ctx.t0, fade: 0, scene: STICK.buildScene(backdropDef(ctx.args), ctx.rt.warn) });
    return durOf(ctx, 0.02);
  };
  H['scene.to'] = H['scene.fade'];

  /* ------------------------------ structure ------------------------------ */
  H.wait = ctx => durOf(ctx, DUR.normal);
  H.pause = H.wait;
  H.hold = H.wait;

  H.playClip = ctx => {
    const rt = ctx.rt;
    if ((ctx.depth || 0) > 4) { rt.warn('clips nested too deep'); return 0; }
    const name = ctx.args.name || ctx.args.clip || ctx.ev.clip;
    const userClips = (rt.doc && rt.doc.clips) || {};
    const clip = userClips[name] || STICK.presets.clips[name];
    if (!Array.isArray(clip)) { rt.warn(`unknown clip "${name}"`); return 0; }
    const repeat = clamp(Math.round(num(ctx.args.repeat, 1)), 1, 30);
    let tCur = ctx.t0;
    for (let r = 0; r < repeat; r++) {
      const local = { start: tCur, end: tCur, origin: tCur };
      for (const sub of clip) STICK.expandEvent(rt, sub, local, ctx.targetId, (ctx.depth || 0) + 1);
      tCur = Math.max(tCur + 0.02, local.end);
    }
    return tCur - ctx.t0;
  };

  /* ------------------------------ objects ------------------------------
     Simple props (balls, boxes, signs…) animated via the same channel engine.
     All target an object id; they share one internal tween over its channels. */
  function objOf(ctx) {
    const rt = ctx.rt;
    if (ctx.targetId != null) {
      const o = rt.objs.get(String(ctx.targetId));
      if (o) return o;
      rt.warn(`unknown object target "${ctx.targetId}" for cmd "${ctx.ev.cmd}"`);
      return null;
    }
    if (rt.objs.size === 1) return rt.objs.values().next().value;
    rt.warn(`cmd "${ctx.ev.cmd}" needs an object target`);
    return null;
  }

  H.appear = ctx => {
    const o = objOf(ctx); if (!o) return 0;
    const dur = durOf(ctx, DUR.fast);
    tw(ctx, o, 'opacity', ctx.t0, dur, 1, EASE.out);
    return dur;
  };
  H.disappear = ctx => {
    const o = objOf(ctx); if (!o) return 0;
    const dur = durOf(ctx, DUR.fast);
    tw(ctx, o, 'opacity', ctx.t0, dur, 0, EASE.in);
    return dur;
  };
  H.fade = ctx => {
    const o = objOf(ctx); if (!o) return 0;
    const dur = durOf(ctx, DUR.fast);
    tw(ctx, o, 'opacity', ctx.t0, dur, clamp(num(ctx.args.to, num(ctx.args.opacity, 1)), 0, 1), EASE.inOut);
    return dur;
  };

  H.moveTo = ctx => {
    const o = objOf(ctx); if (!o) return 0;
    const dur = durOf(ctx, DUR.normal), ease = easeOf(ctx, EASE.inOut);
    const to = STICK.resolvePoint(ctx.rt, ctx.args.to, ctx.t0);
    if (!to) { ctx.rt.warn('moveTo: missing/unresolvable "to"'); return 0; }
    const via = Array.isArray(ctx.args.via) ? ctx.args.via.map(p => STICK.resolvePoint(ctx.rt, p, ctx.t0)).filter(Boolean) : [];
    const cx = o.pivot.x + ctx.rt.ch.get(o.id + '.tx', ctx.t0), cy = o.pivot.y + ctx.rt.ch.get(o.id + '.ty', ctx.t0);
    const pts = [{ x: cx, y: cy }, ...via, to];
    const segLen = []; let total = 0;
    for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); segLen.push(L); total += L; }
    if (total < 0.01) return dur;
    let tAcc = ctx.t0;
    for (let i = 1; i < pts.length; i++) {
      const segDur = dur * (segLen[i - 1] / total), segEase = pts.length === 2 ? ease : EASE.linear;
      tw(ctx, o, 'tx', tAcc, segDur, pts[i].x - o.pivot.x, segEase);
      tw(ctx, o, 'ty', tAcc, segDur, pts[i].y - o.pivot.y, segEase);
      tAcc += segDur;
    }
    return dur;
  };

  H.scale = ctx => {
    const o = objOf(ctx); if (!o) return 0;
    const dur = durOf(ctx, DUR.fast), ease = easeOf(ctx, EASE.inOut);
    tw(ctx, o, 'scale', ctx.t0, dur, clamp(num(ctx.args.to, num(ctx.args.scale, 1)), 0.01, 50), ease);
    return dur;
  };
  H.grow = ctx => {
    const o = objOf(ctx); if (!o) return 0;
    const dur = durOf(ctx, DUR.fast), ease = easeOf(ctx, EASE.inOut);
    const cur = cv(ctx, o, 'scale') || 1;
    tw(ctx, o, 'scale', ctx.t0, dur, clamp(cur * num(ctx.args.by, num(ctx.args.factor, 1.5)), 0.01, 50), ease);
    return dur;
  };
  H.shrink = ctx => {
    const o = objOf(ctx); if (!o) return 0;
    const dur = durOf(ctx, DUR.fast), ease = easeOf(ctx, EASE.inOut);
    const cur = cv(ctx, o, 'scale') || 1;
    tw(ctx, o, 'scale', ctx.t0, dur, clamp(cur / num(ctx.args.by, num(ctx.args.factor, 1.5)), 0.01, 50), ease);
    return dur;
  };

  H.rotate = ctx => {
    const o = objOf(ctx); if (!o) return 0;
    const dur = durOf(ctx, DUR.fast), ease = easeOf(ctx, EASE.inOut);
    const cur = cv(ctx, o, 'rot') || 0;
    const to = typeof ctx.args.by === 'number' ? cur + ctx.args.by : num(ctx.args.to, num(ctx.args.deg, cur + 90));
    tw(ctx, o, 'rot', ctx.t0, dur, to, ease);
    return dur;
  };
  H.spin = ctx => {
    const o = objOf(ctx); if (!o) return 0;
    const dur = durOf(ctx, DUR.normal);
    const cur = cv(ctx, o, 'rot') || 0;
    const dir = ctx.args.dir === 'ccw' || ctx.args.dir === -1 ? -1 : 1;
    tw(ctx, o, 'rot', ctx.t0, dur, cur + dir * 360 * num(ctx.args.turns, 1), EASE.linear);
    return dur;
  };

  H.color = ctx => {
    const o = objOf(ctx); if (!o) return 0;
    const to = ctx.args.to != null ? ctx.args.to : ctx.args.fill;
    if (to == null) { ctx.rt.warn('color: missing "to"'); return 0; }
    st(ctx, o, 'fill', ctx.t0, String(to)); // instant
    return 0.02;
  };
  H.recolor = H.color;

  // arc: a believable toss — tx eases across while ty rises to an apex and falls.
  H.arc = ctx => {
    const o = objOf(ctx); if (!o) return 0;
    const dur = durOf(ctx, DUR.quick);
    const to = STICK.resolvePoint(ctx.rt, ctx.args.to, ctx.t0);
    if (!to) { ctx.rt.warn('arc: missing/unresolvable "to"'); return 0; }
    const height = num(ctx.args.height, 15);
    const tx0 = cv(ctx, o, 'tx'), ty0 = cv(ctx, o, 'ty');
    const x0 = o.pivot.x + tx0, y0 = o.pivot.y + ty0;
    tw(ctx, o, 'tx', ctx.t0, dur, to.x - o.pivot.x, EASE.linear);
    const apexY = Math.min(y0, to.y) - Math.max(0, height);
    tw(ctx, o, 'ty', ctx.t0, dur / 2, apexY - o.pivot.y, EASE.out);
    tw(ctx, o, 'ty', ctx.t0 + dur / 2, dur / 2, to.y - o.pivot.y, EASE.in);
    if (ctx.args.spin != null) {
      const cur = cv(ctx, o, 'rot') || 0;
      const dir = ctx.args.dir === 'ccw' || ctx.args.dir === -1 ? -1 : (to.x >= x0 ? 1 : -1);
      tw(ctx, o, 'rot', ctx.t0, dur, cur + dir * 360 * num(ctx.args.spin, 1), EASE.linear);
    }
    return dur;
  };

  /* ------------------------------ boards ------------------------------
     Write markdown to a panel; the board module lays it out and reveals it with
     a handwriting wipe at render time. compile only records the blocks (+ an
     approximate hand animation when a figure is named via `by`). */
  function boardOf(ctx) {
    const rt = ctx.rt;
    if (ctx.targetId != null) {
      const b = rt.boards.get(String(ctx.targetId));
      if (b) return b;
      rt.warn(`unknown board target "${ctx.targetId}" for cmd "${ctx.ev.cmd}"`);
      return null;
    }
    if (rt.boards.size === 1) return rt.boards.values().next().value;
    rt.warn(`cmd "${ctx.ev.cmd}" needs a board target`);
    return null;
  }

  // The chalk hand (board.js) does the precise writing; here we just give the
  // figure a "writing posture" — face the board and aim its arm at the board edge
  // nearest it, drifting down a little as the block proceeds. IK clamps the reach.
  function writeHandSync(ctx, fig, board, t0, dur) {
    const rt = ctx.rt, r = board.rect, pad = board.pad;
    // front-facing writer: keep facing us and gesticulate (the chalk hand writes)
    if (Math.abs(rt.ch.get(fig.id + '.facing', t0)) < 0.5) {
      const steps = Math.max(2, Math.min(8, Math.round(dur / 0.7))), seg = dur / steps;
      for (let k = 0; k <= steps; k++) {
        const tk = t0 + seg * k, even = k % 2 === 0;
        tw(ctx, fig, 'shR', tk, seg, even ? 44 : 18, EASE.inOut);
        tw(ctx, fig, 'shL', tk, seg, even ? 16 : 42, EASE.inOut);
        tw(ctx, fig, 'elR', tk, seg, 38, EASE.inOut);
        tw(ctx, fig, 'elL', tk, seg, 38, EASE.inOut);
      }
      for (const j of ['shR', 'shL', 'elR', 'elL']) tw(ctx, fig, j, t0 + dur, 0.4, 8, EASE.inOut);
      return;
    }
    if (Math.abs(rt.ch.get(fig.id + '.facing', t0)) > 1.5) {
      // back to us (writing on the board): raise the writing arm and bob a little
      st(ctx, fig, 'reachRon', t0, 0);
      tw(ctx, fig, 'shR', t0, 0.4, 70, EASE.inOut);
      const steps = Math.max(2, Math.min(8, Math.round(dur / 0.6))), seg = dur / steps;
      for (let k = 0; k <= steps; k++) tw(ctx, fig, 'elR', t0 + seg * k, seg, 22 + (k % 2 ? 16 : 0), EASE.inOut);
      tw(ctx, fig, 'shR', t0 + dur, 0.4, 8, EASE.inOut);
      tw(ctx, fig, 'elR', t0 + dur, 0.4, 8, EASE.inOut);
      return;
    }
    const figX = rt.ch.get(fig.id + '.x', t0);
    const fromRight = figX > r.x + r.w / 2;
    st(ctx, fig, 'facing', t0, fromRight ? -1 : 1);
    const tx = fromRight ? r.x + r.w - pad : r.x + pad;
    const yTop = r.y + pad + 4, yBot = Math.min(r.y + r.h - pad, r.y + pad + Math.max(10, dur * 3));
    const steps = Math.max(2, Math.min(8, Math.round(dur / 0.8)));
    const seg = dur / steps;
    const P = STICK.computeFigure(rt, fig, t0);
    st(ctx, fig, 'reachRx', t0, P.world.handR.x);
    st(ctx, fig, 'reachRy', t0, P.world.handR.y);
    for (let k = 0; k <= steps; k++) {
      const tk = t0 + seg * k;
      tw(ctx, fig, 'reachRx', tk, seg, tx + (k % 2 ? -1.5 : 1.5), EASE.inOut);
      tw(ctx, fig, 'reachRy', tk, seg, yTop + (yBot - yTop) * (k / steps), EASE.inOut);
      tw(ctx, fig, 'reachRon', tk, Math.min(0.25, seg), 1, EASE.inOut);
    }
    tw(ctx, fig, 'reachRon', t0 + dur, 0.3, 0, EASE.inOut);
  }

  H['board.write'] = ctx => {
    const board = boardOf(ctx); if (!board) return 0;
    const md = String(ctx.args.md != null ? ctx.args.md : ctx.args.text != null ? ctx.args.text : '');
    if (!md) { ctx.rt.warn('board.write: missing "md"'); return 0; }
    const chars = md.replace(/\s+/g, ' ').trim().length;
    const dur = durOf(ctx, clamp(chars / 8, 1.5, 30)); // ~hand-writing pace (was a bit rushed)
    board.blocks.push({ kind: 'write', t0: ctx.t0, dur, md });
    const by = ctx.ev.by != null ? ctx.ev.by : ctx.args.by;
    if (by != null) {
      board._hand = true;
      const fig = ctx.rt.figs.get(String(by));
      if (fig) writeHandSync(ctx, fig, board, ctx.t0, dur);
      else ctx.rt.warn(`board.write by "${by}": no such figure`);
    }
    return dur;
  };
  H['board.draw'] = ctx => {
    const board = boardOf(ctx); if (!board) return 0;
    const a = ctx.args;
    let shapes = [];
    if (Array.isArray(a.shapes)) shapes = a.shapes;
    else if (a.chart === 'supply-demand' || a.chart === 'supply/demand' || a.chart === 'sd') {
      shapes = [
        { t: 'axes', id: 'axes', xlabel: a.xlabel || 'Quantity', ylabel: a.ylabel || 'Price' },
        { t: 'curve', id: 'demand', from: [0.08, 0.85], to: [0.9, 0.12], label: a.demandLabel || 'D', color: a.demandColor },
        { t: 'curve', id: 'supply', from: [0.08, 0.12], to: [0.9, 0.85], label: a.supplyLabel || 'S', color: a.supplyColor },
        { t: 'dot', id: 'equilibrium', at: [0.49, 0.49], label: a.eqLabel != null ? a.eqLabel : 'E' },
      ];
    } else if (a.axes) {
      shapes = [{ t: 'axes', xlabel: a.xlabel, ylabel: a.ylabel }];
    } else if (a.t || a.from || a.dot || a.line || a.curve) {
      shapes = [a];
    }
    if (!shapes.length) { ctx.rt.warn('board.draw: nothing to draw (use "chart" or "shapes")'); return 0; }
    const dur = durOf(ctx, clamp(shapes.length * 1.15, 1.6, 30)); // a touch slower to read as drawing
    board.blocks.push({ kind: 'draw', t0: ctx.t0, dur, shapes, size: num(a.size, 0) });
    const by = ctx.ev.by != null ? ctx.ev.by : a.by;
    if (by != null) {
      board._hand = true;
      const fig = ctx.rt.figs.get(String(by));
      if (fig) writeHandSync(ctx, fig, board, ctx.t0, dur);
      else ctx.rt.warn(`board.draw by "${by}": no such figure`);
    }
    return dur;
  };
  // Circle/box an element or word while the speaker talks about it. Reveals fast,
  // holds for `dur` (or until unhighlight/clear if hold), then disappears.
  H['board.highlight'] = ctx => {
    const board = boardOf(ctx); if (!board) return 0;
    const a = ctx.args;
    const target = a.target != null ? a.target : a.on != null ? a.on : a.word != null ? a.word : a.id;
    if (target == null) { ctx.rt.warn('board.highlight: missing "target"'); return 0; }
    const drawDur = 0.6;
    const stay = a.hold ? null : durOf(ctx, 3);
    board.blocks.push({ kind: 'highlight', t0: ctx.t0, drawDur, stay, dur: drawDur + (stay == null ? 2 : stay), target: String(target), color: a.color, style: a.style || 'ring' });
    const by = ctx.ev.by != null ? ctx.ev.by : a.by;
    if (by != null) { board._hand = true; const fig = ctx.rt.figs.get(String(by)); if (fig) writeHandSync(ctx, fig, board, ctx.t0, Math.min(drawDur + 0.4, 1.2)); }
    return drawDur;
  };
  H['board.unhighlight'] = ctx => {
    const board = boardOf(ctx); if (!board) return 0;
    board.blocks.push({ kind: 'unhighlight', t0: ctx.t0 });
    return durOf(ctx, 0.02);
  };
  H['board.clear'] = ctx => {
    const board = boardOf(ctx); if (!board) return 0;
    board.blocks.push({ kind: 'clear', t0: ctx.t0 });
    return durOf(ctx, 0.02);
  };
  H['board.erase'] = ctx => {
    const board = boardOf(ctx); if (!board) return 0;
    board.blocks.push({ kind: 'erase', t0: ctx.t0, n: Math.max(1, Math.round(num(ctx.args.lines, 1))) });
    return durOf(ctx, 0.3);
  };

  /* ------------------------------ held props ------------------------------ */
  const handOf = v => (v === 'left' ? 'L' : v === 'right' ? 'R' : v === 'both' ? 'B' : null);
  const handsOf = h => (h === 'B' ? ['L', 'R'] : [h]); // a grip's underlying hand(s)
  // the open grip (t1 = ∞) on a figure's hand (any hand if `hand` is null)
  function openGripHand(rt, figId, hand, t) {
    let g = null;
    for (const gr of rt.grips) if (gr.fig === figId && gr.hand === hand && t >= gr.t0 && gr.t1 === Infinity) g = gr;
    return g;
  }
  // hand specified -> that hand; unspecified -> prefer right, then left, then two-handed.
  function openGrip(rt, figId, hand, t) {
    if (hand != null) return openGripHand(rt, figId, hand, t);
    return openGripHand(rt, figId, 'R', t) || openGripHand(rt, figId, 'L', t) || openGripHand(rt, figId, 'B', t);
  }
  const HOLD_SH = 35, HOLD_EL = 110; // default "holding" arm pose
  function holdPose(ctx, figId, hand, t, dur) {
    for (const h of handsOf(hand)) {
      ctx.rt.ch.tween(figId + '.sh' + h, t, dur, HOLD_SH, EASE.inOut);
      ctx.rt.ch.tween(figId + '.el' + h, t, dur, HOLD_EL, EASE.inOut);
    }
  }
  const handPoint = (P, hand) => hand === 'L' ? P.world.handL : hand === 'B'
    ? { x: (P.world.handL.x + P.world.handR.x) / 2, y: (P.world.handL.y + P.world.handR.y) / 2 } : P.world.handR;
  function handWorldAt(rt, fig, hand, t) {
    const P = STICK.computeFigure(rt, fig, t);
    return { P, w: handPoint(P, hand) };
  }

  H.give = H.hold = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const a = ctx.args;
    const hand = handOf(a.hand) || 'R';
    const ref = a.prop != null ? a.prop : a.object;
    if (ref == null) { ctx.rt.warn('give: missing "prop"'); return 0; }
    const popts = { figId: fig.id, scale: a.scale, color: a.color, id: a.id };
    let obj;
    if (typeof ref === 'object') obj = STICK.makePropDef(ctx.rt, ref, popts);          // inline custom prop
    else obj = ctx.rt.objs.get(String(ref)) || STICK.makeProp(ctx.rt, String(ref), popts); // existing id or library
    if (!obj) return 0;
    const dur = durOf(ctx, DUR.quick);
    ctx.rt.grips.push({ obj: obj.id, fig: fig.id, hand, t0: ctx.t0, t1: Infinity, follow: a.follow != null ? !!a.follow : null });
    if (typeof a.angle === 'number') obj.baseAngle = a.angle - 0, obj.directional = true; // pin a fixed aim
    if (a.pose !== false) holdPose(ctx, fig.id, hand, ctx.t0, dur);
    return dur;
  };

  H.drop = H.putDown = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const a = ctx.args, hand = handOf(a.hand);
    const grip = openGrip(ctx.rt, fig.id, hand, ctx.t0);
    if (!grip) { ctx.rt.warn('drop: nothing held'); return 0; }
    grip.t1 = ctx.t0;
    const obj = ctx.rt.objs.get(grip.obj), px = obj.pivot.x, py = obj.pivot.y;
    const { P, w } = handWorldAt(ctx.rt, fig, grip.hand, ctx.t0);
    const dur = durOf(ctx, DUR.quick);
    ctx.rt.ch.set(grip.obj + '.tx', ctx.t0, w.x - px);
    ctx.rt.ch.set(grip.obj + '.ty', ctx.t0, w.y - py);
    if (obj.directional && grip.hand !== 'B') ctx.rt.ch.set(grip.obj + '.rot', ctx.t0, STICK.propAngle(P, grip.hand, obj.baseAngle || 0));
    const to = a.to != null ? (a.to === 'ground' ? { x: w.x, y: 70 } : STICK.resolvePoint(ctx.rt, a.to, ctx.t0)) : null;
    if (to) {
      if (typeof to.x === 'number') ctx.rt.ch.tween(grip.obj + '.tx', ctx.t0, dur, to.x - px, EASE.inOut);
      if (typeof to.y === 'number') ctx.rt.ch.tween(grip.obj + '.ty', ctx.t0, dur, to.y - py, EASE.out);
    }
    for (const h of handsOf(grip.hand)) {
      ctx.rt.ch.tween(fig.id + '.sh' + h, ctx.t0, dur, 8, EASE.inOut);
      ctx.rt.ch.tween(fig.id + '.el' + h, ctx.t0, dur, 8, EASE.inOut);
    }
    return dur;
  };

  H.throw = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const a = ctx.args, hand = handOf(a.hand);
    const grip = openGrip(ctx.rt, fig.id, hand, ctx.t0);
    if (!grip) { ctx.rt.warn('throw: nothing held'); return 0; }
    const to = STICK.resolvePoint(ctx.rt, a.to, ctx.t0);
    if (!to) { ctx.rt.warn('throw: missing "to"'); return 0; }
    grip.t1 = ctx.t0;
    const dur = durOf(ctx, DUR.normal);
    const obj = ctx.rt.objs.get(grip.obj), px = obj.pivot.x, py = obj.pivot.y;
    const { w } = handWorldAt(ctx.rt, fig, grip.hand, ctx.t0);
    const x0 = w.x - px, y0 = w.y - py, x1 = to.x - px, y1 = to.y - py;
    const height = num(a.height, Math.max(7, Math.abs(x1 - x0) * 0.4)); // arc apex above the chord
    ctx.rt.ch.set(grip.obj + '.tx', ctx.t0, x0);
    ctx.rt.ch.set(grip.obj + '.ty', ctx.t0, y0);
    const N = 10;
    for (let k = 1; k <= N; k++) {
      const u = k / N;
      const xk = x0 + (x1 - x0) * u, yk = y0 + (y1 - y0) * u - 4 * height * u * (1 - u);
      ctx.rt.ch.tween(grip.obj + '.tx', ctx.t0 + dur * (k - 1) / N, dur / N, xk, EASE.linear);
      ctx.rt.ch.tween(grip.obj + '.ty', ctx.t0 + dur * (k - 1) / N, dur / N, yk, EASE.linear);
    }
    const spin = num(a.spin, 2);
    ctx.rt.ch.set(grip.obj + '.rot', ctx.t0, 0);
    ctx.rt.ch.tween(grip.obj + '.rot', ctx.t0, dur, 360 * spin * (x1 >= x0 ? 1 : -1), EASE.linear);
    // throwing arm: snap overhead, then follow through down
    tw(ctx, fig, 'sh' + grip.hand, ctx.t0, dur * 0.3, 150, EASE.out);
    tw(ctx, fig, 'el' + grip.hand, ctx.t0, dur * 0.3, 12, EASE.out);
    tw(ctx, fig, 'sh' + grip.hand, ctx.t0 + dur * 0.3, dur * 0.5, 18, EASE.inOut);
    return dur;
  };

  H.pickUp = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const a = ctx.args, hand = handOf(a.hand) || 'R';
    const ref = a.object != null ? a.object : a.prop;
    const obj = (ref != null && typeof ref !== 'object') ? ctx.rt.objs.get(String(ref)) : null;
    const to = obj
      ? { x: ctx.rt.ch.get(obj.id + '.tx', ctx.t0) + obj.pivot.x, y: ctx.rt.ch.get(obj.id + '.ty', ctx.t0) + obj.pivot.y }
      : STICK.resolvePoint(ctx.rt, ref, ctx.t0);
    if (!obj || !to) { ctx.rt.warn('pickUp: needs an existing object id on stage'); return 0; }
    const reach = durOf(ctx, DUR.quick);
    const { w } = handWorldAt(ctx.rt, fig, hand, ctx.t0);
    if (cv(ctx, fig, 'reach' + hand + 'on') < 0.01) { st(ctx, fig, 'reach' + hand + 'x', ctx.t0, w.x); st(ctx, fig, 'reach' + hand + 'y', ctx.t0, w.y); }
    tw(ctx, fig, 'reach' + hand + 'x', ctx.t0, reach, to.x, EASE.inOut);
    tw(ctx, fig, 'reach' + hand + 'y', ctx.t0, reach, to.y, EASE.inOut);
    tw(ctx, fig, 'reach' + hand + 'on', ctx.t0, reach, 1, EASE.inOut);
    const tGrab = ctx.t0 + reach;
    ctx.rt.grips.push({ obj: obj.id, fig: fig.id, hand, t0: tGrab, t1: Infinity, follow: null });
    tw(ctx, fig, 'reach' + hand + 'on', tGrab, DUR.quick, 0, EASE.inOut);
    holdPose(ctx, fig.id, hand, tGrab, DUR.quick);
    return reach + DUR.quick;
  };

  H.handOff = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const a = ctx.args, hand = handOf(a.hand);
    const grip = openGrip(ctx.rt, fig.id, hand, ctx.t0);
    if (!grip) { ctx.rt.warn('handOff: nothing held'); return 0; }
    const toFig = ctx.rt.figs.get(String(a.to));
    if (!toFig) { ctx.rt.warn('handOff: unknown "to" figure'); return 0; }
    const toHand = handOf(a.toHand) || 'L';
    const dur = durOf(ctx, DUR.quick), tHand = ctx.t0 + dur;
    grip.t1 = tHand;
    ctx.rt.grips.push({ obj: grip.obj, fig: toFig.id, hand: toHand, t0: tHand, t1: Infinity, follow: grip.follow });
    holdPose(ctx, toFig.id, toHand, ctx.t0, dur); // receiver reaches into the hold
    ctx.rt.ch.tween(fig.id + '.sh' + grip.hand, tHand, DUR.quick, 8, EASE.inOut); // giver relaxes
    ctx.rt.ch.tween(fig.id + '.el' + grip.hand, tHand, DUR.quick, 8, EASE.inOut);
    return dur + DUR.quick;
  };

  STICK.commands = H;

  STICK.expandEvent = function (rt, ev, cur, inheritTarget, depth) {
    if (!ev || typeof ev !== 'object') { rt.warn('skipped non-object timeline entry'); return; }
    const cmdName = ev.cmd || (ev.clip ? 'playClip' : null);
    const t0 = resolveAt(ev.at, cur, rt);
    const handler = H[cmdName];
    if (!handler) {
      rt.warn(`unknown cmd ${JSON.stringify(ev.cmd)} — skipped`);
      cur.start = t0; cur.end = Math.max(cur.end, t0);
      return;
    }
    const rawTarget = ev.target !== undefined ? ev.target : inheritTarget;
    const targets = Array.isArray(rawTarget) ? (rawTarget.length ? rawTarget : [null]) : [rawTarget];
    let len = 0;
    for (const tg of targets) {
      const ctx = { rt, ev, t0, args: ev.args || {}, targetId: tg != null ? tg : null, depth: depth || 0 };
      try { len = Math.max(len, handler(ctx) || 0); }
      catch (e) { rt.warn(`error in cmd "${cmdName}": ${e.message}`); }
    }
    cur.start = t0;
    cur.end = t0 + len;
  };
})();
