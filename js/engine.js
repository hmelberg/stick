/* stick — engine core: easing, duration parsing, channel store, compiler.
   The whole animation is a pure function of time: compile(json) builds
   tween tracks on named channels; rendering samples them at t. */
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;
  const STICK = (G.STICK = G.STICK || {});
  const DUR = STICK.DUR;

  const EASE = {
    linear: u => u,
    in: u => u * u * u,
    out: u => 1 - Math.pow(1 - u, 3),
    inOut: u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    sine: u => 0.5 - 0.5 * Math.cos(Math.PI * u),
    backOut: u => { const c = 1.9; const v = u - 1; return 1 + v * v * ((c + 1) * v + c); },
  };
  STICK.EASE = EASE;

  STICK.lerp = (a, b, u) => a + (b - a) * u;
  STICK.clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  /* "slow" | 1.25 | "1.25" -> seconds */
  STICK.parseDur = function (d, fallback, warn) {
    if (d == null) return fallback;
    if (typeof d === 'number' && isFinite(d)) return Math.max(0.02, d);
    if (typeof d === 'string') {
      if (DUR[d] != null) return DUR[d];
      const n = parseFloat(d);
      if (!isNaN(n)) return Math.max(0.02, n);
    }
    if (warn) warn(`unknown duration "${d}" — using default`);
    return fallback;
  };

  class Channels {
    constructor() { this.m = new Map(); }
    ensure(name, base) {
      let c = this.m.get(name);
      if (!c) { c = { base: base !== undefined ? base : 0, tracks: [] }; this.m.set(name, c); }
      return c;
    }
    setBase(name, v) { this.ensure(name, v).base = v; }
    has(name) { return this.m.has(name); }
    tween(name, t0, dur, to, ease) {
      const c = this.ensure(name);
      const tr = { t0, t1: t0 + Math.max(dur, 0.02), to, ease: ease || EASE.inOut, step: false, from: null };
      tr.from = this._val(c, t0, c.tracks.length); // eager; recomputed in finalize
      c.tracks.push(tr);
    }
    set(name, t0, v) {
      const c = this.ensure(name);
      c.tracks.push({ t0, t1: t0, to: v, step: true, from: v });
    }
    finalize() {
      for (const c of this.m.values()) {
        c.tracks.sort((a, b) => a.t0 - b.t0 || a.t1 - b.t1);
        for (let i = 0; i < c.tracks.length; i++) {
          const tr = c.tracks[i];
          if (!tr.step) tr.from = this._val(c, tr.t0, i);
        }
      }
    }
    _val(c, t, n) {
      let v = c.base;
      for (let i = 0; i < n; i++) {
        const tr = c.tracks[i];
        if (tr.step) { if (t >= tr.t0) v = tr.to; continue; }
        if (t >= tr.t1) { v = tr.to; continue; }
        if (t > tr.t0 && tr.from != null) {
          if (typeof tr.from === 'number' && typeof tr.to === 'number') {
            const u = (t - tr.t0) / (tr.t1 - tr.t0);
            v = STICK.lerp(tr.from, tr.to, tr.ease(u));
          } else v = tr.to;
        }
      }
      return v;
    }
    get(name, t) {
      const c = this.m.get(name);
      if (!c) return 0;
      return this._val(c, t, c.tracks.length);
    }
    getDef(name, t, def) {
      const c = this.m.get(name);
      if (!c) return def;
      const v = this._val(c, t, c.tracks.length);
      return v == null ? def : v;
    }
  }
  STICK.Channels = Channels;

  /* ---------------- stage view (aspect) ----------------
     The world is always 100 units tall at x/y 0..100. Landscape (aspect > 1) keeps the
     vertical extent 0..100 and widens horizontally around x=50 (16:9 -> x -38.9..138.9).
     Portrait (aspect < 1) keeps the horizontal extent 0..100 and extends vertically
     around y=50 (9:16 -> y -38.9..138.9). The view centre is always (50,50). */
  const ASPECTS = { '1:1': 1, '16:9': 16 / 9, '4:3': 4 / 3, '9:16': 9 / 16, '3:4': 3 / 4, '21:9': 21 / 9 };
  STICK.makeView = function (aspect, warn) {
    let a = 1;
    if (aspect != null && aspect !== '1:1') {
      if (typeof aspect === 'number' && isFinite(aspect)) a = aspect;
      else if (typeof aspect === 'string' && ASPECTS[aspect.trim()] != null) a = ASPECTS[aspect.trim()];
      else if (typeof aspect === 'string' && /^\d+(\.\d+)?:\d+(\.\d+)?$/.test(aspect.trim())) { const [w, h] = aspect.trim().split(':').map(Number); a = h > 0 ? w / h : NaN; }
      else a = NaN;
      if (!(a >= 0.4 && a <= 2.5)) { if (warn) warn(`unknown scene.aspect ${JSON.stringify(aspect)} — using 1:1 (try "16:9", "4:3", "9:16")`); a = 1; }
    }
    return a >= 1
      ? { x: 50 - 50 * a, y: 0, w: 100 * a, h: 100, aspect: a }
      : { x: 0, y: 50 - 50 / a, w: 100, h: 100 / a, aspect: a };
  };

  /* World-space rect {x,y,w,h} visible through the camera at time t
     (ignores tilt and shake). Use it to keep overlays on screen. */
  STICK.visibleRect = function (rt, t) {
    const v = rt.view || { x: 0, y: 0, w: 100, h: 100 };
    const z = rt.ch.getDef('cam.z', t, 1) || 1;
    const cx = rt.ch.getDef('cam.x', t, 50), cy = rt.ch.getDef('cam.y', t, 50);
    const w = v.w / z, h = v.h / z;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  };

  /* Default auto-framing: with no camera commands anywhere in the timeline, set a STATIC
     camera (base of cam.x/y/z) that frames everything that is ever on stage. Zooms in only
     (z >= 1, capped); anything it cannot measure counts as full-frame (=> no zoom). */
  const AF = { zMax: 2.3, zMin: 1.08, padX: 5, padTop: 3, padBottom: 5, captionFrac: 0.12 };
  function autoFrame(rt) {
    const sc = rt.doc.scene;
    if (rt.usesCamera || (sc && sc.autoFrame === false) || rt.scene.parallax) return null;
    for (const [k, c] of rt.ch.m) if (k.indexOf('cam.') === 0 && c.tracks.length) return null;
    let B = null;
    const add = (x0, y0, x1, y1) => {
      if (!B) B = { x0, y0, x1, y1 };
      else { if (x0 < B.x0) B.x0 = x0; if (y0 < B.y0) B.y0 = y0; if (x1 > B.x1) B.x1 = x1; if (y1 > B.y1) B.y1 = y1; }
    };
    const addB = b => add(b.x0, b.y0, b.x1, b.y1);

    // static things: scenery of every backdrop, boards
    for (const bd of rt.backdrops) for (const el of bd.scene.elements) {
      const b = STICK.elementBounds(el);
      if (!b) return null;
      addB(b);
    }
    for (const bo of rt.boards.values()) add(bo.rect.x, bo.rect.y, bo.rect.x + bo.rect.w, bo.rect.y + bo.rect.h);
    const objB = new Map();
    for (const o of rt.objs.values()) {
      let b = STICK.elementBounds({ type: o.shape, props: o.props });
      if (!b) {
        // an unmeasurable shape blocks zooming — except small held props (library items),
        // which only matter where they sit when put down: use a box around the pivot
        if (!rt.grips.some(g => g.obj === o.id)) return null;
        b = { x0: o.pivot.x - 5, y0: o.pivot.y - 5, x1: o.pivot.x + 5, y1: o.pivot.y + 5 };
      }
      objB.set(o.id, b);
    }

    // sample times: regular steps plus the middle/ends of every overlay
    const times = [];
    const n = Math.max(24, Math.min(300, Math.ceil(rt.duration / 0.2)));
    for (let i = 0; i <= n; i++) times.push((rt.duration * i) / n);
    for (const o of rt.overlays) times.push(o.t0 + 0.05, (o.t0 + o.t1) / 2, o.t1 - 0.05);
    let caption = false;
    for (const o of rt.overlays) if (o.type === 'caption') caption = true;

    for (const t of times) {
      if (t < 0 || t > rt.duration) continue;
      for (const fig of rt.figs.values()) {
        const fb = STICK.figureBounds(rt, fig.id, t);
        if (!fb) continue;
        add(fb.x, fb.y - 2, fb.x + fb.w, fb.y + fb.h);
        const P = STICK.computeFigure(rt, fig, t);
        const hd = P.world.head, r = P.g.headR, fc = P.fc || 0;
        for (const o of rt.overlays) {
          if (o.fig !== fig.id || t < o.t0 || t > o.t1) continue;
          if (o.type === 'emote') { add(hd.x - 4, hd.y - r * 2.4 - 6.5, hd.x + 4, hd.y); continue; }
          if (o.type !== 'say' && o.type !== 'think') continue;
          const len = String(o.text || '').length;
          const lines = Math.max(1, Math.min(3, Math.ceil(len / 17)));
          const think = o.type === 'think';
          const w = Math.min(len, 20) * 1.3 + (think ? 4 : 3) + (think ? 3.2 : 0);
          const h = lines * 3.125 + (think ? 3 : 2.2) + (think ? 4 : 0);
          const top = hd.y - r * 1.6 - h - (think ? 3.4 : 2.6);
          const bx = hd.x + fc * 4;
          add(bx - w / 2, top, bx + w / 2, hd.y);
        }
      }
      for (const o of rt.objs.values()) {
        const grips = rt.grips.filter(g => g.obj === o.id);
        if (grips.some(g => t >= g.t0 && t < g.t1)) continue; // follows a hand: the figure's bounds cover it
        if (grips.length && t < Math.min(...grips.map(g => g.t0))) continue; // not picked up yet
        if (rt.ch.getDef(o.id + '.opacity', t, 1) < 0.01) continue;
        const b = objB.get(o.id);
        const tx = rt.ch.getDef(o.id + '.tx', t, 0), ty = rt.ch.getDef(o.id + '.ty', t, 0);
        const s = rt.ch.getDef(o.id + '.scale', t, 1) || 1, rot = rt.ch.getDef(o.id + '.rot', t, 0);
        const px = o.pivot.x, py = o.pivot.y;
        let x0 = px + (b.x0 - px) * s, x1 = px + (b.x1 - px) * s, y0 = py + (b.y0 - py) * s, y1 = py + (b.y1 - py) * s;
        if (x0 > x1) [x0, x1] = [x1, x0];
        if (y0 > y1) [y0, y1] = [y1, y0];
        if (rot) { // rotated: circumscribe around the pivot
          const R = Math.max(Math.hypot(x0 - px, y0 - py), Math.hypot(x1 - px, y0 - py), Math.hypot(x0 - px, y1 - py), Math.hypot(x1 - px, y1 - py));
          x0 = px - R; x1 = px + R; y0 = py - R; y1 = py + R;
        }
        add(x0 + tx, y0 + ty, x1 + tx, y1 + ty);
      }
    }
    if (!B || ![B.x0, B.y0, B.x1, B.y1].every(isFinite)) return null;

    const v = rt.view, cap = caption ? AF.captionFrac : 0;
    const cw = B.x1 - B.x0 + 2 * AF.padX, chh = B.y1 - B.y0 + AF.padTop + AF.padBottom;
    let z = Math.min(v.w / cw, (v.h * (1 - cap)) / chh);
    if (!(z >= AF.zMin)) return null;
    z = Math.min(z, AF.zMax);
    const H = v.h / z;
    const cx = (B.x0 + B.x1) / 2;
    const cy = (B.y0 - AF.padTop + B.y1 + AF.padBottom + cap * H) / 2;
    const r3 = x => Math.round(x * 1000) / 1000;
    return { x: r3(cx), y: r3(cy), z: r3(z) };
  }
  STICK.autoFrame = autoFrame;

  /* compile(doc) -> rt: everything the renderer needs.
     Forgiving: collects warnings, never throws on bad events. */
  STICK.compile = function (doc) {
    const warnings = [];
    const warn = m => { if (warnings.length < 200) warnings.push(m); };
    doc = doc && typeof doc === 'object' ? doc : {};

    const rt = {
      doc, ch: new Channels(), warnings, warn,
      overlays: [],   // {type:'say'|'emote'|'caption', fig?, text|symbol, t0, t1}
      loco: [],       // {fig, t0, t1, style, x0, y0}
      grips: [],      // {obj, fig, hand:'L'|'R', t0, t1, follow} — props held in a hand
      figs: new Map(),
      objs: new Map(), // animatable simple shapes (id -> normalized object)
      boards: new Map(), // writable panels (id -> normalized board with write blocks)
      backdrops: [],  // {t0, fade, scene} — crossfading scenery (backdrop 0 = doc.scene)
      scene: null, duration: 1,
    };
    rt.scene = STICK.buildScene(doc.scene || {}, warn);
    rt.view = STICK.makeView(doc.scene && doc.scene.aspect, warn);
    rt.backdrops.push({ t0: 0, fade: 0, scene: rt.scene });

    const figs = Array.isArray(doc.figures) ? doc.figures : [];
    if (!figs.length) warn('no figures defined');
    const defaultStyle = (doc.scene && doc.scene.style) || 'sketch';
    const sceneWobble = STICK.parseWobble(doc.scene && doc.scene.wobble, STICK.DEFAULT_WOBBLE, warn);
    figs.forEach((f, i) => {
      const fig = STICK.normalizeFigure(f, i, warn, defaultStyle, rt.scene.ink, sceneWobble);
      if (rt.figs.has(fig.id)) { warn(`duplicate figure id "${fig.id}" — second one ignored`); return; }
      rt.figs.set(fig.id, fig);
      STICK.initFigureChannels(rt, fig);
    });

    const objs = Array.isArray(doc.objects) ? doc.objects : [];
    objs.forEach((o, i) => {
      const obj = STICK.normalizeObject(o, i, warn);
      if (!obj) return;
      if (rt.figs.has(obj.id) || rt.objs.has(obj.id)) { warn(`duplicate id "${obj.id}" for object — ignored`); return; }
      rt.objs.set(obj.id, obj);
      STICK.initObjectChannels(rt, obj);
    });

    const boards = Array.isArray(doc.boards) ? doc.boards : [];
    boards.forEach((b, i) => {
      const board = STICK.normalizeBoard(b, i, warn);
      if (!board) return;
      if (rt.figs.has(board.id) || rt.objs.has(board.id) || rt.boards.has(board.id)) { warn(`duplicate id "${board.id}" for board — ignored`); return; }
      rt.boards.set(board.id, board);
    });

    // camera defaults
    rt.ch.setBase('cam.x', 50);
    rt.ch.setBase('cam.y', 50);
    rt.ch.setBase('cam.z', 1);
    rt.ch.setBase('cam.rot', 0);
    rt.ch.setBase('cam.shake', 0);
    rt.ch.setBase('tint.a', 0);
    rt.ch.setBase('tint.color', '#000000');

    const cur = { start: 0, end: 0, origin: 0 };
    const tl = Array.isArray(doc.timeline) ? doc.timeline : [];
    if (!tl.length) warn('timeline is empty');
    for (const ev of tl) STICK.expandEvent(rt, ev, cur, null, 0);

    rt.ch.finalize();

    let end = 1.2;
    for (const c of rt.ch.m.values()) for (const tr of c.tracks) end = Math.max(end, tr.t1);
    for (const o of rt.overlays) end = Math.max(end, o.t1);
    for (const l of rt.loco) end = Math.max(end, l.t1);
    for (const b of rt.boards.values()) for (const blk of b.blocks) end = Math.max(end, blk.t0 + (blk.dur || 0));
    for (const b of rt.backdrops) end = Math.max(end, b.t0 + (b.fade || 0));
    rt.duration = Math.min(end + 0.8, 600);
    try {
      rt.autoFrame = autoFrame(rt); // static camera when the timeline has no camera commands
      if (rt.autoFrame) { rt.ch.setBase('cam.x', rt.autoFrame.x); rt.ch.setBase('cam.y', rt.autoFrame.y); rt.ch.setBase('cam.z', rt.autoFrame.z); }
    } catch (e) { rt.autoFrame = null; warn('auto-framing skipped: ' + e.message); }
    return rt;
  };
})();
