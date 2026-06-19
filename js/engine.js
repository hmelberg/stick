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
      figs: new Map(),
      objs: new Map(), // animatable simple shapes (id -> normalized object)
      boards: new Map(), // writable panels (id -> normalized board with write blocks)
      backdrops: [],  // {t0, fade, scene} — crossfading scenery (backdrop 0 = doc.scene)
      scene: null, duration: 1,
    };
    rt.scene = STICK.buildScene(doc.scene || {}, warn);
    rt.backdrops.push({ t0: 0, fade: 0, scene: rt.scene });

    const figs = Array.isArray(doc.figures) ? doc.figures : [];
    if (!figs.length) warn('no figures defined');
    const defaultStyle = (doc.scene && doc.scene.style) || 'sketch';
    figs.forEach((f, i) => {
      const fig = STICK.normalizeFigure(f, i, warn, defaultStyle);
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
    return rt;
  };
})();
