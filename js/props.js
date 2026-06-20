/* stick — held props: a small library of objects a figure can hold in a hand.
   Each prop is a single shape/path authored with its GRIP POINT at the local
   origin (0,0), so the draw loop can place that point right at the hand.
   `directional` props rotate to point along the forearm (gun, sword, …);
   the rest stay upright. Geometry stays in the minimal stick aesthetic. */
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;
  const STICK = (G.STICK = G.STICK || {});
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);

  // shape: any object shape; props: SVG attrs (fill, stroke, strokeWidth, d, cx…);
  // directional: rotate to the forearm; baseAngle: authored orientation offset (deg).
  const INK = '#2a2a35';
  STICK.props = {
    // --- loose, palm-held (stay upright) ---
    apple:   { shape: 'circle', props: { cx: 0, cy: -0.2, r: 1.3, fill: '#c0392b', stroke: INK, strokeWidth: 0.16 } },
    ball:    { shape: 'circle', props: { cx: 0, cy: -0.2, r: 1.5, fill: '#e67e22', stroke: INK, strokeWidth: 0.16 } },
    cup:     { shape: 'path', props: { d: 'M -1 0.3 L 1 0.3 L 0.8 -1.5 L -0.8 -1.5 Z M 1 -1.2 q 0.85 0 0.85 0.55 q 0 0.55 -0.85 0.55', fill: '#dfe6e9', stroke: INK, strokeWidth: 0.16 } },
    coffee:  { shape: 'path', props: { d: 'M -1 0.3 L 1 0.3 L 0.8 -1.5 L -0.8 -1.5 Z M 1 -1.2 q 0.85 0 0.85 0.55 q 0 0.55 -0.85 0.55', fill: '#6f4e37', stroke: INK, strokeWidth: 0.16 } },
    book:    { shape: 'rect', props: { x: -1.6, y: -1.2, w: 3.2, h: 2.2, rx: 0.15, fill: '#2980b9', stroke: INK, strokeWidth: 0.16 } },
    phone:   { shape: 'rect', props: { x: -0.55, y: -1.5, w: 1.1, h: 3, rx: 0.28, fill: INK, stroke: '#666', strokeWidth: 0.12 } },
    balloon: { shape: 'path', props: { d: 'M 0 0 C -1.7 -1.7 -1.5 -4.4 0 -4.4 C 1.5 -4.4 1.7 -1.7 0 0 Z', fill: '#8e44ad', stroke: INK, strokeWidth: 0.14 } },
    briefcase: { shape: 'path', props: { d: 'M -1.8 -1 L 1.8 -1 L 1.8 1.5 L -1.8 1.5 Z M -0.7 -1 L -0.7 -1.7 L 0.7 -1.7 L 0.7 -1', fill: '#7f5539', stroke: INK, strokeWidth: 0.16 } },
    sign:    { shape: 'path', props: { d: 'M -0.18 0 L 0.18 0 L 0.18 -3.2 L -0.18 -3.2 Z M -1.9 -3.1 L 1.9 -3.1 L 1.9 -5.3 L -1.9 -5.3 Z', fill: '#e9c46a', stroke: INK, strokeWidth: 0.16 } },
    box:     { shape: 'rect', props: { x: -2.4, y: -1.9, w: 4.8, h: 3.8, rx: 0.2, fill: '#b07d4b', stroke: INK, strokeWidth: 0.18 } }, // good held two-handed
    banner:  { shape: 'rect', props: { x: -4, y: -1.3, w: 8, h: 2.6, rx: 0.3, fill: '#c0392b', stroke: INK, strokeWidth: 0.16 } },
    flower:  { shape: 'group', props: { children: [
      { type: 'rect', props: { x: -0.16, y: -3.2, w: 0.32, h: 3.2, fill: '#2e7d32' } },
      { type: 'circle', props: { cx: 0.95, cy: -3.9, r: 0.72, fill: '#e8556f' } },
      { type: 'circle', props: { cx: -0.95, cy: -3.9, r: 0.72, fill: '#e8556f' } },
      { type: 'circle', props: { cx: 0, cy: -4.75, r: 0.72, fill: '#e8556f' } },
      { type: 'circle', props: { cx: 0.62, cy: -3.1, r: 0.72, fill: '#e8556f' } },
      { type: 'circle', props: { cx: -0.62, cy: -3.1, r: 0.72, fill: '#e8556f' } },
      { type: 'circle', props: { cx: 0, cy: -3.9, r: 0.64, fill: '#f4c430' } },
    ] } },

    // --- directional, point along the forearm (+x) ---
    gun:    { shape: 'path', props: { d: 'M -0.1 -0.9 L 2.7 -0.9 L 2.7 -0.3 L 0.75 -0.3 L 0.75 1.2 L -0.1 1.2 Z', fill: '#34495e', stroke: INK, strokeWidth: 0.14 }, directional: true },
    sword:  { shape: 'path', props: { d: 'M -0.7 -0.18 L 0.7 -0.18 L 0.7 -0.7 L 0.98 -0.7 L 0.98 -0.16 L 5 -0.05 L 5 0.05 L 0.98 0.16 L 0.98 0.7 L 0.7 0.7 L 0.7 0.18 L -0.7 0.18 Z', fill: '#bdc3c7', stroke: INK, strokeWidth: 0.12 }, directional: true },
    wand:   { shape: 'path', props: { d: 'M 0 -0.16 L 3 -0.16 L 3 0.16 L 0 0.16 Z M 3 0 m -0.5 0 a 0.5 0.5 0 1 0 1 0 a 0.5 0.5 0 1 0 -1 0', fill: '#34495e', stroke: INK, strokeWidth: 0.1 }, directional: true },
    pencil: { shape: 'path', props: { d: 'M -0.4 -0.3 L 2.6 -0.3 L 3.1 0 L 2.6 0.3 L -0.4 0.3 Z', fill: '#f4a261', stroke: INK, strokeWidth: 0.12 }, directional: true },
  };

  const OBJ_SHAPES = ['circle', 'rect', 'ellipse', 'line', 'path', 'text', 'group'];

  // Build a held-prop object from a definition (library entry or inline def):
  // { shape, props, grip?:{x,y}, directional?, baseAngle?, scale?, layer? }.
  // Registers it + its channels. opts: { figId, id, scale, color }.
  function buildProp(rt, def, opts, fallbackName) {
    opts = opts || {};
    let id = opts.id != null ? String(opts.id) : ((opts.figId ? opts.figId + '_' : '') + (fallbackName || 'prop'));
    if (rt.objs.has(id) || rt.figs.has(id)) { let i = 2; while (rt.objs.has(id + i) || rt.figs.has(id + i)) i++; id += i; }
    const props = Object.assign({}, def.props);
    if (opts.color) props.fill = opts.color;
    // grip = hand-contact point in the def's own coords (library props author it at 0,0)
    const grip = def.grip && typeof def.grip === 'object' ? { x: num(def.grip.x, 0), y: num(def.grip.y, 0) } : { x: 0, y: 0 };
    const obj = {
      id, shape: def.shape, layer: def.layer || 'fig', props, hidden: false,
      directional: !!def.directional, baseAngle: num(def.baseAngle, 0),
      opacity: 1, pivot: grip,
    };
    rt.objs.set(id, obj);
    STICK.initObjectChannels(rt, obj);
    const sc = num(opts.scale, num(def.scale, 1));
    if (sc !== 1) rt.ch.setBase(id + '.scale', sc);
    return obj;
  }

  // Materialise a named library prop. Returns the object (or null on unknown name).
  STICK.makeProp = function (rt, name, opts) {
    const def = STICK.props[name];
    if (!def) { rt.warn(`unknown prop "${name}"`); return null; }
    return buildProp(rt, def, opts, name);
  };

  // Materialise a custom prop from an inline definition the author provides.
  STICK.makePropDef = function (rt, def, opts) {
    if (!def || typeof def !== 'object') return null;
    if (!OBJ_SHAPES.includes(def.shape)) { rt.warn(`inline prop: unknown shape ${JSON.stringify(def.shape)}`); return null; }
    return buildProp(rt, def, opts, def.id || (opts && opts.id) || 'prop');
  };

  // Forearm angle (deg) for a held hand — used to aim directional props.
  STICK.propAngle = function (P, hand, baseAngle) {
    const arm = hand === 'L' ? P.armL : P.armR;
    const elbW = P.toWorld(arm.elb);
    const handW = hand === 'L' ? P.world.handL : P.world.handR;
    return Math.atan2(handW.y - elbW.y, handW.x - elbW.x) * 180 / Math.PI + num(baseAngle, 0);
  };
})();
