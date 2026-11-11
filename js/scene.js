/* stick — scene: theme + element normalization, anchor lookup, point resolution,
   and static SVG construction for scenery. */
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;
  const STICK = (G.STICK = G.STICK || {});

  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);

  // Is a background colour dark enough that dark ink would disappear on it?
  const NAMED_DARK = /^(black|navy|midnight|maroon|darkblue|darkslategray|darkslategrey|indigo|#000|#111|#222)$/i;
  function isDark(c) {
    const s = String(c || '').trim();
    let m = /^#?([0-9a-f]{3})$/i.exec(s);
    if (m) { const h = m[1]; c = parseInt(h[0] + h[0] + h[1] + h[1] + h[2] + h[2], 16); }
    else { m = /^#?([0-9a-f]{6})$/i.exec(s); if (m) c = parseInt(m[1], 16); else return NAMED_DARK.test(s); }
    const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
  }
  STICK.isDarkColor = isDark;

  // depth factors per layer (1 = moves fully with camera, <1 = further away)
  function parseParallax(p) {
    if (!p) return null;
    const d = { backdrop: 0.6, back: 0.78, mid: 0.9, fig: 1, front: 1, bubbles: 1 };
    return (p === true) ? d : (typeof p === 'object' ? Object.assign(d, p) : null);
  }

  STICK.buildScene = function (def, warn) {
    def = def && typeof def === 'object' ? def : {};
    const themeName = def.theme || 'blank';
    const theme = STICK.presets.themes[themeName] || (warn(`unknown theme "${themeName}"`), STICK.presets.themes.blank);
    const bg = def.bg || theme.bg || '#f7f2e9';
    // Ink (figures, outlines, scene strokes) auto-contrasts the background so a dark
    // scene doesn't swallow the dark stick figures. Authors can still force it.
    const scene = {
      bg,
      ink: def.ink || (isDark(bg) ? '#f2efe6' : '#2a2a35'),
      floorY: num(def.floorY, num(theme.floorY, 70)),
      floor: def.floor !== false,
      elements: [],
      byId: new Map(),
      parallax: parseParallax(def.parallax),
    };
    const userEls = Array.isArray(def.elements) ? def.elements : Array.isArray(def.items) ? def.items : [];
    [...(theme.elements || []), ...userEls].forEach((e, i) => {
      if (!e || typeof e !== 'object' || !e.type) { warn(`scene element ${i} has no type — skipped`); return; }
      const el = {
        id: String(e.id || 'el' + i),
        type: e.type,
        layer: ['back', 'mid', 'front'].includes(e.layer) ? e.layer : 'mid',
        props: e.props || {},
        anchors: e.anchors || {},
      };
      scene.elements.push(el);
      scene.byId.set(el.id, el);
    });
    return scene;
  };

  /* ---------------- animatable objects (props) ----------------
     Objects are simple shapes (no skeleton) that move/scale/rotate/fade/recolor
     via channels objId.tx/.ty/.scale/.rot/.opacity/.fill. Geometry is authored
     exactly like a scene element; the pivot is the shape's natural centre. */
  const OBJ_SHAPES = ['circle', 'rect', 'ellipse', 'line', 'path', 'text', 'group'];

  STICK.objectPivot = function (obj) {
    const p = obj.props;
    switch (obj.shape) {
      case 'rect': return { x: num(p.x, 0) + num(p.w, 10) / 2, y: num(p.y, 0) + num(p.h, 10) / 2 };
      case 'circle': return { x: num(p.cx, 0), y: num(p.cy, 0) };
      case 'ellipse': return { x: num(p.cx, 0), y: num(p.cy, 0) };
      case 'line': return { x: (num(p.x1, 0) + num(p.x2, 10)) / 2, y: (num(p.y1, 0) + num(p.y2, 10)) / 2 };
      case 'text': return { x: num(p.x, 50), y: num(p.y, 50) };
      case 'group': return { x: num(p.cx, 0), y: num(p.cy, 0) }; // children authored around (cx,cy)
      default: return { x: num(p.cx, 50), y: num(p.cy, 50) }; // path: optional cx/cy hint
    }
  };

  STICK.normalizeObject = function (raw, i, warn) {
    raw = raw && typeof raw === 'object' ? raw : {};
    const shape = raw.shape || raw.type;
    if (!OBJ_SHAPES.includes(shape)) { warn(`object ${i} has unknown shape "${shape}" — skipped`); return null; }
    const obj = {
      id: String(raw.id || raw.name || 'obj' + i),
      shape,
      layer: ['back', 'mid', 'fig', 'front'].includes(raw.layer) ? raw.layer : 'front',
      props: raw.props && typeof raw.props === 'object' ? { ...raw.props } : {},
      hidden: !!raw.hidden,
    };
    obj.opacity = num(obj.props.opacity, 1);
    // grip/pivot + optional directional aim, so an authored object can be held like a prop
    const grip = raw.grip && typeof raw.grip === 'object' ? raw.grip : raw.pivot;
    obj.pivot = (grip && typeof grip === 'object' && typeof grip.x === 'number')
      ? { x: grip.x, y: num(grip.y, 0) }
      : STICK.objectPivot(obj);
    obj.directional = !!raw.directional;
    obj.baseAngle = num(raw.baseAngle, 0);
    return obj;
  };

  STICK.initObjectChannels = function (rt, obj) {
    const ch = rt.ch, id = obj.id;
    const set = (s, v) => ch.setBase(id + '.' + s, v);
    set('tx', 0); set('ty', 0);
    set('scale', 1); set('rot', 0);
    set('opacity', obj.hidden ? 0 : obj.opacity);
    set('fill', obj.props.fill != null ? obj.props.fill : null);
  };

  function autoAnchor(el, name) {
    const p = el.props;
    if (el.type === 'rect') {
      const x = num(p.x, 0), y = num(p.y, 0), w = num(p.w, 10), h = num(p.h, 10);
      const table = {
        center: [x + w / 2, y + h / 2],
        top: [x + w / 2, y], bottom: [x + w / 2, y + h],
        left: [x, y + h / 2], right: [x + w, y + h / 2],
        topLeft: [x, y], topRight: [x + w, y], bottomLeft: [x, y + h], bottomRight: [x + w, y + h],
      };
      return table[name] || null;
    }
    if (el.type === 'circle' || el.type === 'ellipse') {
      if (name === 'center') return [num(p.cx, 0), num(p.cy, 0)];
    }
    if (el.type === 'text') {
      if (name === 'center') return [num(p.x, 0), num(p.y, 0)];
    }
    return null;
  }

  /* Resolve a point reference at compile time t:
     {x,y} | [x,y] | "elemId" | "elemId.anchor" | "figId" | "figId.head|chest|pos|hand.left..." */
  STICK.resolvePoint = function (rt, ref, t) {
    if (ref == null) return null;
    if (Array.isArray(ref) && ref.length >= 2) return { x: num(ref[0], 50), y: num(ref[1], 50) };
    if (typeof ref === 'object') {
      if (typeof ref.x === 'number' && typeof ref.y === 'number') return { x: ref.x, y: ref.y };
      return null;
    }
    if (typeof ref !== 'string') return null;
    const parts = ref.split('.');
    const id = parts[0], rest = parts.slice(1);

    const fig = rt.figs.get(id);
    if (fig) {
      const P = STICK.computeFigure(rt, fig, t);
      if (!rest.length || rest[0] === 'pos' || rest[0] === 'feet') return { ...P.world.pos };
      if (rest[0] === 'head' || rest[0] === 'face') return { ...P.world.head };
      if (rest[0] === 'chest' || rest[0] === 'center') return { ...P.world.chest };
      if (rest[0] === 'hand') return { ...(rest[1] === 'left' ? P.world.handL : P.world.handR) };
      if (rest[0] === 'foot') return { ...(rest[1] === 'left' ? P.world.footL : P.world.footR) };
      rt.warn(`unknown figure anchor "${ref}" — using position`);
      return { ...P.world.pos };
    }

    const obj = rt.objs && rt.objs.get(id);
    if (obj) {
      // an object resolves to its moving centre (pivot + translation at t)
      return { x: obj.pivot.x + rt.ch.get(id + '.tx', t), y: obj.pivot.y + rt.ch.get(id + '.ty', t) };
    }

    const board = rt.boards && rt.boards.get(id);
    if (board) {
      const r = board.rect;
      const a = { center: [r.x + r.w / 2, r.y + r.h / 2], tl: [r.x, r.y], tr: [r.x + r.w, r.y], bl: [r.x, r.y + r.h], br: [r.x + r.w, r.y + r.h] };
      const p = a[rest[0]] || a.center;
      return { x: p[0], y: p[1] };
    }

    const el = rt.scene.byId.get(id);
    if (el) {
      const name = rest[0] || 'center';
      const a = el.anchors[name] || autoAnchor(el, name);
      if (a) return { x: num(a[0] !== undefined ? a[0] : a.x, 50), y: num(a[1] !== undefined ? a[1] : a.y, 50) };
      const c = el.anchors.center || autoAnchor(el, 'center');
      rt.warn(`unknown anchor "${ref}" — using center of "${id}"`);
      if (c) return { x: c[0], y: c[1] };
    }
    rt.warn(`cannot resolve point "${ref}"`);
    return null;
  };

  /* Bounding box (scene coords) for framing a figure with the camera:
       "figId" / "figId.body"  -> the whole figure
       "figId.face" / ".head"  -> a tight head/shoulders close-up (tight:true)
     Returns null for non-figures so the caller can fall back to a point. */
  STICK.figureBounds = function (rt, ref, t) {
    if (typeof ref !== 'string') return null;
    const parts = ref.split('.');
    const fig = rt.figs.get(parts[0]);
    if (!fig) return null;
    const P = STICK.computeFigure(rt, fig, t);
    const r = P.g.headR, sub = parts[1];
    if (sub === 'face' || sub === 'head') {
      const h = P.world.head; // head center; circle + hair extend ~1.5r around it
      return { x: h.x - r * 1.7, y: h.y - r * 1.9, w: r * 3.4, h: r * 4.0, tight: true };
    }
    const ps = [P.world.head, P.world.chest, P.world.handL, P.world.handR, P.world.footL, P.world.footR, P.world.pos];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of ps) { if (!p) continue; if (p.x < x0) x0 = p.x; if (p.y < y0) y0 = p.y; if (p.x > x1) x1 = p.x; if (p.y > y1) y1 = p.y; }
    if (!isFinite(x0)) return null;
    // pad for head radius/hair (top & sides) and shoe length (bottom)
    x0 -= r * 0.8; x1 += r * 0.8; y0 -= r * 1.3; y1 += r * 0.5;
    return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0), tight: false };
  };

  /* Pure bounding box {x0,y0,x1,y1} of a scene element / object shape (pre-transform),
     for auto-framing. Returns null when it can't be computed confidently (arcs,
     relative path commands, unknown types) — callers then treat it as full-frame. */
  const unionB = (a, b) => (!a ? b : !b ? a : { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) });
  function pathBounds(d) {
    if (typeof d !== 'string' || !d.trim()) return null;
    const toks = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g);
    if (!toks) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, cx = 0, cy = 0, cmd = null, nums = [];
    const add = (x, y) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; };
    const arity = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4 };
    const flush = () => {
      const n = arity[cmd];
      while (nums.length >= n) {
        const a = nums.splice(0, n);
        if (cmd === 'H') { cx = a[0]; add(cx, cy); continue; }
        if (cmd === 'V') { cy = a[0]; add(cx, cy); continue; }
        for (let i = 0; i < a.length; i += 2) add(a[i], a[i + 1]); // control points: a safe superset
        cx = a[a.length - 2]; cy = a[a.length - 1];
      }
    };
    for (const tk of toks) {
      if (/[A-Za-z]/.test(tk)) {
        if (cmd && arity[cmd]) flush();
        if (tk === 'Z' || tk === 'z') { cmd = null; nums = []; continue; }
        if (!arity[tk]) return null; // relative commands / arcs: give up
        cmd = tk; nums = [];
      } else {
        if (!cmd) return null;
        nums.push(parseFloat(tk));
      }
    }
    if (cmd && arity[cmd]) flush();
    return isFinite(x0) ? { x0, y0, x1, y1 } : null;
  }
  STICK.elementBounds = function (el, depth) {
    if (!el || typeof el !== 'object') return null;
    depth = depth || 0;
    const p = el.props || {}, type = el.type || el.shape;
    const sw = num(p.strokeWidth, p.stroke != null ? 0.5 : 0) / 2;
    const pad = b => (b ? { x0: b.x0 - sw, y0: b.y0 - sw, x1: b.x1 + sw, y1: b.y1 + sw } : null);
    switch (type) {
      case 'rect': { const x = num(p.x, 0), y = num(p.y, 0); return pad({ x0: x, y0: y, x1: x + num(p.w, 10), y1: y + num(p.h, 10) }); }
      case 'circle': { const x = num(p.cx, 0), y = num(p.cy, 0), r = num(p.r, 5); return pad({ x0: x - r, y0: y - r, x1: x + r, y1: y + r }); }
      case 'ellipse': { const x = num(p.cx, 0), y = num(p.cy, 0), rx = num(p.rx, 5), ry = num(p.ry, 3); return pad({ x0: x - rx, y0: y - ry, x1: x + rx, y1: y + ry }); }
      case 'line': {
        const a = num(p.x1, 0), b = num(p.y1, 0), c = num(p.x2, 10), d = num(p.y2, 10);
        const w = num(p.strokeWidth, 0.5) / 2;
        return { x0: Math.min(a, c) - w, y0: Math.min(b, d) - w, x1: Math.max(a, c) + w, y1: Math.max(b, d) + w };
      }
      case 'text': { // approximate: Georgia glyphs are ~0.55em wide
        const size = num(p.size, 3), w = String(p.text != null ? p.text : '').length * size * 0.55, x = num(p.x, 50), y = num(p.y, 50);
        const x0 = p.align === 'left' ? x : p.align === 'right' ? x - w : x - w / 2;
        return { x0, y0: y - size, x1: x0 + w, y1: y + size * 0.3 };
      }
      case 'path': return pad(pathBounds(p.d));
      case 'group': {
        if (depth > 4) return null;
        const kids = p.children || p.shapes || [];
        let b = null;
        for (const k of kids) { if (!k) continue; const kb = STICK.elementBounds({ type: k.type || k.shape, props: k.props }, depth + 1); if (!kb) return null; b = unionB(b, kb); }
        return b;
      }
      case 'repeat': {
        if (depth > 4) return null;
        const child = p.of || p.shape;
        if (!child || !child.type) return { x0: 0, y0: 0, x1: 0, y1: 0 };
        const cb = STICK.elementBounds({ type: child.type, props: child.props }, depth + 1);
        if (!cb) return null;
        const from = num(p.from, 0), to = num(p.to, 100);
        return p.axis === 'y' ? { x0: cb.x0, x1: cb.x1, y0: cb.y0 + from, y1: cb.y1 + to } : { y0: cb.y0, y1: cb.y1, x0: cb.x0 + from, x1: cb.x1 + to };
      }
      default: return null;
    }
  };

  /* ---------------- static scenery SVG ---------------- */
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, parent) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  };

  STICK.drawSceneElement = function (el, parent, ink) {
    const p = el.props;
    const common = {};
    if (p.fill != null) common.fill = p.fill;
    if (p.stroke != null) common.stroke = p.stroke;
    if (p.strokeWidth != null) common['stroke-width'] = p.strokeWidth;
    if (p.opacity != null) common.opacity = p.opacity;
    switch (el.type) {
      case 'rect':
        return mk('rect', { x: num(p.x, 0), y: num(p.y, 0), width: num(p.w, 10), height: num(p.h, 10), rx: num(p.rx, 0), fill: p.fill || ink, ...common }, parent);
      case 'circle':
        return mk('circle', { cx: num(p.cx, 0), cy: num(p.cy, 0), r: num(p.r, 5), fill: p.fill || ink, ...common }, parent);
      case 'ellipse':
        return mk('ellipse', { cx: num(p.cx, 0), cy: num(p.cy, 0), rx: num(p.rx, 5), ry: num(p.ry, 3), fill: p.fill || ink, ...common }, parent);
      case 'line':
        return mk('line', { x1: num(p.x1, 0), y1: num(p.y1, 0), x2: num(p.x2, 10), y2: num(p.y2, 10), stroke: p.stroke || ink, 'stroke-width': num(p.strokeWidth, 0.5), 'stroke-linecap': 'round', ...common }, parent);
      case 'path':
        return mk('path', { d: p.d || '', fill: p.fill || 'none', stroke: p.stroke || ink, 'stroke-width': num(p.strokeWidth, 0.5), ...common }, parent);
      case 'text': {
        const txt = mk('text', {
          x: num(p.x, 50), y: num(p.y, 50),
          'font-size': num(p.size, 3),
          fill: p.fill || ink,
          'text-anchor': p.align === 'left' ? 'start' : p.align === 'right' ? 'end' : 'middle',
          'font-family': 'Georgia, serif',
        }, parent);
        txt.textContent = p.text != null ? String(p.text) : '';
        return txt;
      }
      case 'group': {
        // several shapes as one object/prop (one transform). children: [{type/shape, props}]
        const g = mk('g', {}, parent);
        const kids = p.children || p.shapes || [];
        for (const ch of kids) if (ch) STICK.drawSceneElement({ type: ch.type || ch.shape, props: ch.props || {} }, g, ink);
        return g;
      }
      case 'repeat': {
        // tile a child shape from `from` to `to` every `step` along an axis —
        // handy for long/"endless" scrolling backgrounds (ground, trees, posts).
        const g = mk('g', {}, parent);
        const child = p.of || p.shape;
        if (child && child.type) {
          const from = num(p.from, 0), to = num(p.to, 100), step = Math.max(0.5, num(p.step, 10));
          const axis = p.axis === 'y' ? 'y' : 'x';
          for (let v = from; v <= to + 1e-6; v += step) {
            const gg = mk('g', { transform: axis === 'y' ? `translate(0 ${v})` : `translate(${v} 0)` }, g);
            STICK.drawSceneElement({ type: child.type, props: child.props || {} }, gg, ink);
          }
        }
        return g;
      }
      default:
        return null;
    }
  };
})();
