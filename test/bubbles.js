/* Node test for speech-bubble placement. Run: node test/bubbles.js */
'use strict';
global.window = undefined;
require('../js/bubbles.js');
const lay = globalThis.STICK.layoutBubbles;
let failures = 0;
const ok = (c, msg) => { if (!c) { failures++; console.error('  FAIL: ' + msg); } else console.log('  ok — ' + msg); };
const rect = (b, s) => ({ x: s.cx - b.w / 2, y: s.y, w: b.w, h: b.h });
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const view = { x: 0, y: 0, w: 100, h: 100 };

// 1. a lone bubble stays where it asked to be
let bs = [{ fig: 'a', cx: 50, y: 40, w: 20, h: 6, alpha: 1, headX: 46 }];
let s = lay(bs, [{ fig: 'a', x: 46, y: 52, r: 2.7 }], view);
ok(s[0].cx === 50 && s[0].y === 40, 'lone bubble untouched');

// 2. two overlapping bubbles: the later one is lifted clear, the earlier one stays
bs = [{ fig: 'a', cx: 45, y: 40, w: 24, h: 6, alpha: 1, headX: 41 }, { fig: 'b', cx: 52, y: 42, w: 14, h: 6, alpha: 1, headX: 48 }];
s = lay(bs, [], view);
ok(s[0].cx === 45 && s[0].y === 40, 'earlier bubble keeps its spot');
ok(!overlap(rect(bs[0], s[0]), rect(bs[1], s[1])) && s[1].y < 40, 'later bubble lifted above it');

// 3. the lift follows the lower bubble's fade (glides back, no snap)
bs[0].alpha = 0.5;
const half = lay(bs, [], view)[1].y;
ok(half > s[1].y && half < 42, 'push scales with the obstacle alpha');

// 4. no room above: slide sideways instead of overlapping
bs = [{ fig: 'a', cx: 45, y: 3, w: 24, h: 6, alpha: 1, headX: 41 }, { fig: 'b', cx: 52, y: 4, w: 14, h: 6, alpha: 1, headX: 60 }];
s = lay(bs, [], view);
ok(!overlap(rect(bs[0], s[0]), rect(bs[1], s[1])) && s[1].cx > 52, 'slides beside when the top is full');

// 5. a bubble avoids another figure's head but not its own
bs = [{ fig: 'kid', cx: 50, y: 44, w: 20, h: 6, alpha: 1, headX: 48 }];
const heads = [{ fig: 'kid', x: 48, y: 53, r: 2.5 }, { fig: 'mum', x: 55, y: 47, r: 2.7 }];
s = lay(bs, heads, view);
ok(s[0].y + 6 <= 47 - 2.7, 'lifted above a taller neighbour\'s head');

// 6. kept inside a zoomed-in view
bs = [{ fig: 'a', cx: 22, y: 10, w: 20, h: 6, alpha: 1, headX: 26 }];
s = lay(bs, [], { x: 20, y: 30, w: 50, h: 50 });
ok(s[0].cx - 10 >= 22 && s[0].y >= 32, 'clamped to the visible frame');

// 7. continuity: a tiny horizontal nudge never makes a bubble jump
let worst = 0, prev = null;
for (let x = 20; x <= 80; x += 0.05) {
  const r = lay([{ fig: 'a', cx: 50, y: 40, w: 20, h: 6, alpha: 1 }, { fig: 'b', cx: x, y: 41, w: 14, h: 6, alpha: 1 }], [], view)[1];
  if (prev) worst = Math.max(worst, Math.abs(r.y - prev.y));
  prev = r;
}
ok(worst < 0.5, `no jump while one bubble passes another (max step ${worst.toFixed(2)})`);

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nall good');
