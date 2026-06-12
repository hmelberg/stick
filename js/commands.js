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
    const dist = Math.hypot(to.x - x0, to.y - y0);
    const dur = ctx.ev.dur != null || ctx.args.dur != null
      ? durOf(ctx, 1)
      : clamp(dist / SPEED[style], 0.35, 6);
    const dx = to.x - x0;
    if (a.face !== false && a.autoFace !== false && Math.abs(dx) > 0.5) {
      // moonwalkers face away from where they're going — that's the joke
      st(ctx, fig, 'facing', ctx.t0, (dx > 0 ? 1 : -1) * (style === 'moonwalk' ? -1 : 1));
    }
    const ease = style === 'slide' ? EASE.out : EASE.sine;
    tw(ctx, fig, 'x', ctx.t0, dur, to.x, ease);
    tw(ctx, fig, 'y', ctx.t0, dur, to.y, ease);
    if (dist > 0.5 && style !== 'slide') rt.loco.push({ fig: fig.id, t0: ctx.t0, t1: ctx.t0 + dur, style, x0, y0 });
    if (style === 'slide') rt.loco.push({ fig: fig.id, t0: ctx.t0, t1: ctx.t0 + dur, style, x0, y0 });
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

  H.facing = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const d = ctx.args.dir != null ? ctx.args.dir : ctx.args.to;
    st(ctx, fig, 'facing', ctx.t0, d === 'left' || d === -1 ? -1 : 1);
    return 0.02;
  };

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

  H.mood = ctx => {
    const fig = figOf(ctx); if (!fig) return 0;
    const name = ctx.args.name || ctx.args.mood;
    const preset = STICK.presets.moods[name];
    if (!preset) { ctx.rt.warn(`unknown mood "${name}"`); return 0; }
    const dur = ctxx_animated(ctx) ? durOf(ctx, DUR.quick) : 0.02;
    const ease = EASE.inOut;
    const E = preset.expr;
    tw(ctx, fig, 'smile', ctx.t0, dur, num(E.smile, 0), ease);
    tw(ctx, fig, 'eyeOpen', ctx.t0, dur, num(E.eyeOpen, 1), ease);
    tw(ctx, fig, 'browTilt', ctx.t0, dur, num(E.browTilt, 0), ease);
    tw(ctx, fig, 'browRaise', ctx.t0, dur, num(E.browRaise, 0), ease);
    tw(ctx, fig, 'mouthOpen', ctx.t0, dur, num(E.mouthOpen, 0), ease);
    tw(ctx, fig, 'pupX', ctx.t0, dur, num(E.pupilX, 0), ease);
    tw(ctx, fig, 'pupY', ctx.t0, dur, num(E.pupilY, 0), ease);
    if (preset.pose) {
      if (typeof preset.pose.bend === 'number') tw(ctx, fig, 'bend', ctx.t0, dur, preset.pose.bend, ease);
      if (typeof preset.pose.headTilt === 'number') tw(ctx, fig, 'headTilt', ctx.t0, dur, preset.pose.headTilt, ease);
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
    ctx.rt.overlays.push({ type: 'say', fig: fig.id, text, t0: ctx.t0, t1: ctx.t0 + dur });
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
