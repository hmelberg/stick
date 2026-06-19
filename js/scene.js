/* stick — scene: theme + element normalization, anchor lookup, point resolution,
   and static SVG construction for scenery. */
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;
  const STICK = (G.STICK = G.STICK || {});

  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);

  STICK.buildScene = function (def, warn) {
    def = def && typeof def === 'object' ? def : {};
    const themeName = def.theme || 'blank';
    const theme = STICK.presets.themes[themeName] || (warn(`unknown theme "${themeName}"`), STICK.presets.themes.blank);
    const scene = {
      bg: def.bg || theme.bg || '#f7f2e9',
      ink: '#2a2a35',
      floorY: num(def.floorY, num(theme.floorY, 70)),
      floor: def.floor !== false,
      elements: [],
      byId: new Map(),
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
  const OBJ_SHAPES = ['circle', 'rect', 'ellipse', 'line', 'path', 'text'];

  STICK.objectPivot = function (obj) {
    const p = obj.props;
    switch (obj.shape) {
      case 'rect': return { x: num(p.x, 0) + num(p.w, 10) / 2, y: num(p.y, 0) + num(p.h, 10) / 2 };
      case 'circle': return { x: num(p.cx, 0), y: num(p.cy, 0) };
      case 'ellipse': return { x: num(p.cx, 0), y: num(p.cy, 0) };
      case 'line': return { x: (num(p.x1, 0) + num(p.x2, 10)) / 2, y: (num(p.y1, 0) + num(p.y2, 10)) / 2 };
      case 'text': return { x: num(p.x, 50), y: num(p.y, 50) };
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
    obj.pivot = (raw.pivot && typeof raw.pivot === 'object' && typeof raw.pivot.x === 'number')
      ? { x: raw.pivot.x, y: num(raw.pivot.y, 0) }
      : STICK.objectPivot(obj);
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
      if (rest[0] === 'head') return { ...P.world.head };
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
      default:
        return null;
    }
  };
})();
