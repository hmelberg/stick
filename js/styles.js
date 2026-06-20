/* stick — visual styles. Every style renders the same computed skeleton (P from
   computeFigure); a style is just {build(fig,parent), update(nodes,P,t)}.

   ink    — clean minimal stick (the original look)
   sketch — hand-drawn: wobbly lines re-jittered ~7x/sec ("line boil"), sketchy
            head circle, nose, mitten hands, feet. The default.
   toon   — filled "better person": torso shape, neck, shoes, mitten hands. */
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;
  const STICK = (G.STICK = G.STICK || {});

  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, parent) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  };
  const pt = p => p.x.toFixed(2) + ' ' + p.y.toFixed(2);
  const rad = d => (d * Math.PI) / 180;
  // Depth shading for the "far" limbs: faded in side view, but equal to the near
  // side when facing front/back (P.lateral ~ 1) where the limbs are symmetric.
  const farOpacity = (base, P) => {
    const lat = P && P.lateral != null ? P.lateral : 1;
    return (1 - (1 - lat) * (1 - base)).toFixed(3);
  };

  /* ---------------- seeded wobble (deterministic in t — scrub-safe) ---------------- */
  const srand = (i, seed) => {
    const v = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const jit = (i, seed, amp) => (srand(i, seed) - 0.5) * 2 * amp;
  const boilFrame = t => Math.floor(t * 7) % 4; // classic "on fours" boil

  function resample(pts, step) {
    const out = [pts[0]];
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k];
      const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / step));
      for (let j = 1; j <= n; j++) out.push({ x: a.x + ((b.x - a.x) * j) / n, y: a.y + ((b.y - a.y) * j) / n });
    }
    return out;
  }
  function wobble(pts, amp, seed) {
    return pts.map((p, i) => ({ x: p.x + jit(i * 7.3 + 1.7, seed, amp), y: p.y + jit(i * 7.3 + 4.1, seed, amp) }));
  }
  function quadPts(p0, c, p1, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, v = 1 - u;
      out.push({ x: v * v * p0.x + 2 * v * u * c.x + u * u * p1.x, y: v * v * p0.y + 2 * v * u * c.y + u * u * p1.y });
    }
    return out;
  }
  function smoothOpen(pts) {
    if (pts.length < 3) return 'M ' + pts.map(pt).join(' L ');
    let d = 'M ' + pt(pts[0]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
      d += ` Q ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)}`;
    }
    return d + ' L ' + pt(pts[pts.length - 1]);
  }
  function smoothClosed(pts) {
    const n = pts.length;
    let d = `M ${((pts[0].x + pts[1].x) / 2).toFixed(2)} ${((pts[0].y + pts[1].y) / 2).toFixed(2)}`;
    for (let i = 1; i <= n; i++) {
      const p = pts[i % n], q = pts[(i + 1) % n];
      d += ` Q ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${((p.x + q.x) / 2).toFixed(2)} ${((p.y + q.y) / 2).toFixed(2)}`;
    }
    return d + ' Z';
  }
  const polyD = pts => 'M ' + pts.map(pt).join(' L ');

  /* ---------------- shared face ---------------- */
  const EX_N = 0.14, EX_F = 0.52, EY = -0.15; // eye centers, in head radii

  function buildFace(parent, fig, r, opts) {
    const ink = fig.color;
    const fw = 0.09 * r;
    const grp = mk('g', {}, parent); // whole face in one group, so it can fade out toward the back
    const fr = { r, ink, opts, g: grp };
    if (fig.beard) { // drawn first so it sits behind the eyes/mouth; fades with the face toward the back
      const b = fig.beard === 'goatee' || fig.beard === 'stubble' ? fig.beard : 'full';
      const d = b === 'goatee'
        ? `M ${(-0.24 * r).toFixed(2)} ${(0.66 * r).toFixed(2)} Q 0 ${(0.58 * r).toFixed(2)} ${(0.24 * r).toFixed(2)} ${(0.66 * r).toFixed(2)} Q ${(0.3 * r).toFixed(2)} ${(1.04 * r).toFixed(2)} 0 ${(1.1 * r).toFixed(2)} Q ${(-0.3 * r).toFixed(2)} ${(1.04 * r).toFixed(2)} ${(-0.24 * r).toFixed(2)} ${(0.66 * r).toFixed(2)} Z`
        : `M ${(-0.82 * r).toFixed(2)} ${(0.2 * r).toFixed(2)} C ${(-0.92 * r).toFixed(2)} ${(0.74 * r).toFixed(2)} ${(-0.45 * r).toFixed(2)} ${(1.14 * r).toFixed(2)} 0 ${(1.1 * r).toFixed(2)} C ${(0.45 * r).toFixed(2)} ${(1.14 * r).toFixed(2)} ${(0.92 * r).toFixed(2)} ${(0.74 * r).toFixed(2)} ${(0.82 * r).toFixed(2)} ${(0.2 * r).toFixed(2)} Q ${(0.4 * r).toFixed(2)} ${(0.64 * r).toFixed(2)} 0 ${(0.68 * r).toFixed(2)} Q ${(-0.4 * r).toFixed(2)} ${(0.64 * r).toFixed(2)} ${(-0.82 * r).toFixed(2)} ${(0.2 * r).toFixed(2)} Z`;
      fr.beard = mk('path', { d, fill: ink, opacity: b === 'stubble' ? 0.4 : 1 }, grp);
    }
    fr.eyeN = mk('ellipse', { cx: EX_N * r, cy: EY * r, rx: 0.15 * r, fill: ink }, grp);
    fr.eyeF = mk('ellipse', { cx: EX_F * r, cy: EY * r, rx: 0.15 * r, fill: ink }, grp);
    fr.pupN = mk('circle', { r: 0.07 * r, fill: 'var(--paper, #f7f2e9)' }, grp);
    fr.pupF = mk('circle', { r: 0.07 * r, fill: 'var(--paper, #f7f2e9)' }, grp);
    const arc = { stroke: ink, 'stroke-width': fw * 1.6, fill: 'none', 'stroke-linecap': 'round', visibility: 'hidden' };
    fr.arcN = mk('path', arc, grp);
    fr.arcF = mk('path', arc, grp);
    fr.browN = mk('path', { stroke: ink, 'stroke-width': fw * 1.4, fill: 'none', 'stroke-linecap': 'round' }, grp);
    fr.browF = mk('path', { stroke: ink, 'stroke-width': fw * 1.4, fill: 'none', 'stroke-linecap': 'round' }, grp);
    if (opts.nose) {
      fr.nose = mk('path', {
        d: `M ${0.5 * r} ${0.08 * r} Q ${0.78 * r} ${0.18 * r} ${0.55 * r} ${0.32 * r}`,
        stroke: ink, 'stroke-width': fw * 1.2, fill: 'none', 'stroke-linecap': 'round',
      }, grp);
    }
    fr.mouth = mk('path', { stroke: ink, 'stroke-width': fw * 1.5, fill: 'none', 'stroke-linecap': 'round' }, grp);
    fr.mouthO = mk('ellipse', { fill: ink }, grp);
    if (fig.glasses) { // built here (not buildExtras) so the lenses track the eyes as the face turns
      const gl = { stroke: ink, 'stroke-width': fw, fill: 'none' };
      fr.glassN = mk('circle', { r: 0.27 * r, ...gl }, grp);
      fr.glassF = mk('circle', { r: 0.27 * r, ...gl }, grp);
      fr.glBridge = mk('path', gl, grp);
      fr.glTemple = mk('path', gl, grp);
      fr.glTemple2 = mk('path', gl, grp);
    }
    return fr;
  }

  function updateFace(fr, F, bs) {
    const r = fr.r;
    // turn the 3/4 face toward a symmetric front face as F.front -> 1
    const front = F.front || 0;
    if (fr.g) { fr.g.setAttribute('opacity', (F.show == null ? 1 : F.show).toFixed(2)); if (F.show <= 0.01) return; } // blank by the back
    const cxN = EX_N + (-0.30 - EX_N) * front;
    const cxF = EX_F + (0.30 - EX_F) * front;
    const happyArcs = F.smile > 0.65 && F.eyeOpen > 0.72;
    const ry = Math.max(0.022 * r, 0.19 * r * F.eyeOpen);
    for (const [eye, cx] of [[fr.eyeN, cxN], [fr.eyeF, cxF]]) {
      eye.setAttribute('cx', (cx * r).toFixed(3));
      eye.setAttribute('ry', ry.toFixed(3));
      eye.setAttribute('visibility', happyArcs ? 'hidden' : 'visible');
    }
    for (const [arc, cx] of [[fr.arcN, cxN], [fr.arcF, cxF]]) {
      arc.setAttribute('visibility', happyArcs ? 'visible' : 'hidden');
      if (happyArcs) {
        const c = cx * r;
        arc.setAttribute('d', `M ${(c - 0.16 * r).toFixed(2)} ${(-0.06 * r).toFixed(2)} Q ${c.toFixed(2)} ${(-0.34 * r).toFixed(2)} ${(c + 0.16 * r).toFixed(2)} ${(-0.06 * r).toFixed(2)}`);
      }
    }
    const showPup = !happyArcs && F.eyeOpen > 0.35;
    for (const [pup, cx] of [[fr.pupN, cxN], [fr.pupF, cxF]]) {
      pup.setAttribute('visibility', showPup ? 'visible' : 'hidden');
      if (showPup) {
        pup.setAttribute('cx', (cx * r + (1 - front) * 0.02 * r + F.pupX * 0.055 * r).toFixed(3));
        pup.setAttribute('cy', (EY * r + F.pupY * 0.05 * r).toFixed(3));
      }
    }
    const by = -0.46 * r - F.browRaise * 0.16 * r + (bs ? jit(3, bs, 0.015 * r) : 0);
    const k = -F.browTilt * 0.1 * r;
    const brow = cx => `M ${(cx - 0.17 * r).toFixed(3)} ${(by - k).toFixed(3)} L ${(cx + 0.17 * r).toFixed(3)} ${(by + k).toFixed(3)}`;
    fr.browN.setAttribute('d', brow(cxN * r));
    fr.browF.setAttribute('d', brow(cxF * r));
    if (fr.glassN) { // lenses over the (moving) eyes; bridge across the nose; a temple to each ear
      const lensR = 0.27 * r, ey = EY * r, xn = cxN * r, xf = cxF * r;
      fr.glassN.setAttribute('cx', xn.toFixed(2)); fr.glassN.setAttribute('cy', ey.toFixed(2));
      fr.glassF.setAttribute('cx', xf.toFixed(2)); fr.glassF.setAttribute('cy', ey.toFixed(2));
      const lo = Math.min(xn, xf), hi = Math.max(xn, xf);
      const ty = (ey - 0.03 * r).toFixed(2), ear = (-0.34 * r).toFixed(2);
      fr.glBridge.setAttribute('d', `M ${(lo + lensR).toFixed(2)} ${ey.toFixed(2)} L ${(hi - lensR).toFixed(2)} ${ey.toFixed(2)}`);
      // temple to the far (+x) ear is always visible; the near (−x) temple shows
      // only toward the front (it'd be hidden behind the head in a 3/4 view)
      fr.glTemple.setAttribute('d', `M ${(hi + lensR).toFixed(2)} ${ty} L ${(0.95 * r).toFixed(2)} ${ear}`);
      fr.glTemple2.setAttribute('d', `M ${(lo - lensR).toFixed(2)} ${ty} L ${(-0.95 * r).toFixed(2)} ${ear}`);
      fr.glTemple2.setAttribute('opacity', front.toFixed(2));
    }
    if (fr.nose) fr.nose.setAttribute('opacity', (1 - front).toFixed(2)); // nose is a profile feature

    const mx = (0.36 - 0.36 * front) * r, my = 0.48 * r, hw = 0.28 * r;
    const mj = bs ? jit(9, bs, 0.02 * r) : 0;
    fr.mouth.setAttribute('d', `M ${(mx - hw).toFixed(3)} ${my.toFixed(3)} Q ${(mx + mj).toFixed(3)} ${(my + F.smile * 0.36 * r + mj).toFixed(3)} ${(mx + hw).toFixed(3)} ${my.toFixed(3)}`);
    // The open-mouth oval replaces the lip line at the SAME spot (it used to sit
    // below it, reading as a second mouth). Fade the line out as the mouth opens.
    fr.mouth.setAttribute('opacity', Math.max(0, Math.min(1, 1 - F.mouthOpen * 1.6)).toFixed(2));
    if (F.mouthOpen > 0.06) {
      fr.mouthO.setAttribute('visibility', 'visible');
      fr.mouthO.setAttribute('cx', mx.toFixed(3));
      fr.mouthO.setAttribute('cy', (my + 0.05 * r).toFixed(3));
      fr.mouthO.setAttribute('rx', (0.12 * r).toFixed(3));
      fr.mouthO.setAttribute('ry', (0.16 * r * F.mouthOpen).toFixed(3));
    } else { fr.mouthO.setAttribute('visibility', 'hidden'); }
  }

  /* ---------------- shared hair / hat / glasses ---------------- */
  // long hair: a strand down each side of the head, the tip flicking outward in a curl.
  function longStrand(sx, r) {
    return `M ${(sx * 0.28 * r).toFixed(2)} ${(-1.0 * r).toFixed(2)}`
      + ` Q ${(sx * 1.2 * r).toFixed(2)} ${(-0.5 * r).toFixed(2)} ${(sx * 1.0 * r).toFixed(2)} ${(0.72 * r).toFixed(2)}`
      + ` Q ${(sx * 0.95 * r).toFixed(2)} ${(1.36 * r).toFixed(2)} ${(sx * 1.42 * r).toFixed(2)} ${(1.12 * r).toFixed(2)}`;
  }

  function hairStroke(fig, r, parent, ink) {
    const stroke = { stroke: ink, 'stroke-width': 0.16 * r, fill: 'none', 'stroke-linecap': 'round' };
    const style = fig.hair;
    if (style === 'short' || style === 'spiky') {
      const spiky = style === 'spiky'; // 'short' is a small, close-cropped suggestion; 'spiky' stays bold
      let d = '';
      for (let k = 0; k <= 6; k++) {
        const th = rad(148 - k * (116 / 6));
        const R = r * (k % 2 ? (spiky ? 1.24 : 1.06) : 0.99);
        d += (k ? 'L' : 'M') + ` ${(Math.cos(th) * R).toFixed(2)} ${(-Math.sin(th) * R).toFixed(2)} `;
      }
      mk('path', { d, ...stroke }, parent);
    } else if (style === 'tuft' || style === 'curly') {
      mk('path', {
        d: `M ${0.05 * r} ${-1.02 * r} Q ${-0.1 * r} ${-1.5 * r} ${0.4 * r} ${-1.42 * r} Q ${0.15 * r} ${-1.36 * r} ${0.22 * r} ${-1.06 * r}`,
        ...stroke,
      }, parent);
    } else if (style === 'long') {
      for (const sx of [-1, 1]) mk('path', { d: longStrand(sx, r), ...stroke }, parent);
    } else if (style === 'bun') {
      mk('circle', { cx: -0.8 * r, cy: -0.62 * r, r: 0.3 * r, fill: ink }, parent);
    } else if (style === 'sides') {
      // balding head: short hair low on BOTH sides (by the ears) + a small top wisp.
      // (Previously a single dark blob that looked like a spot/mic on the cheek.)
      for (const sx of [-1, 1]) {
        mk('path', { d: `M ${(sx * 0.9 * r).toFixed(2)} ${(-0.35 * r).toFixed(2)} Q ${(sx * 1.16 * r).toFixed(2)} ${(0.02 * r).toFixed(2)} ${(sx * 0.8 * r).toFixed(2)} ${(0.42 * r).toFixed(2)}`, ...stroke }, parent);
      }
      mk('path', { d: `M ${-0.12 * r} ${-1.05 * r} Q 0 ${-1.32 * r} ${0.2 * r} ${-1.12 * r}`, ...stroke }, parent);
    }
  }

  function hairToon(fig, r, parent, ink) {
    const style = fig.hair;
    if (style === 'short' || style === 'spiky') {
      const oR = style === 'spiky' ? 1.16 : 1.05; // 'short' is a thin close cap
      const outer = [], inner = [];
      for (let k = 0; k <= 6; k++) {
        const th = rad(160 - k * (140 / 6));
        outer.push({ x: Math.cos(th) * r * oR, y: -Math.sin(th) * r * oR });
        inner.unshift({ x: Math.cos(th) * r * 0.9, y: -Math.sin(th) * r * 0.9 });
      }
      mk('path', { d: smoothClosed(outer.concat(inner)), fill: ink }, parent);
    } else if (style === 'long') {
      const outer = [], inner = [];
      for (let k = 0; k <= 6; k++) {
        const th = rad(180 - k * (180 / 6));
        outer.push({ x: Math.cos(th) * r * 1.12, y: -Math.sin(th) * r * 1.12 });
        inner.unshift({ x: Math.cos(th) * r * 0.82, y: -Math.sin(th) * r * 0.82 });
      }
      mk('path', { d: smoothClosed(outer.concat(inner)), fill: ink }, parent); // hair cap over the top
      for (const sx of [-1, 1]) mk('path', { d: longStrand(sx, r), stroke: ink, 'stroke-width': 0.3 * r, fill: 'none', 'stroke-linecap': 'round' }, parent);
    } else if (style === 'tuft' || style === 'curly') {
      mk('path', {
        d: `M ${0.05 * r} ${-1.02 * r} Q ${-0.1 * r} ${-1.5 * r} ${0.4 * r} ${-1.42 * r} Q ${0.15 * r} ${-1.36 * r} ${0.22 * r} ${-1.06 * r}`,
        stroke: ink, 'stroke-width': 0.2 * r, fill: 'none', 'stroke-linecap': 'round',
      }, parent);
    } else {
      hairStroke(fig, r, parent, ink);
    }
  }

  function buildExtras(parent, fig, r, ink, faceGrp) {
    // glasses are built inside buildFace now (so the lenses track the eyes)
    if (fig.hat === 'fedora') {
      mk('path', { d: `M ${-1.25 * r} ${-0.55 * r} L ${1.05 * r} ${-0.55 * r}`, stroke: ink, 'stroke-width': 0.16 * r, 'stroke-linecap': 'round', fill: 'none' }, parent);
      mk('path', { d: `M ${-0.7 * r} ${-0.58 * r} L ${-0.58 * r} ${-1.3 * r} Q 0 ${-1.44 * r} ${0.5 * r} ${-1.28 * r} L ${0.62 * r} ${-0.58 * r} Z`, fill: ink }, parent);
    }
  }

  /* ---------------- mitten hands (fist / open / point / spread) ---------------- */
  function buildHand(parent, g, ink) {
    const h = g.h, hw = 0.022 * h;
    const grp = mk('g', {}, parent);
    const hr = { grp };
    hr.dot = mk('circle', { cx: 0.012 * h, cy: 0, r: 0.03 * h, fill: ink }, grp);
    hr.blob = mk('ellipse', { cx: 0.03 * h, cy: 0, rx: 0.048 * h, ry: 0.036 * h, fill: 'var(--paper, #f7f2e9)', stroke: ink, 'stroke-width': hw }, grp);
    hr.fist = mk('circle', { cx: 0.02 * h, cy: 0, r: 0.04 * h, fill: ink }, grp);
    hr.finger = mk('path', { d: `M ${0.045 * h} 0 L ${0.125 * h} 0`, stroke: ink, 'stroke-width': hw * 1.4, 'stroke-linecap': 'round', fill: 'none' }, grp);
    let spread = '';
    for (const a of [-32, 0, 32]) {
      spread += `M ${0.045 * h} 0 L ${(0.045 * h + Math.cos(rad(a)) * 0.06 * h).toFixed(2)} ${(Math.sin(rad(a)) * 0.06 * h).toFixed(2)} `;
    }
    hr.spread = mk('path', { d: spread, stroke: ink, 'stroke-width': hw * 1.2, 'stroke-linecap': 'round', fill: 'none' }, grp);
    return hr;
  }

  function updateHand(hr, elb, hand, shape) {
    const ang = (Math.atan2(hand.y - elb.y, hand.x - elb.x) * 180) / Math.PI;
    hr.grp.setAttribute('transform', `translate(${hand.x.toFixed(2)} ${hand.y.toFixed(2)}) rotate(${ang.toFixed(1)})`);
    const s = ['fist', 'point', 'spread', 'open'].includes(shape) ? shape : 'relaxed';
    hr.dot.setAttribute('visibility', s === 'relaxed' ? 'visible' : 'hidden');
    hr.blob.setAttribute('visibility', s === 'open' || s === 'point' || s === 'spread' ? 'visible' : 'hidden');
    hr.fist.setAttribute('visibility', s === 'fist' ? 'visible' : 'hidden');
    hr.finger.setAttribute('visibility', s === 'point' ? 'visible' : 'hidden');
    hr.spread.setAttribute('visibility', s === 'spread' ? 'visible' : 'hidden');
  }

  function neckStub(P) {
    const d = { x: P.headC.x - P.neck.x, y: P.headC.y - P.neck.y };
    const l = Math.hypot(d.x, d.y) || 1;
    const stub = Math.max(0, l - P.g.headR);
    return { x: P.neck.x + (d.x / l) * stub, y: P.neck.y + (d.y / l) * stub };
  }

  // For a "bust" figure (head + neck + arms only): a short stub just below the
  // shoulders that the collar tapers to, so the head/arms read as a floating bust.
  function bustBase(P) {
    return { x: P.sh.x + (P.pelvis.x - P.sh.x) * 0.32, y: P.sh.y + (P.pelvis.y - P.sh.y) * 0.32 };
  }
  const isBust = n => n.fig && n.fig.body === 'bust';

  const setTf = (n, P) =>
    n.setAttribute('transform', `translate(${P.x.toFixed(2)} ${P.y.toFixed(2)}) scale(${P.fc} 1) rotate(${P.rot.toFixed(2)})`);
  const headTf = (n, P) =>
    n.setAttribute('transform', `translate(${P.headC.x.toFixed(2)} ${P.headC.y.toFixed(2)}) rotate(${P.headA.toFixed(2)})`);

  STICK.styles = {};

  /* ================================ ink ================================ */
  STICK.styles.ink = {
    build(fig, parent) {
      const g = STICK.geom(fig);
      const r = g.headR, ink = fig.color, w = g.stroke;
      const root = mk('g', { class: 'fig' }, parent);
      const limb = { stroke: ink, 'stroke-width': w, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
      const n = { fig, g };
      const farG = mk('g', { opacity: 0.62 }, root);
      n.farG = farG;
      n.far = mk('path', { ...limb, 'stroke-width': w * 0.9 }, farG);
      n.torso = mk('path', limb, root);
      n.head = mk('circle', { r, fill: 'var(--paper, #f7f2e9)', stroke: ink, 'stroke-width': w * 0.85 }, root);
      n.headG = mk('g', {}, root);
      hairStroke(fig, r, n.headG, ink);
      n.face = buildFace(n.headG, fig, r, { nose: false });
      buildExtras(n.headG, fig, r, ink, n.face.g);
      n.near = mk('path', limb, root);
      n.root = root;
      return n;
    },
    update(n, P) {
      setTf(n.root, P);
      n.farG.setAttribute('opacity', farOpacity(0.62, P));
      const bust = isBust(n);
      const legD = l => `M ${pt(P.pelvis)} L ${pt(l.knee)} L ${pt(l.ank)} L ${pt(l.foot)}`;
      const armD = a => `M ${pt(P.sh)} L ${pt(a.elb)} L ${pt(a.hand)}`;
      n.far.setAttribute('d', (bust ? '' : legD(P.legL) + ' ') + armD(P.armL));
      n.near.setAttribute('d', (bust ? '' : legD(P.legR) + ' ') + armD(P.armR));
      n.torso.setAttribute('d', bust
        ? `M ${pt(bustBase(P))} L ${pt(P.neck)} L ${pt(neckStub(P))}`
        : `M ${pt(P.pelvis)} Q ${pt(P.ctrl)} ${pt(P.neck)} L ${pt(neckStub(P))}`);
      n.head.setAttribute('cx', P.headC.x.toFixed(2));
      n.head.setAttribute('cy', P.headC.y.toFixed(2));
      headTf(n.headG, P);
      updateFace(n.face, P.face, 0);
    },
  };

  /* =============================== sketch =============================== */
  STICK.styles.sketch = {
    build(fig, parent) {
      const g = STICK.geom(fig);
      const r = g.headR, ink = fig.color;
      const w = g.stroke * (0.92 + 0.2 * srand(1, fig.seed));
      const root = mk('g', { class: 'fig' }, parent);
      const limb = { stroke: ink, 'stroke-width': w, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
      const n = { fig, g, w };
      const farG = mk('g', { opacity: 0.6 }, root);
      n.farG = farG;
      n.far = mk('path', { ...limb, 'stroke-width': w * 0.85 }, farG);
      n.shoeL = mk('path', { ...limb, 'stroke-width': w * 1.15 }, farG);
      n.handL = buildHand(farG, g, ink);
      n.torso = mk('path', limb, root);
      n.headFill = mk('path', { fill: 'var(--paper, #f7f2e9)', stroke: 'none' }, root);
      n.headStroke = mk('path', { ...limb, 'stroke-width': w * 0.85 }, root);
      n.headStroke2 = mk('path', { ...limb, 'stroke-width': w * 0.45, opacity: 0.35 }, root);
      n.headG = mk('g', {}, root);
      hairStroke(fig, r, n.headG, ink);
      n.face = buildFace(n.headG, fig, r, { nose: true });
      buildExtras(n.headG, fig, r, ink, n.face.g);
      n.near = mk('path', limb, root);
      n.shoeR = mk('path', { ...limb, 'stroke-width': w * 1.15 }, root);
      n.handR = buildHand(root, g, ink);
      n.root = root;
      return n;
    },
    update(n, P, t) {
      const g = P.g, r = g.headR;
      const frame = boilFrame(t == null ? 0 : t);
      const sd = n.fig.seed * 53 + frame * 101;
      const amp = 0.009 * g.h;
      setTf(n.root, P);
      n.farG.setAttribute('opacity', farOpacity(0.6, P));

      const bust = isBust(n);
      const limbD = (pts, salt) => smoothOpen(wobble(resample(pts, 0.075 * g.h), amp, sd + salt));
      n.far.setAttribute('d',
        (bust ? '' : limbD([P.pelvis, P.legL.knee, P.legL.ank], 11) + ' ') +
        limbD([P.sh, P.armL.elb, P.armL.hand], 23));
      n.near.setAttribute('d',
        (bust ? '' : limbD([P.pelvis, P.legR.knee, P.legR.ank], 37) + ' ') +
        limbD([P.sh, P.armR.elb, P.armR.hand], 47));

      const torsoPts = bust ? [bustBase(P), P.neck] : quadPts(P.pelvis, P.ctrl, P.neck, 6);
      torsoPts.push(neckStub(P));
      n.torso.setAttribute('d', smoothOpen(wobble(torsoPts, amp, sd + 61)));

      // sketchy head: closed fill + overshooting wobbly outline + faint second pass
      const N = 13;
      const fillPts = [], strokePts = [];
      const th0 = rad(-70 + jit(2, n.fig.seed, 14));
      for (let k = 0; k <= N + 1; k++) {
        const th = th0 + (k / N) * Math.PI * 2 * 1.045;
        const rr = r * (1 + jit(k * 3.1 + frame * 7, sd + 5, 0.045));
        const p = { x: P.headC.x + Math.cos(th) * rr, y: P.headC.y + Math.sin(th) * rr };
        if (k <= N) fillPts.push(p);
        strokePts.push(p);
      }
      n.headFill.setAttribute('d', polyD(fillPts) + ' Z');
      n.headStroke.setAttribute('d', smoothOpen(strokePts));
      const stroke2 = strokePts.map((p, i) => ({ x: p.x + jit(i * 5 + 2, sd + 71, 0.035 * r), y: p.y + jit(i * 5 + 3, sd + 71, 0.035 * r) }));
      n.headStroke2.setAttribute('d', smoothOpen(stroke2));

      headTf(n.headG, P);
      updateFace(n.face, P.face, sd + 83);

      const shoe = (l, salt) => { // heel just behind the ankle to the (pitched) toe
        const vx = l.foot.x - l.ank.x, vy = l.foot.y - l.ank.y;
        return smoothOpen(wobble([
          { x: l.ank.x - vx * 0.28, y: l.ank.y - vy * 0.28 },
          { x: l.foot.x, y: l.foot.y },
        ], amp * 0.7, sd + salt));
      };
      n.shoeL.setAttribute('d', bust ? '' : shoe(P.legL, 91));
      n.shoeR.setAttribute('d', bust ? '' : shoe(P.legR, 97));

      updateHand(n.handL, P.armL.elb, P.armL.hand, P.hands.L);
      updateHand(n.handR, P.armR.elb, P.armR.hand, P.hands.R);
    },
  };

  /* ================================ toon ================================ */
  STICK.styles.toon = {
    build(fig, parent) {
      const g = STICK.geom(fig);
      const r = g.headR, ink = fig.color, w = g.stroke;
      const root = mk('g', { class: 'fig' }, parent);
      const limb = { stroke: ink, 'stroke-width': w * 1.05, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
      const n = { fig, g };
      const farG = mk('g', { opacity: 0.78 }, root);
      n.farG = farG;
      n.farLeg = mk('path', limb, farG);
      n.shoeL = mk('ellipse', { fill: ink }, farG);
      n.farArm = mk('path', limb, farG);
      n.handL = buildHand(farG, g, ink);
      n.torsoFill = mk('path', { fill: fig.bodyColor, stroke: ink, 'stroke-width': w * 0.6, 'stroke-linejoin': 'round' }, root);
      n.neckLine = mk('path', { ...limb, 'stroke-width': w * 0.8 }, root);
      n.nearLeg = mk('path', limb, root);
      n.shoeR = mk('ellipse', { fill: ink }, root);
      n.head = mk('circle', { r, fill: 'var(--paper, #f7f2e9)', stroke: ink, 'stroke-width': w * 0.8 }, root);
      n.headG = mk('g', {}, root);
      hairToon(fig, r, n.headG, ink);
      n.face = buildFace(n.headG, fig, r, { nose: true });
      buildExtras(n.headG, fig, r, ink, n.face.g);
      n.nearArm = mk('path', limb, root);
      n.handR = buildHand(root, g, ink);
      n.root = root;
      return n;
    },
    update(n, P) {
      const g = P.g;
      setTf(n.root, P);
      n.farG.setAttribute('opacity', farOpacity(0.78, P));
      const bust = isBust(n);
      const base = bust ? bustBase(P) : P.pelvis; // bust torso starts below the shoulders

      // torso: rounded shape from hips (or bust base) to shoulders
      const v = { x: P.neck.x - base.x, y: P.neck.y - base.y };
      const vl = Math.hypot(v.x, v.y) || 1;
      const px = v.y / vl, py = -v.x / vl; // lateral unit
      const mid = { x: (base.x + P.sh.x) / 2 + (P.ctrl.x - (base.x + P.neck.x) / 2) * 0.6, y: (base.y + P.sh.y) / 2 + (P.ctrl.y - (base.y + P.neck.y) / 2) * 0.6 };
      const hipHW = (bust ? 0.085 : 0.1) * g.h, midHW = 0.12 * g.h, shHW = 0.135 * g.h;
      const C = (b, hw) => ({ x: b.x + px * hw, y: b.y + py * hw });
      const D = (b, hw) => ({ x: b.x - px * hw, y: b.y - py * hw });
      n.torsoFill.setAttribute('d', smoothClosed([
        C(base, hipHW), C(mid, midHW), C(P.sh, shHW),
        { x: P.sh.x + v.x / vl * 0.03 * g.h, y: P.sh.y + v.y / vl * 0.03 * g.h },
        D(P.sh, shHW), D(mid, midHW), D(base, hipHW),
      ]));
      n.neckLine.setAttribute('d', `M ${pt(P.sh)} L ${pt(neckStub(P))}`);

      const legD = (l, off) => `M ${(P.pelvis.x + off).toFixed(2)} ${P.pelvis.y.toFixed(2)} L ${pt(l.knee)} L ${pt(l.ank)}`;
      n.farLeg.setAttribute('d', bust ? '' : legD(P.legL, -0.035 * g.h));
      n.nearLeg.setAttribute('d', bust ? '' : legD(P.legR, 0.035 * g.h));
      const shoe = (el, l) => { // ellipse aligned to the (pitched) foot direction
        if (bust) { el.setAttribute('visibility', 'hidden'); return; }
        el.setAttribute('visibility', 'visible');
        const vx = l.foot.x - l.ank.x, vy = l.foot.y - l.ank.y;
        const ang = Math.atan2(vy, vx) * 180 / Math.PI;
        const cx = l.ank.x + vx * 0.5, cy = l.ank.y + vy * 0.5 + 0.012 * g.h;
        el.setAttribute('cx', 0); el.setAttribute('cy', 0);
        el.setAttribute('rx', (0.078 * g.h).toFixed(2));
        el.setAttribute('ry', (0.038 * g.h).toFixed(2));
        el.setAttribute('transform', `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${ang.toFixed(1)})`);
      };
      shoe(n.shoeL, P.legL);
      shoe(n.shoeR, P.legR);

      const armD = a => `M ${pt(P.sh)} L ${pt(a.elb)} L ${pt(a.hand)}`;
      n.farArm.setAttribute('d', armD(P.armL));
      n.nearArm.setAttribute('d', armD(P.armR));

      n.head.setAttribute('cx', P.headC.x.toFixed(2));
      n.head.setAttribute('cy', P.headC.y.toFixed(2));
      headTf(n.headG, P);
      updateFace(n.face, P.face, 0);

      updateHand(n.handL, P.armL.elb, P.armL.hand, P.hands.L);
      updateHand(n.handR, P.armR.elb, P.armR.hand, P.hands.R);
    },
  };
})();
