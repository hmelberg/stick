/* stick — the dog: a four-legged figure ("kind": "dog") with its own skeleton maths
   and drawing, driven by the same channels as a person (x, y, facing, sit, lie, crouch,
   bend, lean, headTilt, tilt, the expression channels, mood) plus a few of its own
   (wagAdd, tailAdd, earAdd, beg, bow, cock, bark — see the `dog` command).

   computeDog returns the same pose shape as computeFigure, so every consumer (camera
   framing, bubbles, shadows, held props, resolvePoint) works unchanged:
     pelvis = hips, sh / neck = shoulders, legL / legR = far / near hind leg,
     armL / armR = far / near front leg, world.handR = the MOUTH (a held prop sits there).

   Dog-local space: origin on the ground under the middle of the body, +x = facing,
   +y = down. Feeling lives in the tail and ears first, the face second. */
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;
  const STICK = (G.STICK = G.STICK || {});
  const { clamp, lerp } = STICK;
  const { ik2, activeLoco, blinkAmt, rand01 } = STICK._fig;
  const D = STICK._draw;

  const rad = d => (d * Math.PI) / 180;
  const TAU = Math.PI * 2;
  const mixP = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) });
  const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  const rot2 = (x, y, deg) => { const c = Math.cos(rad(deg)), s = Math.sin(rad(deg)); return { x: x * c - y * s, y: x * s + y * c }; };

  /* Proportions, in units of the height (top of the head when standing): a big head on a
     short body — a pup, not a greyhound. */
  STICK.dogGeom = fig => {
    const h = typeof fig === 'number' ? fig : fig.height;
    return {
      h, headR: 0.25 * h, stroke: 0.07 * h,
      upper: 0.2 * h, lower: 0.2 * h,   // both leg bones
      tail: 0.44 * h, foot: 0.07 * h,
    };
  };
  // how far ahead of its position a standing dog's mouth is (so it can stop with its nose over a prop)
  STICK.dogReach = fig => 0.7 * fig.height;

  /* Body poses, in units of the height:
     [hipX, hipY, shoulderX, shoulderY, hindPawX, hindPawY, frontPawX, frontPawY, headDX, headDY, headAngle, frontPawDroop] */
  const POSE = {
    stand:  [-0.28, -0.39, 0.28, -0.39, -0.30, 0, 0.29, 0, 0.16, -0.36, 0, 0],
    crouch: [-0.28, -0.24, 0.28, -0.21, -0.31, 0, 0.33, 0, 0.20, -0.30, 4, 0],
    sit:    [-0.20, -0.09, 0.25, -0.40, 0.02, 0, 0.27, 0, 0.13, -0.37, 0, 0],
    lie:    [-0.28, -0.10, 0.26, -0.13, -0.05, 0, 0.56, 0, 0.20, -0.27, 0, 0],
    bow:    [-0.26, -0.41, 0.26, -0.15, -0.30, 0, 0.58, 0, 0.21, -0.24, -14, 0],
    beg:    [-0.12, -0.09, 0.03, -0.63, 0.08, 0, 0.25, -0.52, 0.09, -0.37, -8, 75],
  };
  const NAP = [0.31, -0.14, 9]; // head on the paws: headDX, headDY, headAngle (lying with the eyes shut)

  /* How each mood sits in the tail and ears. tail: −1 tucked … 0 level … 1 straight up;
     wag: how much it wags (the speed comes from the mood's idle energy); ears: −1 pinned
     back … 0 hanging … 1 pricked; wiggle: the whole back end joins in; pant: tongue out;
     tremble: shivering. */
  const DOG_MOOD = {
    neutral:     { tail: 0.3,   wag: 0.3,  ears: 0 },
    happy:       { tail: 0.75,  wag: 1,    ears: 0.22, pant: 1 },
    ecstatic:    { tail: 0.9,   wag: 1.35, ears: 0.32, wiggle: 1, pant: 1 },
    laughing:    { tail: 0.85,  wag: 1.2,  ears: 0.28, wiggle: 0.6, pant: 1 },
    love:        { tail: 0.6,   wag: 0.9,  ears: -0.15, pant: 0.6 },
    proud:       { tail: 1,     wag: 0.25, ears: 0.45 },
    thinking:    { tail: 0.15,  wag: 0.12, ears: 0.5 },
    confused:    { tail: 0.15,  wag: 0.1,  ears: 0.6 },
    surprised:   { tail: 0.55,  wag: 0,    ears: 1 },
    angry:       { tail: 0.8,   wag: 0,    ears: 0.9 },
    bored:       { tail: -0.35, wag: 0,    ears: -0.2 },
    sleepy:      { tail: -0.45, wag: 0.08, ears: -0.25 },
    disgusted:   { tail: -0.2,  wag: 0,    ears: -0.5 },
    embarrassed: { tail: -0.55, wag: 0.25, ears: -0.7 },
    worried:     { tail: -0.6,  wag: 0.1,  ears: -0.6 },
    sad:         { tail: -0.75, wag: 0,    ears: -0.45 },
    crying:      { tail: -0.85, wag: 0,    ears: -0.6 },
    scared:      { tail: -1,    wag: 0,    ears: -1, tremble: 1 },
  };
  STICK.dogMoods = DOG_MOOD;
  function feel(name) {
    const d = DOG_MOOD[name] || DOG_MOOD.neutral;
    const idle = (STICK.presets.moods[name] || STICK.presets.moods.neutral).idle;
    return {
      tail: d.tail, wag: d.wag || 0, ears: d.ears || 0, wiggle: d.wiggle || 0, pant: d.pant || 0, tremble: d.tremble || 0,
      freq: clamp(1.3 + 2.3 * idle.energy, 1.2, 4.6), energy: idle.energy, sway: idle.sway, bounce: idle.bounce,
    };
  }
  // the mood now, the one before it, and how far the body language has moved over (0..1)
  function moodMix(rt, id, t) {
    const c = rt.ch.m.get(id + '.mood');
    let cur = c && c.base ? c.base : 'neutral', prev = cur, ts = -1e9;
    if (c) {
      let best = null, second = null;
      for (const tr of c.tracks) {
        if (tr.t0 > t) continue;
        if (!best || tr.t0 >= best.t0) { second = best; best = tr; }
        else if (!second || tr.t0 >= second.t0) second = tr;
      }
      if (best) { cur = best.to; ts = best.t0; prev = second ? second.to : (c.base || 'neutral'); }
    }
    return { a: feel(prev), b: feel(cur), w: smooth((t - ts) / 0.45) };
  }

  /* Four-legged gait from distance travelled: a trot for walk (diagonal pairs), a bound
     for run (front pair / hind pair, stretched ↔ gathered), a braced skid for slide. */
  const GAIT = {
    walk: { stride: 0.62, amp: 0.15, lift: 0.085, bob: 0.014, pitch: 0, drop: 0 },
    run:  { stride: 1.15, amp: 0.27, lift: 0.15, bob: 0.07, pitch: 7, drop: 0.03 },
  };
  const NO_GAIT = { ramp: 0, run: 0, dx: [0, 0, 0, 0], lift: [0, 0, 0, 0], bob: 0, pitch: 0, head: 0, ear: 0, phi: 0 };
  function dogGait(rt, fig, t, h, loco) {
    const ramp = clamp(Math.min((t - loco.t0) / 0.25, (loco.t1 - t) / 0.3, 1), 0, 1);
    if (ramp <= 0) return NO_GAIT;
    const run = loco.style === 'run', p = run ? GAIT.run : GAIT.walk;
    const x = rt.ch.get(fig.id + '.x', t), y = rt.ch.get(fig.id + '.y', t);
    const phi = (Math.hypot(x - loco.x0, y - loco.y0) / (p.stride * h)) * TAU + (fig.seed * TAU) % TAU;
    const o = { ramp, run: run ? ramp : 0, dx: [0, 0, 0, 0], lift: [0, 0, 0, 0], bob: 0, pitch: 0, head: 0, ear: 0, phi };
    if (loco.style === 'slide') { // braced: front paws out ahead, haunches down
      o.dx = [0.05 * h * ramp, 0.02 * h * ramp, 0.14 * h * ramp, 0.1 * h * ramp];
      o.pitch = -7 * ramp; o.bob = -0.04 * h * ramp; o.ear = -0.5 * ramp;
      return o;
    }
    // leg order: far hind, near hind, far front, near front
    const ph = run ? [phi + Math.PI + 0.75, phi + Math.PI + 0.2, phi + 0.55, phi] : [phi + 0.2, phi + Math.PI + 0.2, phi + Math.PI, phi];
    for (let i = 0; i < 4; i++) {
      // the paw sweeps back on the ground while sin > 0, and swings forward in the air while sin < 0
      o.dx[i] = p.amp * h * Math.cos(ph[i]) * ramp;
      o.lift[i] = p.lift * h * Math.pow(Math.max(0, -Math.sin(ph[i])), 0.8) * ramp;
    }
    if (run) {
      const air = 0.5 + 0.5 * Math.cos(phi + 0.3); // 1 = stretched out and flying, 0 = gathered
      o.bob = (p.bob * air - p.drop) * h * ramp;
      o.pitch = p.pitch * Math.sin(phi + 0.9) * ramp;
      o.head = -4 * Math.sin(phi + 0.9) * ramp;
      o.ear = (-0.75 + 0.25 * Math.sin(phi * 2)) * ramp;
    } else {
      o.bob = p.bob * h * (0.5 + 0.5 * Math.cos(phi * 2)) * ramp;
      o.head = 2.5 * Math.sin(phi * 2 + 0.6) * ramp;
      o.ear = 0.1 * Math.sin(phi * 2 + 1.2) * ramp;
    }
    return o;
  }

  // an ear flick now and then: 0..1
  function twitch(t, seed) {
    const L = 4.3, k = Math.floor(t / L);
    const tt = k * L + 0.6 + rand01(k + 40, seed) * 3.1, d = t - tt;
    return d > 0 && d < 0.24 ? Math.sin((d / 0.24) * Math.PI) : 0;
  }

  /* The pure pose function for a dog: state at time t, in local coords + transform. */
  STICK.computeDog = function (rt, fig, t) {
    const ch = rt.ch, id = fig.id;
    const g = STICK.dogGeom(fig), h = g.h, r = g.headR;
    const get = (s, d) => { const v = ch.getDef(id + '.' + s, t, d === undefined ? 0 : d); return typeof v === 'number' && isFinite(v) ? v : (d === undefined ? 0 : d); };

    const x = get('x', 50), y = get('y', 70);
    /* Facing. Left/right are the real views. A dog seen from the front or the back keeps
       the same side-on skeleton, strongly foreshortened along its length (kx), with the head
       turned to the viewer (front) or away (show → 0); turning sweeps through that, so the
       left/right flip happens while the body is at its narrowest. */
    const yawV = clamp(get('facing', 1), -2, 2), ay = Math.abs(yawV);
    const fc = yawV >= 0 ? 1 : -1;
    const front = clamp(1 - ay, 0, 1), back = clamp(ay - 1, 0, 1);
    const kx = 1 - 0.68 * smooth(Math.max(front, back));
    const rot = get('tilt');

    const wSit = clamp(get('sit'), 0, 1), wCr = clamp(get('crouch'), 0, 1), wLie = clamp(get('lie'), 0, 1);
    const wBow = clamp(get('bow'), 0, 1), wBeg = clamp(get('beg'), 0, 1), bark = clamp(get('bark'), 0, 1);
    const bend = clamp(get('bend'), -0.3, 0.6), lean = clamp(get('lean'), -0.4, 0.4), headTilt = clamp(get('headTilt'), -0.5, 0.5);
    const eyeOpenCh = clamp(get('eyeOpen', 1), 0, 1);

    // body pose: stand, with the others blended over it in turn
    const p = POSE.stand.slice();
    const over = (q, w) => { if (w > 0) for (let i = 0; i < p.length; i++) p[i] = lerp(p[i], q[i], w); };
    over(POSE.crouch, wCr); over(POSE.sit, wSit); over(POSE.lie, wLie); over(POSE.bow, wBow); over(POSE.beg, wBeg);
    const nap = wLie * (1 - wBow) * (1 - wBeg) * clamp(1.15 - eyeOpenCh * 1.6, 0, 1);
    p[8] = lerp(p[8], NAP[0], nap); p[9] = lerp(p[9], NAP[1], nap); p[10] = lerp(p[10], NAP[2], nap);
    const grounded = Math.max(wLie, wSit * 0.5, wBeg); // how much of the dog is resting on the floor

    const loco = activeLoco(rt, id, t);
    const gait = loco ? dogGait(rt, fig, t, h, loco) : NO_GAIT;

    // feeling + idle life
    const M = moodMix(rt, id, t), mw = M.w, fa = M.a, fb = M.b;
    const mm = k => lerp(fa[k], fb[k], mw);
    const wob = fig.wobble != null ? fig.wobble : STICK.DEFAULT_WOBBLE;
    const idleK = 1 - gait.ramp, swayK = idleK * wob, lifeK = clamp(wob / 0.6, 0, 1.5);
    const ph0 = fig.seed * TAU;
    const pace = (0.22 + 0.12 * mm('energy')) * (0.9 + rand01(24, fig.seed) * 0.2);
    const breath = 0.011 * h * (0.5 + mm('sway')) * Math.sin(TAU * pace * t + ph0) * swayK;
    const prance = 0.05 * h * mm('bounce') * Math.max(0, Math.sin(TAU * 2.1 * t + ph0)) * idleK * (1 - wLie);
    const wiggle = mm('wiggle') * Math.sin(TAU * 3.4 * t + ph0) * idleK * Math.min(1, lifeK) * (1 - wLie * 0.6);
    const shiver = mm('tremble') * 0.007 * h * Math.sin(TAU * 13 * t) * Math.min(1, lifeK);

    const H = { x: p[0] * h + lean * 0.55 * h - wiggle * 0.03 * h + shiver, y: p[1] * h - breath * 0.5 - prance * 0.3 - gait.bob };
    const S = { x: p[2] * h + lean * 0.55 * h + shiver, y: p[3] * h - breath - prance - gait.bob - bark * 0.035 * h };
    if (gait.pitch) { // rock about the middle of the body
      const c = mixP(H, S, 0.5);
      for (const q of [H, S]) { const v = rot2(q.x - c.x, q.y - c.y, gait.pitch); q.x = c.x + v.x; q.y = c.y + v.y; }
    }

    // head: carried on the shoulders; bend/headTilt lower and tip it, lookAt uses headTilt too
    let headA = p[10] + headTilt * 90 + bend * 35 + gait.head + 3 * mm('sway') * Math.sin(TAU * pace * 0.6 * t + ph0 * 1.7) * swayK - bark * 6;
    let headC = {
      x: S.x + (p[8] + bend * 0.1 + bark * 0.03) * h,
      y: S.y + (p[9] + bend * 0.32 + headTilt * 0.22) * h,
    };
    // cocking the head turns the face to the viewer and tips it over: the puzzled look
    const cock = clamp(get('cock'), -1, 1), faceOn = Math.max(front, smooth(Math.abs(cock)) * (1 - back));
    headC.x -= (faceOn - front) * 0.08 * h;
    const gripX = lerp(1.14, 0, faceOn) * r, gripY = lerp(0.6, 0.66, faceOn) * r; // the mouth, in head coords

    // transform helpers
    const cr = Math.cos(rad(rot)), sr = Math.sin(rad(rot));
    const toWorld = q => ({ x: x + fc * (q.x * cr - q.y * sr), y: y + (q.x * sr + q.y * cr) });
    const toLocal = w => {
      const qx = (w.x - x) * fc, qy = w.y - y;
      return { x: qx * cr + qy * sr, y: -qx * sr + qy * cr };
    };

    // the snout reaches for things (pickUp / handOff drive the "right hand" reach channels)
    const reach = clamp(get('reachRon'), 0, 1);
    if (reach > 0.01) {
      const tl = toLocal({ x: get('reachRx', x), y: get('reachRy', y) });
      tl.x /= kx;
      const low = clamp((tl.y - S.y) / (0.3 * h), 0, 1);
      S.y += reach * low * 0.1 * h;
      const aA = lerp(-12, 40, low), off = rot2(gripX, gripY, aA);
      let hc = { x: tl.x - off.x, y: tl.y - off.y };
      const dx = hc.x - S.x, dy = hc.y - S.y, dist = Math.hypot(dx, dy) || 1e-4, max = 0.62 * h;
      if (dist > max) hc = { x: S.x + (dx / dist) * max, y: S.y + (dy / dist) * max };
      headC = mixP(headC, hc, reach); headA = lerp(headA, aA, reach);
    }
    headC.y = Math.min(headC.y, -r * 0.92); // the chin never sinks into the floor
    const headRot = headA * (1 - faceOn) + cock * 21 * faceOn;

    // legs: two-bone IK from hip / shoulder to each paw (far ones a touch ahead, so all four read)
    const tuck = clamp((get('kneeL') + get('kneeR')) / 100, 0, 1.3); // hop tucks the legs
    const sp = 0.055 * h, splay = front * 0.075 * h + back * 0.06 * h;
    const paddle = wBeg * 0.03 * h * Math.sin(TAU * 2.6 * t + ph0);
    const leg = (i, root, baseX, baseY, side, droop) => {
      const far = i === 0 || i === 2, hind = i < 2;
      const tgt = {
        x: baseX * h + (far ? sp : -sp) + gait.dx[i] + (hind ? -0.13 : 0.12) * h * tuck,
        y: Math.min(0, baseY * h - gait.lift[i] - (hind ? 0.07 : 0.1) * h * tuck + (hind ? 0 : (far ? -paddle : paddle))),
      };
      const k = ik2(root, tgt, g.upper, g.lower, side);
      const mid = { x: k.mid.x, y: Math.min(k.mid.y, -0.02 * h) }, end = { x: k.end.x, y: Math.min(k.end.y, 0) };
      // paw: flat on the ground, toe down while it swings (and drooping when begging)
      const pitch = droop + Math.min(55, (gait.lift[i] / (0.15 * h)) * 42 + tuck * 30);
      const foot = { x: end.x + g.foot * Math.cos(rad(pitch)), y: Math.min(0, end.y + g.foot * Math.sin(rad(pitch))) };
      return { mid, end, foot, sx: far ? splay : -splay };
    };
    const hindF = leg(0, H, p[4], p[5], -1, 0), hindN = leg(1, H, p[4], p[5], -1, 0);
    const foreF = leg(2, S, p[6], p[7], 1, p[11]), foreN = leg(3, S, p[6], p[7], 1, p[11]);

    // tail: height from the mood, wag from the mood's energy; streams out behind at a run
    const wagAdd = clamp(get('wagAdd'), 0, 2), tailAdd = get('tailAdd'), earAdd = get('earAdd');
    let lift = clamp(mm('tail') + tailAdd + wBow * 0.3, -1, 1);
    lift = lerp(lift, 0.12, gait.run * 0.85);
    const osc = (f, lag) => Math.sin(TAU * f * t + ph0 - lag);
    const wagAt = lag => clamp(
      24 * lifeK * (1 - gait.run * 0.75) * ((1 - mw) * fa.wag * osc(fa.freq, lag) + mw * fb.wag * osc(fb.freq, lag))
      + 30 * wagAdd * osc(4.2, lag) + gait.run * 9 * Math.sin(gait.phi * 2 - lag), -58, 58);
    const tA = lift >= 0 ? 15 + 75 * lift : 15 + 88 * lift;             // degrees above "straight back"
    const curl = lift >= 0 ? 8 + 24 * lift : 75 * lift;                   // the tip curls further the same way
    const tdir = a => ({ x: -Math.cos(rad(a)), y: -Math.sin(rad(a)) });
    const floorY = -0.025 * h;
    const tb = { x: H.x - 0.015 * h, y: Math.min(H.y - 0.01 * h, floorY) };
    const d1 = tdir(tA + wagAt(0) * 0.55), d2 = tdir(tA + curl + wagAt(0.9) * 1.25);
    const tm = { x: tb.x + d1.x * g.tail * 0.48, y: Math.min(tb.y + d1.y * g.tail * 0.48, floorY) };
    const tt = { x: tm.x + d2.x * g.tail * 0.52, y: Math.min(tm.y + d2.y * g.tail * 0.52, floorY) };

    // ears: −1 pinned back … 0 hanging … 1 pricked. The near one flicks now and then.
    const earBase = clamp(mm('ears') + earAdd + gait.ear + nap * -0.2, -1, 1.1);
    const earDeg = e => (e >= 0 ? 22 + e * 118 : 22 - e * 40) - headRot * 0.7 * (1 - faceOn);
    const earN = earDeg(clamp(earBase + 0.4 * twitch(t, fig.seed) * Math.min(1, lifeK) * idleK, -1, 1.1));
    const earF = earDeg(clamp(earBase - 0.06 + Math.abs(cock) * 0.35, -1, 1.1));

    // face: the same expression channels as a person; a happy dog pants
    const blink = blinkAmt(t, fig.seed);
    const fjit = k => rand01(k, fig.seed) - 0.5;
    const pant = clamp(mm('pant'), 0, 1) * (1 - nap);
    const face = {
      smile: clamp(get('smile') + fjit(21) * 0.05, -1, 1),
      eyeOpen: clamp(eyeOpenCh * (1 + fjit(22) * 0.1), 0, 1) * (1 - blink),
      browTilt: clamp(get('browTilt'), -1, 1),
      browRaise: clamp(get('browRaise') + fjit(23) * 0.08, -0.3, 1),
      mouthOpen: clamp(get('mouthOpen') + pant * (0.36 + 0.07 * Math.sin(TAU * 3.1 * t + ph0) * Math.min(1, lifeK)), 0, 1),
      pupX: clamp(get('pupX'), -1, 1),
      pupY: clamp(get('pupY'), -1, 1),
      browSkew: clamp(get('browSkew'), -1, 1),
      tears: clamp(get('tears'), 0, 1),
      blush: clamp(get('blush'), 0, 1),
      t, front: faceOn, show: 1 - back,
    };

    // foreshorten along the body for front/back views (the head itself keeps its size)
    const sq = (q, dx) => ({ x: q.x * kx + (dx || 0), y: q.y });
    const hip = sq(H), sh = sq(S), hc = sq(headC);
    const legOut = l => ({ knee: sq(l.mid, l.sx), ank: sq(l.end, l.sx), foot: { x: l.end.x * kx + l.sx + (l.foot.x - l.end.x) * Math.max(kx, 0.45), y: l.foot.y } });
    const armOut = l => { const o = legOut(l); return { elb: o.knee, hand: o.ank, foot: o.foot }; };
    const legL = legOut(hindF), legR = legOut(hindN), armL = armOut(foreF), armR = armOut(foreN);
    const tail = [sq(tb), sq(tm), sq(tt)];
    const midSpine = mixP(hip, sh, 0.5);
    const ctrl = { x: midSpine.x, y: midSpine.y - bend * 0.22 * h + grounded * 0.02 * h };
    const mouth = (o => ({ x: hc.x + o.x, y: hc.y + o.y }))(rot2(gripX, gripY, headRot));
    const snout = (o => ({ x: hc.x + o.x, y: hc.y + o.y }))(rot2(lerp(1.5, 0, faceOn) * r, 0.1 * r, headRot));
    const noseDir = rot2(1, 0, headRot);
    const wm = toWorld(mouth), wh = toWorld(hc), wn = toWorld({ x: hc.x + noseDir.x, y: hc.y + noseDir.y });

    return {
      kind: 'dog',
      x, y, fc, rot, g, pelvis: hip, neck: sh, ctrl, sh, headC: hc, headA: headRot,
      lateral: 0,
      legL, legR, armL, armR, face, toWorld,
      hands: { L: 'relaxed', R: 'relaxed' },
      tail, earN, earF, earPin: clamp(-earBase, 0, 1), front: faceOn, turned: Math.max(faceOn, back), kx, mouth, cock, pant,
      mouthAngle: (Math.atan2(wn.y - wh.y, wn.x - wh.x) * 180) / Math.PI, // world aim of the snout (directional props)
      shadow: { dx: fc * 0.1 * h * kx, rx: (0.5 * kx + 0.14) * h, ry: 0.05 * h },
      world: {
        head: wh,
        chest: toWorld(mixP(hip, sh, 0.72)),
        handL: toWorld(armL.hand), handR: wm, // the "right hand" is the mouth
        footL: toWorld(legL.ank), footR: toWorld(legR.ank),
        pos: { x, y },
        extra: [toWorld(tail[2]), toWorld(snout), toWorld(armR.hand), toWorld(armR.foot)],
      },
    };
  };

  /* ================================ drawing ================================
     One style for the dog, in the people's hand: single strokes for body, legs and tail,
     a round paper head with the cartoon big eyes, a muzzle, a nose and two flop ears.
     fig.style picks the line: sketch = wobbly boiling line (default), ink = clean,
     toon = clean with a filled body in bodyColor. */
  const PAPER = 'var(--paper, #f7f2e9)';
  const f2 = v => v.toFixed(2);

  STICK.dogStyle = {
    build(fig, parent) {
      const mk = D.mk;
      const g = STICK.dogGeom(fig), r = g.headR, ink = fig.color;
      const sketch = fig.style !== 'ink' && fig.style !== 'toon', toon = fig.style === 'toon';
      const w = g.stroke * (sketch ? 0.92 + 0.2 * D.srand(1, fig.seed) : 1);
      const line = { stroke: ink, 'stroke-width': w, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
      const n = { fig, g, w, sketch, toon, kind: fig.face === 'cartoon' || !fig.face ? 'cartoon' : fig.face };
      const root = (n.root = mk('g', { class: 'fig dog' }, parent));
      n.farG = mk('g', { opacity: 0.6 }, root);
      n.far = mk('path', { ...line, 'stroke-width': w * 0.88 }, n.farG);
      n.farPaws = mk('path', { ...line, 'stroke-width': w * 1.05 }, n.farG);
      n.tail = mk('path', line, root);
      if (toon) {
        n.bodyOut = mk('path', { ...line, 'stroke-width': 0.24 * g.h + w * 1.1 }, root);
        n.bodyIn = mk('path', { ...line, stroke: fig.bodyColor, 'stroke-width': 0.24 * g.h }, root);
      }
      n.body = mk('path', { ...line, 'stroke-width': w * 1.3 }, root);
      n.near = mk('path', line, root);
      n.nearPaws = mk('path', { ...line, 'stroke-width': w * 1.2 }, root);
      if (fig.collar) n.collar = mk('path', { stroke: fig.collar, 'stroke-width': w * 1.35, fill: 'none', 'stroke-linecap': 'round' }, root);

      const hg = (n.headG = mk('g', {}, root));
      const earAttrs = { fill: ink, stroke: ink, 'stroke-width': w * 0.35, 'stroke-linejoin': 'round' };
      n.earF = mk('path', earAttrs, hg);
      n.headFill = mk('path', { fill: PAPER, stroke: 'none' }, hg);
      n.headStroke = mk('path', { ...line, 'stroke-width': w * 0.62 }, hg);
      if (sketch) n.headStroke2 = mk('path', { ...line, 'stroke-width': w * 0.36, opacity: 0.35 }, hg);
      const fg = (n.faceG = mk('g', {}, hg));
      const fw = 0.09 * r;
      const cartoon = n.kind === 'cartoon';
      const eye = cartoon ? { fill: '#ffffff', stroke: ink, 'stroke-width': fw } : { fill: ink };
      n.eyeF = mk('ellipse', eye, fg); n.pupF = mk('circle', { fill: D.DARK }, fg);
      n.eyeN = mk('ellipse', eye, fg); n.pupN = mk('circle', { fill: D.DARK }, fg);
      const arc = { stroke: ink, 'stroke-width': fw * (cartoon ? 2 : 1.6), fill: 'none', 'stroke-linecap': 'round', visibility: 'hidden' };
      n.arcF = mk('path', arc, fg); n.arcN = mk('path', arc, fg);
      const brow = { stroke: ink, 'stroke-width': fw * (cartoon ? 2.1 : 1.5), fill: 'none', 'stroke-linecap': 'round' };
      n.browF = mk('path', brow, fg); n.browN = mk('path', brow, fg);
      n.muzzle = mk('path', { fill: PAPER, stroke: ink, 'stroke-width': w * 0.46, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, fg);
      n.jaw = mk('path', { fill: D.DARK, stroke: ink, 'stroke-width': fw * 1.3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, fg);
      n.tongue = mk('path', { fill: '#e2685d', stroke: '#b8463e', 'stroke-width': fw * 0.5, 'stroke-linejoin': 'round', visibility: 'hidden' }, fg);
      n.lip = mk('path', { fill: 'none', stroke: ink, 'stroke-width': fw * 1.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, fg);
      n.nose = mk('ellipse', { fill: ink }, fg);
      const tear = { fill: '#8fbce8', stroke: '#5f93cc', 'stroke-width': 0.02 * r, visibility: 'hidden' };
      n.tearN = mk('ellipse', { rx: 0.075 * r, ry: 0.12 * r, ...tear }, fg);
      n.tearF = mk('ellipse', { rx: 0.075 * r, ry: 0.12 * r, ...tear }, fg);
      n.earN = mk('path', earAttrs, hg);
      // every dog's eyes are a little mismatched, like the people's
      const ms = Math.sin((fig.seed || 1) * 91.7) * 43758.5453, mr = ms - Math.floor(ms);
      n.mis = (mr < 0.5 ? -1 : 1) * (0.05 + 0.07 * Math.abs(mr * 2 - 1));
      return n;
    },

    update(n, P, t) {
      const g = P.g, h = g.h, r = g.headR, fig = n.fig;
      const pt = D.pt;
      // line boil, exactly as the sketch people: a still drawing blended with a re-jittered one
      const frame = D.boilFrame(t == null ? 0 : t);
      const wb = fig.wobble != null ? fig.wobble : 0.6;
      const kb = Math.min(1, wb), big = Math.max(1, wb);
      const sd0 = fig.seed * 53, sd = sd0 + frame * 101;
      const amp = n.sketch ? 0.013 * h * big : 0;
      const wobble = (pts, a, salt) => {
        if (!a) return pts;
        const still = D.wobbleRaw(pts, a, sd0 + salt);
        if (kb <= 0) return still;
        const live = D.wobbleRaw(pts, a, sd + salt);
        return still.map((q, i) => ({ x: q.x + (live[i].x - q.x) * kb, y: q.y + (live[i].y - q.y) * kb }));
      };
      const jitB = (i, salt, a) => { if (!n.sketch) return 0; const s0 = D.jit(i, sd0 + salt, a); return s0 + (D.jit(i + frame * 7, sd + salt, a) - s0) * kb; };
      const stroke = (pts, salt, a) => D.smoothOpen(wobble(D.resample(pts, 0.1 * h), a == null ? amp : a, salt));

      D.setTf(n.root, P);
      n.farG.setAttribute('opacity', (0.6 + 0.4 * (1 - P.kx) / 0.68).toFixed(3)); // far legs are not "far" head-on

      const paw = (l, e, salt) => stroke([{ x: e.x - (l.foot.x - e.x) * 0.25, y: e.y - (l.foot.y - e.y) * 0.25 }, l.foot], salt, amp * 0.6);
      n.far.setAttribute('d', stroke([P.pelvis, P.legL.knee, P.legL.ank], 11) + ' ' + stroke([P.sh, P.armL.elb, P.armL.hand], 23));
      n.farPaws.setAttribute('d', paw(P.legL, P.legL.ank, 91) + ' ' + paw(P.armL, P.armL.hand, 93));
      n.near.setAttribute('d', stroke([P.pelvis, P.legR.knee, P.legR.ank], 37) + ' ' + stroke([P.sh, P.armR.elb, P.armR.hand], 47));
      n.nearPaws.setAttribute('d', paw(P.legR, P.legR.ank, 97) + ' ' + paw(P.armR, P.armR.hand, 99));
      n.tail.setAttribute('d', D.smoothOpen(wobble(D.quadPts(P.tail[0], P.tail[1], P.tail[2], 6), amp * 0.8, 71)));

      // spine, then the neck up to the edge of the head
      const nv = { x: P.headC.x - P.sh.x, y: P.headC.y - P.sh.y }, nl = Math.hypot(nv.x, nv.y) || 1;
      const vis = Math.max(0, nl - r * 0.96);
      const neckEnd = { x: P.sh.x + (nv.x / nl) * vis, y: P.sh.y + (nv.y / nl) * vis };
      const spine = D.quadPts(P.pelvis, P.ctrl, P.sh, 6);
      const bodyD = D.smoothOpen(wobble(spine, amp, 61)) + (vis > 0.01 * h ? ' ' + stroke([P.sh, neckEnd], 63) : '');
      n.body.setAttribute('d', bodyD);
      if (n.toon) { const d = D.smoothOpen(spine); n.bodyOut.setAttribute('d', d); n.bodyIn.setAttribute('d', d); }
      if (n.collar) {
        const show = vis > 0.07 * h && P.face.show > 0.3;
        n.collar.setAttribute('visibility', show ? 'visible' : 'hidden');
        if (show) {
          const c = { x: P.sh.x + (nv.x / nl) * vis * 0.62, y: P.sh.y + (nv.y / nl) * vis * 0.62 }, hw = 0.06 * h;
          n.collar.setAttribute('d', `M ${f2(c.x + (nv.y / nl) * hw)} ${f2(c.y - (nv.x / nl) * hw)} L ${f2(c.x - (nv.y / nl) * hw)} ${f2(c.y + (nv.x / nl) * hw)}`);
        }
      }

      // ---- head (its own group: origin at the head centre, +x along the snout) ----
      n.headG.setAttribute('transform', `translate(${f2(P.headC.x)} ${f2(P.headC.y)}) rotate(${f2(P.headA)})`);
      const F = P.face, fr = P.front, L = (a, b) => a + (b - a) * fr;
      const N = 13, ring = [];
      const th0 = rad(96 + D.jit(2, fig.seed, 8));
      for (let k = 0; k <= N; k++) {
        const th = th0 + (k / N) * TAU * (n.sketch ? 1.025 : 1);
        const rr = r * (1 + jitB(k * 3.1, 5, 0.04 * big));
        ring.push({ x: Math.cos(th) * rr, y: Math.sin(th) * rr });
      }
      n.headFill.setAttribute('d', D.polyD(ring) + ' Z');
      n.headStroke.setAttribute('d', n.sketch ? D.smoothOpen(ring) : D.smoothClosed(ring.slice(0, N)));
      if (n.headStroke2) n.headStroke2.setAttribute('d', D.smoothOpen(ring.map((q, i) => ({ x: q.x + jitB(i * 5 + 2, 71, 0.035 * r), y: q.y + jitB(i * 5 + 3, 71, 0.035 * r) }))));

      // ears: a leaf hanging from the top of the head, swung by P.earN / P.earF
      const ear = (el, ax, ay, deg, flip, len) => {
        const a = rad(deg), dx = -Math.sin(a) * flip, dy = Math.cos(a), nx = dy, ny = -dx;
        const Le = len * r, We = 0.46 * r;
        const at = (u, v) => ({ x: ax + dx * Le * u + nx * We * v, y: ay + dy * Le * u + ny * We * v });
        el.setAttribute('d', D.smoothClosed(wobble([at(0, 0.2), at(0.45, 0.5), at(0.85, 0.36), at(1, 0), at(0.85, -0.36), at(0.45, -0.5), at(0, -0.2)], amp * 0.5, 131 + (flip > 0 ? 7 : 0))));
      };
      const pin = P.earPin * (1 - fr); // pinned back: the ear slides down the back of the skull
      const E = (a, b) => a + (b - a) * P.turned; // ears sit either side of the head from the front AND the back
      ear(n.earN, (E(-0.42, -0.86) - 0.16 * pin) * r, (E(-0.74, -0.5) + 0.3 * pin) * r, P.earN, 1, 1.02 - 0.12 * pin);
      ear(n.earF, E(-0.05, 0.86) * r, E(-0.9, -0.5) * r, P.earF, E(1, -1), E(0.92, 1.02));

      n.faceG.setAttribute('opacity', (F.show == null ? 1 : F.show).toFixed(2));
      if (F.show <= 0.01) return;
      const cartoon = n.kind === 'cartoon';
      const cl = (v, a, b) => Math.min(b, Math.max(a, v));

      // muzzle + nose
      const mcx = L(0.8, 0) * r, mcy = L(0.3, 0.38) * r, mrx = L(0.64, 0.56) * r, mry = L(0.43, 0.4) * r;
      const mz = [];
      for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU + 0.3; mz.push({ x: mcx + Math.cos(a) * mrx * (1 + jitB(k * 2.7, 211, 0.03)), y: mcy + Math.sin(a) * mry * (1 + jitB(k * 2.7 + 1, 211, 0.03)) }); }
      n.muzzle.setAttribute('d', D.smoothClosed(mz));
      const nx = L(1.36, 0) * r, ny = L(0.06, 0.13) * r;
      n.nose.setAttribute('cx', f2(nx)); n.nose.setAttribute('cy', f2(ny));
      n.nose.setAttribute('rx', f2(L(0.2, 0.23) * r)); n.nose.setAttribute('ry', f2(0.16 * r));

      // mouth: a lip line across the muzzle; the jaw drops below it; a happy open mouth pants
      const open = cl(F.mouthOpen, 0, 1), smile = cl(F.smile, -1, 1);
      const mj = jitB(9, 83, 0.02 * r);
      const panting = open > 0.25 && smile > 0.2;
      const lol = panting ? 0.5 + 0.5 * Math.sin(TAU * 3.1 * (F.t || 0)) : 0; // the tongue bobs as it pants
      let tongue = '';
      if (fr < 0.5) {
        const cx = 0.36 * r, cy = (0.46 - smile * 0.2) * r, fx = 1.34 * r, fy = 0.4 * r;
        n.lip.setAttribute('d', `M ${f2(cx)} ${f2(cy)} Q ${f2(0.86 * r)} ${f2((0.6 + smile * 0.05) * r + mj)} ${f2(fx)} ${f2(fy)}`);
        const jx = (1.26 - open * 0.1) * r, jy = (0.46 + open * 0.66) * r; // tip of the lower jaw
        n.jaw.setAttribute('visibility', open > 0.03 ? 'visible' : 'hidden');
        n.jaw.setAttribute('d', `M ${f2(cx)} ${f2(cy)} Q ${f2(0.86 * r)} ${f2(0.6 * r)} ${f2(fx - 0.06 * r)} ${f2(fy + 0.06 * r)} L ${f2(jx)} ${f2(jy)} Q ${f2(0.8 * r)} ${f2((0.7 + open * 0.62) * r)} ${f2(cx)} ${f2(cy)} Z`);
        if (panting) {
          const bx = (0.98 - open * 0.04) * r, by = (0.52 + open * 0.42) * r, tl = (0.34 + open * 0.42 + lol * 0.08) * r, tw = 0.19 * r;
          tongue = `M ${f2(bx - tw)} ${f2(by)} Q ${f2(bx - tw * 0.9)} ${f2(by + tl)} ${f2(bx + tw * 0.35)} ${f2(by + tl)} Q ${f2(bx + tw * 1.3)} ${f2(by + tl * 0.9)} ${f2(bx + tw)} ${f2(by - 0.02 * r)} Z`;
        }
      } else {
        const my = 0.5 * r, sw = 0.34 * r, sy = (0.46 - smile * 0.14) * r;
        n.lip.setAttribute('d', `M ${f2(nx)} ${f2(ny + 0.16 * r)} L ${f2(nx)} ${f2(my)} M ${f2(nx - sw)} ${f2(sy)} Q ${f2(nx - sw * 0.5)} ${f2(my + 0.14 * r + mj)} ${f2(nx)} ${f2(my)} Q ${f2(nx + sw * 0.5)} ${f2(my + 0.14 * r + mj)} ${f2(nx + sw)} ${f2(sy)}`);
        const jw = 0.24 * r, jh = open * 0.5 * r;
        n.jaw.setAttribute('visibility', open > 0.05 ? 'visible' : 'hidden');
        n.jaw.setAttribute('d', `M ${f2(nx - jw)} ${f2(my + 0.05 * r)} Q ${f2(nx)} ${f2(my + 0.12 * r)} ${f2(nx + jw)} ${f2(my + 0.05 * r)} Q ${f2(nx + jw)} ${f2(my + 0.1 * r + jh)} ${f2(nx)} ${f2(my + 0.12 * r + jh)} Q ${f2(nx - jw)} ${f2(my + 0.1 * r + jh)} ${f2(nx - jw)} ${f2(my + 0.05 * r)} Z`);
        if (panting) {
          const by = my + 0.1 * r + jh * 0.45, tl = (0.2 + open * 0.42 + lol * 0.07) * r, tw = 0.15 * r;
          tongue = `M ${f2(nx - tw)} ${f2(by)} Q ${f2(nx - tw)} ${f2(by + tl)} ${f2(nx)} ${f2(by + tl)} Q ${f2(nx + tw)} ${f2(by + tl)} ${f2(nx + tw)} ${f2(by)} Z`;
        }
      }
      n.tongue.setAttribute('visibility', tongue ? 'visible' : 'hidden');
      if (tongue) n.tongue.setAttribute('d', tongue);

      // eyes: the cartoon big eyes (or plain ink dots), pushed toward the snout in profile
      const exN = L(0.16, -0.42) * r, exF = L(0.66, 0.42) * r, ey = L(-0.25, -0.22) * r;
      const eOpen = cl(F.eyeOpen, 0, 1), raise = Math.max(0, F.browRaise);
      const happyArcs = smile > 0.65 && eOpen > 0.72;
      const eyes = [
        { eye: n.eyeN, pup: n.pupN, arc: n.arcN, cx: exN, k: 1 + n.mis },
        { eye: n.eyeF, pup: n.pupF, arc: n.arcF, cx: exF, k: (1 - n.mis) * (1 - 0.2 * (1 - fr)) },
      ];
      for (const e of eyes) {
        const rx = (cartoon ? 0.26 : n.kind === 'dots' ? 0.1 : 0.12) * r * e.k;
        const full = cartoon ? rx * 1.22 * (1 + 0.2 * raise) : rx * (n.kind === 'dots' ? 1 : 1.5);
        const ry = Math.max(0.03 * r, full * (cartoon ? eOpen : 0.3 + 0.7 * eOpen));
        e.rx = rx; e.full = full;
        e.eye.setAttribute('cx', f2(e.cx)); e.eye.setAttribute('cy', f2(ey));
        e.eye.setAttribute('rx', f2(rx)); e.eye.setAttribute('ry', f2(ry));
        e.eye.setAttribute('visibility', happyArcs ? 'hidden' : 'visible');
        e.arc.setAttribute('visibility', happyArcs ? 'visible' : 'hidden');
        if (happyArcs) {
          const aw = rx * (cartoon ? 0.95 : 1.5), ah = rx * (cartoon ? 1.4 : 2);
          e.arc.setAttribute('d', `M ${f2(e.cx - aw)} ${f2(ey + ah * 0.25)} Q ${f2(e.cx)} ${f2(ey - ah)} ${f2(e.cx + aw)} ${f2(ey + ah * 0.25)}`);
        }
        const showPup = cartoon && !happyArcs && eOpen > 0.3;
        e.pup.setAttribute('visibility', showPup ? 'visible' : 'hidden');
        if (showPup) {
          const inward = (1 - fr) * 0.2 - Math.sign(e.cx) * fr * 0.1;
          e.pup.setAttribute('r', f2(rx * 0.44 * (1 - 0.45 * cl((raise - 0.3) / 0.7, 0, 1))));
          e.pup.setAttribute('cx', f2(e.cx + (F.pupX * 0.4 + inward) * rx));
          e.pup.setAttribute('cy', f2(ey + (F.pupY * 0.4 + 0.05) * ry));
        }
      }
      // brows only when they are saying something
      const browOn = Math.abs(F.browTilt) > 0.12 || F.browRaise > 0.4 || Math.abs(F.browSkew || 0) > 0.06;
      const bk = -F.browTilt, skew = (F.browSkew || 0) * 0.2 * r;
      const brow = (e, s, liftBy) => {
        const half = cartoon ? e.rx * 1.0 : 0.2 * r;
        let top = ey - (cartoon ? e.full + 0.06 * r : 0.26 * r) - raise * 0.12 * r - liftBy + Math.max(0, bk) * (cartoon ? 0.18 : 0.03) * r;
        const dy = bk * (cartoon ? 0.18 : 0.1) * r;
        top = Math.max(top, -0.8 * r); // stay on the forehead
        return `M ${f2(e.cx - s * half)} ${f2(top - dy * 0.7)} L ${f2(e.cx + s * half * 0.9)} ${f2(top + dy)}`;
      };
      n.browN.setAttribute('d', brow(eyes[0], 1, skew < 0 ? -skew : 0));
      n.browF.setAttribute('d', brow(eyes[1], 1 - 2 * fr, skew > 0 ? skew : 0));
      n.browN.setAttribute('opacity', browOn ? '1' : '0');
      n.browF.setAttribute('opacity', browOn ? '1' : '0');

      const crying = F.tears > 0.05, tt = F.t || 0;
      for (const [tr, cx, ph] of [[n.tearN, exN, 0], [n.tearF, exF, 0.5]]) {
        tr.setAttribute('visibility', crying ? 'visible' : 'hidden');
        if (crying) {
          const u = ((tt * 1.1 + ph) % 1 + 1) % 1;
          tr.setAttribute('cx', f2(cx)); tr.setAttribute('cy', f2((-0.02 + u * 0.9) * r));
          tr.setAttribute('opacity', (Math.min(1, F.tears) * (1 - u * 0.8)).toFixed(2));
        }
      }
    },
  };
})();
