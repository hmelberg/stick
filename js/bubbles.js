/* stick — speech/thought bubble placement. Pure geometry (no DOM) so it can be
   tested in Node: given where each bubble would like to sit, keep them inside
   the visible frame and stop them covering each other or other figures' heads. */
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;
  const STICK = (G.STICK = G.STICK || {});

  const GAP = 0.8;      // clear space kept between a bubble and what it avoids
  const MARGIN = 2;     // distance kept from the frame edge
  const EPS = 0.01;     // placed just beyond the gap, so rounding can't re-trigger a hit
  const SOFT = 1.5;     // horizontal overlap (units) over which a push eases in

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  // horizontal overlap depth of two spans (<= 0 means clear)
  const overlapX = (ax, aw, bx, bw) => Math.min(ax + aw, bx + bw) - Math.max(ax, bx);
  const hits = (a, b) =>
    overlapX(a.x, a.w, b.x, b.w) > -GAP && a.y < b.y + b.h + GAP && a.y + a.h > b.y - GAP;

  /* bubbles: [{ fig, cx, y, w, h, alpha, headX }] — cx = desired centre x, y = desired top.
       Order matters: earlier bubbles keep their spot, later ones move out of the way.
     heads:   [{ fig, x, y, r }] — figure heads; a bubble avoids every head but its own.
     view:    { x, y, w, h } — the visible frame in the same coordinates.
     Returns [{ cx, y }] in input order.

     A push is weighted by the obstacle's alpha (so a bubble glides back as the one
     below it fades out) and eases in with horizontal overlap (so idle sway at the
     edge of a collision doesn't make a bubble flicker between two spots). */
  STICK.layoutBubbles = function (bubbles, heads, view) {
    const v = view || { x: 0, y: 0, w: 100, h: 100 };
    const top = v.y + MARGIN;
    const fitX = (cx, w) => {
      const lo = v.x + w / 2 + MARGIN, hi = v.x + v.w - w / 2 - MARGIN;
      return lo > hi ? v.x + v.w / 2 : clamp(cx, lo, hi);
    };
    const placed = []; // settled rects of earlier bubbles (at full strength)
    const out = [];

    for (const b of bubbles) {
      const w = b.w, h = b.h;
      let cx = fitX(b.cx, w), y = Math.max(top, b.y);   // settled position, used for collision tests
      let dx = 0, dy = 0;                               // what is actually drawn: weighted pushes
      const obstacles = placed.concat(
        (heads || []).filter(hd => hd.fig !== b.fig).map(hd => ({ x: hd.x - hd.r, y: hd.y - hd.r, w: hd.r * 2, h: hd.r * 2, alpha: 1, head: true })));
      const skip = new Set();

      for (let pass = 0; pass < 8; pass++) {
        const me = { x: cx - w / 2, y, w, h };
        const ob = obstacles.find(o => !skip.has(o) && hits(me, o));
        if (!ob) break;
        const depth = overlapX(me.x, w, ob.x, ob.w) + GAP;
        const weight = clamp(depth / SOFT, 0, 1) * (ob.alpha == null ? 1 : ob.alpha);
        const up = ob.y - GAP - EPS - h;
        if (up >= top) {                 // room above: lift over it
          dy += (up - y) * weight; y = up;
          continue;
        }
        if (ob.head) { skip.add(ob); continue; } // no room above a head: live with it
        // no room above another bubble: slide beside it, on the speaker's own side first
        const obCx = ob.x + ob.w / 2;
        const first = (b.headX != null ? b.headX : cx) >= obCx ? 1 : -1;
        let moved = false;
        for (const dir of [first, -first]) {
          const nx = fitX(obCx + dir * (ob.w / 2 + w / 2 + GAP + EPS), w);
          if (!hits({ x: nx - w / 2, y, w, h }, ob)) { dx += (nx - cx) * weight; cx = nx; moved = true; break; }
        }
        if (!moved) skip.add(ob);
      }

      placed.push({ x: cx - w / 2, y, w, h, alpha: b.alpha == null ? 1 : b.alpha });
      out.push({ cx: fitX(fitX(b.cx, w) + dx, w), y: Math.max(top, Math.max(top, b.y) + dy) });
    }
    return out;
  };
})();
