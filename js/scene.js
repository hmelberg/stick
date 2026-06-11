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
