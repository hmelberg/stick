# stick — JSON animation reference (for LLMs)

You are writing a JSON document for **stick**, a browser engine that renders
animated stick-figure cartoons from JSON. Your output must be **a single valid
JSON object** — no comments, no trailing commas, no markdown fences unless asked.

The goal is clear cartoon storytelling, not realism. Prefer semantic commands
(`move`, `mood`, `playClip`, `say`) over raw joint angles.

## Document shape

```json
{
  "v": 1,
  "scene": { "theme": "blank" },
  "figures": [ ... ],
  "objects": [ ... ],
  "clips": { ... },
  "timeline": [ ... ]
}
```

## Coordinate system

- viewBox is `0 0 100 100`; y grows downward.
- The **floor is at y = 70**. A standing figure's `pos` is the point on the
  ground between its feet, so standing figures have `"pos": {"x": ..., "y": 70}`.
- Default figure height is 20 units (kids 13, with a proportionally bigger head).

## Visual styles

Each figure can be drawn in one of three styles (set per figure with `"style"`,
or scene-wide with `"scene": { "style": ... }`):

- `sketch` (default) — hand-drawn look: wobbly boiling lines, imperfect head
  circle, nose, mitten hands, feet. Best for whimsical explainers.
- `ink` — clean minimal stick figure. Best for diagram-like clarity.
- `toon` — cartoon person with a filled torso (color via `"bodyColor"`), neck,
  shoes and mitten hands.

All three render the same skeleton, so every command works in every style.

## Figures

```json
{
  "id": "sam",
  "pos": { "x": 30, "y": 70 },
  "facing": "right",
  "style": "sketch",
  "archetype": ["man"],
  "mood": "neutral",
  "height": 20,
  "color": "#2a2a35",
  "bodyColor": "#b9cfe4",
  "hair": "short",
  "pose": { "base": "stand", "bend": 0.05, "lean": 0, "headTilt": 0, "tilt": 0, "stance": "normal" },
  "expression": { "smile": 0.2, "eyeOpen": 1 }
}
```

- `facing`: `front` | `left` | `right` | `back` | a number −2..2 (0 = front, ±1 = full side, ±2 = back). Full 360°: `front` faces the viewer (arms & legs face us); side for walking/writing; `back` shows the back of the head (face hidden, hat/hair kept) — e.g. a professor writing on the board. The `turn` command tweens smoothly through the in-between angles: `{ "cmd": "turn", "target": "prof", "args": { "to": "back" } }` to turn to the board, `{ "to": "front" }` to address the class. Walking always reads as side.
- `archetype`: `man` | `woman` | `kid` | `person` (sets height defaults). Everyone is **bald by default** — add `hair` to give it.
- `character`: `professor` (glasses) | `student` | `dancer` (fedora) — stronger presets.
- `age` (optional): `kid` | `adult` (default) | `elderly` — changes how the figure **moves**,
  not its size. `kid` = short quick steps, high knees, big bouncy arm swing; `elderly` = short
  shuffle, low feet, small arm swing, a slight stoop. Accepts a number too (`"age": 8`). The
  `kid` archetype defaults to `kid` movement. (Size is set separately via `archetype`/`height`.)
- `voice` (optional): controls spoken audio when the viewer enables sound. By
  default a voice is derived from the figure's archetype + current mood (the
  app-wide fallback is **British English, male**), so you usually omit this.
  Override with any of:
  - `gender`: `male` | `female` | `child`
  - `lang` (a.k.a. `accent`): the language/accent. Use a friendly name —
    `british` (default), `american`, `australian`, `irish`, `indian`, `french`,
    `spanish`, `german`, `italian`, `brazilian`, `japanese`, `chinese`, `hindi`,
    `arabic`, … — or a BCP-47 code like `en-GB`, `fr-FR`, `pt-BR`. Prefer the
    friendly name; it is portable across machines. The text you put in `say` is
    **not** translated — set `lang` only to change the accent/voice, and write
    the line in that language yourself if you want it spoken correctly.
  - `pitch`: `0.1..2` or `high` | `low`
  - `rate`: `0.4..2.2` or `fast` | `slow`
  - `volume`: `0..1`
  - `sing`: `true` for a sing-song melody
  Example — a French narrator: `"voice": { "lang": "french", "gender": "female" }`.
  Availability of a specific accent depends on the viewer's browser/OS voices;
  if it's missing, the closest same-language voice (then any voice) is used.
  When a scene has **several figures**, each automatically gets a distinct voice
  (different pitch/rate, a different system voice, and a mix of male/female for
  generic figures) so a crowd doesn't all sound the same — set `voice` only when
  you want a specific character to sound a particular way.
- `hair`: `none` (default) | `short` | `tuft` | `long` (long, curled — good for women/girls) | `bun` | `sides`. Also `glasses: true`, `hat: "fedora"`.
- `beard`: `true` (full) | `"full"` | `"goatee"` | `"stubble"` — facial hair (default none).
- `body` (optional): `full` (default) or `bust` — a **floating head + neck + arms** with no
  torso/legs, e.g. a talking-head professor that gestures while explaining. `bust: true` works too.
  Position it with `pos` (a bust usually sits higher, e.g. `"pos": { "y": 45 }`); pair it with
  `camera.focus { on: "id.face" }` for an expressive close-up.
- Engine adds idle life automatically (breathing, sway, blinking) based on mood.

### Pose fields
- `base`: `stand` | `sit` | `crouch` | `lie` | `sleep` (sleep = lie + eyes closed).
- `bend`: slouch 0..0.4 (0.1 = visibly bored slump, 0.4 = deep bow).
- `lean`: whole-torso lean, −0.2..0.2 (positive = forward).
- `headTilt`: −0.3..0.3 (positive = head drooping forward).
- `tilt`: whole-body tilt in **degrees**, rotating around the feet (positive = forward).
  For the Michael-Jackson lean: `pin` the feet, then tween `tilt` to ~24.
- `stance`: `together` | `normal` | `wide`.

### Expression fields (all optional)
`smile` −1..1 · `eyeOpen` 0..1 · `browTilt` −1 (angry)..1 (sad) · `browRaise` 0..1 ·
`mouthOpen` 0..1 · `pupilX`/`pupilY` −1..1 (gaze direction) ·
`browSkew` −1..1 (raise one eyebrow — quizzical) · `tears` 0..1 (crying) · `blush` 0..1 (cheeks).

### Moods (presets for face + posture + idle motion)
`neutral` `happy` `ecstatic` `laughing` `bored` `thinking` `angry` `sad` `crying`
`surprised` `scared` `worried` `confused` `disgusted` `proud` `embarrassed` `love` `sleepy`
(pair `love` with `emote: { symbol: "heart" }` for the full effect.)

## Timeline events

Each event: `{ "at": ..., "target": "figId", "cmd": "...", "dur": "...", "args": { ... } }`

### Timing rules (important)
- **Omit `at`** → the event starts when the previous event ends (sequential). This is the default — use it for most events.
- `"at": 2.5` → absolute seconds (inside a clip: relative to clip start).
- `"at": "+quick"` → previous end + offset. `"at": "-quick"` → previous end − offset (overlap).
- `"at": "<"` → starts together with the previous event. `"at": "<+fast"` → previous start + offset.
- Durations: `veryFast` 0.15s · `fast` 0.3s · `quick` 0.5s · `normal` 1s · `slow` 2s · `verySlow` 4s, or a number of seconds.
- `target` may be an id or an array of ids.

### Commands

| cmd | args | notes |
|---|---|---|
| `move` | `{ "style": "walk\|run\|slide\|moonwalk", "to": {x,y} or "anchor" }` | duration auto from distance if `dur` omitted. Auto-faces travel direction (moonwalk faces backwards). Legs animate automatically. |
| `hop` | `{ "height": 2.2 }` | small jump in place |
| `mood` | `{ "name": "bored", "animated": true }` | tween to a mood preset |
| `expression` | any expression fields | tween individual face channels |
| `pose.tween` | any pose fields (`base`, `bend`, `lean`, `headTilt`, `tilt`, `stance`) | smooth pose change |
| `joints` | `{ "shoulderR": 165, "elbowR": 20, ... }` | low-level FK, see angle convention below. Use sparingly. |
| `raiseArm` / `lowerArm` | `{ "side": "left\|right\|both", "angle": 160 }` | |
| `liftLeg` / `lowerLeg` | `{ "side": "right", "angle": 70 }` | |
| `point` | `{ "hand": "right", "to": ... }` | aims arm + gaze at target |
| `lookAt` | `{ "to": ... }` (`null` to reset) | moves pupils + slight head tilt |
| `reachTo` | `{ "hand": "right", "to": ... }` | IK: hand reaches a point and stays there |
| `pin` | `{ "foot": "both\|left\|right\|false", "hand": ..., "to": ... }` | locks feet/hands in place (omit `to` to pin where they are) |
| `hands` | `{ "hand": "right", "shape": "fist" }` or `{ "left": "fist", "right": "open" }` | mitten hand shapes: `relaxed` `open` `fist` `point` `spread` (sketch/toon styles). `point` cmd and angry mood set them automatically. |
| `release` | `{ "hand": "right" }` / `{ "foot": "both" }` | undo reach/pin |
| `blink` | `{}` | (auto-blink already happens) |
| `say` | `{ "text": "...", "dur": ..., "sing": false, "voice": {...} }` | speech bubble + mouth movement; dur auto from length. If the viewer turns **sound** on, lines are spoken aloud (default voice: British English, male). `sing: true` makes it sing-song. `voice` (same fields as the figure `voice`, incl. `lang`/`accent`) overrides this line only. |
| `emote` | `{ "symbol": "?\|!\|...\|zzz\|heart\|music\|sparkle\|idea" }` | floating symbol above head |
| `scene.caption` | `{ "text": "...", "dur": "slow" }` | narrator text at the bottom |
| `playClip` | `{ "name": "wave", "repeat": 2 }` | run a clip |
| `wait` | — (use `dur`) | beat of stillness |
| `facing` | `{ "dir": "left\|right" }` | instant turn |
| `camera.panTo` | `{ "to": ... }` | |
| `camera.zoom` | `{ "scale": 1.5, "to": ... }` | scale 1 = full scene |
| `camera.set` | `{ "x": 50, "y": 50, "scale": 1, "tilt": 0 }` | instant |
| `camera.focus` | `{ "on": "id" }` | zoom/pan so the target **fills the frame** (auto-fit). `on` can be a board, a **whole figure** (`"ana"`), or a **face/head close-up** (`"ana.face"` — great for showing subtle emotion). Or frame a region with `{ "rect": { "x":..,"y":..,"w":..,"h":.. } }`. `pad` adjusts margin; `scale` forces a fixed zoom on a point instead of auto-fit. |
| `camera.reset` | — | back to the whole scene (zoom 1, level) |
| `camera.cut` | `{ "on": "id", "scale": 2, "tilt": 8 }` | instant version of focus — same `on` / `rect` auto-fit (e.g. `{ "on": "ana.face" }`), or explicit `x`/`y`/`scale`. |
| `camera.tilt` | `{ "to": 8 }` or `{ "by": 5 }` | Dutch-angle roll, in degrees |
| `camera.shake` | `{ "amount": 1.5 }` | quick camera shake (impact/excitement) |
| `camera.follow` | `{ "target": "figId", "offset": -6 }` | pan to track a walking figure (use with the move, `"at": "<"`) — for side-scrolling |
| `scene.fade` / `scene.cut` | `{ "to": "street" }` or `{ "bg": "#...", "elements": [...] }` | change the backdrop (new setting) — fade for a soft transition, cut for instant |
| `give` (alias `hold`) | `{ "prop": "apple", "hand": "right" }` | put a prop in a hand — it then **follows the hand**. `prop` is a library name or an existing object id. The arm eases to a holding pose. Options: `scale`, `color`, `follow` (force/forbid arm-rotation), `angle` (fixed aim). |
| `drop` (alias `putDown`) | `{ "hand": "right", "to": "ground" }` | release the held prop; it stays where dropped, or settles to a point / `"ground"`. |
| `throw` | `{ "hand": "right", "to": "bob.chest", "spin": 2 }` | toss the held prop along an arc to a target (point/anchor), with spin. `height` controls the arc. |
| `pickUp` | `{ "object": "ann_ball", "hand": "right" }` | reach to a prop already on stage (by object id or point) and grab it. |
| `handOff` | `{ "to": "bob", "toHand": "left" }` | pass the held prop to another figure's hand. Position the two figures close together first. |

### Props (held objects)
Library names for `give`/`throw`/`pickUp`: **loose (upright)** — `apple` `ball` `cup` `coffee` `book` `phone` `balloon` `briefcase` `sign`; **directional (point along the arm)** — `gun` `sword` `wand` `pencil`. The prop is created automatically the first time you `give` it (object id = `<figId>_<prop>`, e.g. `ann_apple`), so you can later `throw`/`pickUp`/`handOff` it. `drop`/`throw`/`handOff` with no `hand` act on the right hand if it holds something, else the left.

**Custom props (not in the library):** `give` also accepts an inline prop definition — author any shape and the engine makes it grabbable:
`{ "cmd": "give", "target": "ana", "args": { "prop": { "shape": "path", "props": { "d": "M 0 0 L 0 -4 L 2.6 -3 L 0 -2 Z", "fill": "#e74c3c" }, "grip": { "x": 0, "y": 0 }, "directional": false }, "hand": "right" } }`
`grip` is the hand-contact point in your shape's own coordinates (where the hand holds it); `directional: true` makes it aim along the forearm. The same `grip`/`directional` fields also work on objects declared in the top-level `objects` array, so a custom object can be held by id too. (Each prop is a single shape/path.)

### Joint angle convention
Degrees. `0` = limb hanging straight down, **positive = forward** (in facing
direction), `90` = horizontal forward, `180` = straight up, negative = backward.
`elbow*` ≥ 0 bends the forearm forward; `knee*` ≥ 0 bends the shin backward.
The same angles work whichever way the figure faces.

### Built-in clips
`wave` `clapOnce` `shrugOnce` `scratchHead` `nod` `bow` `hopJoy` `facepalm` `stretchYawn`
`thinkChin` (hand on chin) `victory` (arms up, spread hands) `phoneCall` `coolLean`

Define your own clips for anything repeated:

```json
"clips": {
  "tantrum": [
    { "cmd": "joints", "dur": "veryFast", "args": { "shoulderL": 170, "shoulderR": 170 } },
    { "cmd": "joints", "dur": "veryFast", "args": { "shoulderL": 30, "shoulderR": 30 } }
  ]
}
```
Play with `{ "target": "sam", "cmd": "playClip", "args": { "name": "tantrum", "repeat": 3 } }`.

## Scene

- `theme`: `blank` | `classroom` (blackboard with anchors `board.center`, `board.write`) |
  `street` (buildings, sun, lamppost) | `bedroom` (bed with anchors `bed.pillow`, `bed.center`).
- Custom elements:

```json
"scene": {
  "theme": "blank",
  "elements": [
    { "id": "table", "type": "rect", "layer": "mid",
      "props": { "x": 60, "y": 62, "w": 20, "h": 2, "fill": "#8a6f4d" },
      "anchors": { "top": [70, 62] } }
  ]
}
```

Types: `rect` (x,y,w,h,fill,rx) · `circle` (cx,cy,r) · `ellipse` · `line` (x1,y1,x2,y2) ·
`text` (x,y,text,size) · `path` (d) · `repeat` (tile a child shape across a range:
`{ "of": {"type":"rect","props":{...}}, "from":0, "to":200, "step":28 }`). Layers: `back`, `mid` (default), `front`.

**Depth & long worlds:** set `"scene": { "parallax": true }` so far layers move slower than near
ones when the camera pans (fake 3D depth). Coordinates aren't limited to 0–100 — place
scenery out to the right and use `camera.follow` for a side-scrolling journey. `repeat` makes
an "endless" background cheaply.

Anchor references work anywhere a point is expected: `"board.write"`, `"sun.center"`,
plus figure anchors: `"sam"` (feet), `"sam.head"`, `"sam.chest"`, `"sam.hand.right"`.

## Objects (animatable props)

For simple things that move, grow, spin, fade, or change colour — balls, boxes,
signs, suns, props — use **objects**. They are NOT stick figures (no skeleton):
just a shape you animate with a few verbs. Geometry is authored exactly like a
scene element. List them at the top level in `"objects"`:

```json
"objects": [
  { "id": "ball", "shape": "circle", "layer": "front",
    "props": { "cx": 50, "cy": 40, "r": 3, "fill": "#e0533a" } }
]
```

- `shape`: `circle` `rect` `ellipse` `line` `path` `text` (same props as scene elements).
- `layer`: `back` `mid` `fig` `front` (default `front`).
- `hidden: true` starts it invisible (then `appear`).
- The object's pivot (centre of scale/rotation) is the shape's natural centre,
  or set `"pivot": { "x": .., "y": .. }`.

### Object commands (each needs `target`: an object id)

| cmd | args | notes |
|---|---|---|
| `appear` / `disappear` | `dur` | fade in / out (opacity) |
| `moveTo` | `{ "to": {x,y} or "anchor" }` | glide to a point (straight line) |
| `arc` | `{ "to": ..., "height": 20, "spin": 1 }` | **toss**: a parabola up-and-over to a point; optional `spin` (turns). Use this for throwing/juggling/bouncing. |
| `grow` / `shrink` | `{ "by": 1.5 }` | multiply current size |
| `scale` | `{ "to": 2 }` | absolute size (1 = original) |
| `rotate` | `{ "to": 90 }` or `{ "by": 45 }` | degrees |
| `spin` | `{ "turns": 2, "dir": "cw\|ccw" }` | full turns |
| `color` | `{ "to": "#3a86e0" }` | change fill (instant) |

Objects honour the same timing (`at`, `dur`) and `playClip`/`repeat` as figures,
and any object id works as a point reference (it tracks the moving object), e.g.
`{ "cmd": "lookAt", "args": { "to": "ball" } }`.

**Juggling pattern** — `arc` + a repeated clip + staggered starts:

```json
"objects": [
  { "id": "b1", "shape": "circle", "props": { "cx": 46, "cy": 58, "r": 2.2, "fill": "#e0533a" } },
  { "id": "b2", "shape": "circle", "props": { "cx": 54, "cy": 58, "r": 2.2, "fill": "#3a86e0" } }
],
"clips": {
  "cycleL": [
    { "cmd": "arc", "dur": "quick", "args": { "to": { "x": 54, "y": 58 }, "height": 22, "spin": 1 } },
    { "cmd": "arc", "dur": "quick", "args": { "to": { "x": 46, "y": 58 }, "height": 22, "spin": 1 } }
  ]
},
"timeline": [
  { "at": 0.5, "target": "b1", "cmd": "playClip", "args": { "name": "cycleL", "repeat": 4 } },
  { "at": 0.83, "target": "b2", "cmd": "playClip", "args": { "name": "cycleL", "repeat": 4 } }
]
```

## Boards (writing on a blackboard / whiteboard)

For a character that teaches, presents, or writes things down, use a **board** — a
styled panel you write markdown to. Text is laid out, wrapped, and revealed with a
left-to-right handwriting "wipe", and auto-scrolls up when it overflows. Define
boards at the top level in `"boards"`:

```json
"boards": [
  { "id": "bb", "rect": { "x": 5, "y": 6, "w": 56, "h": 60 }, "style": "chalk" }
]
```

- `style`: `chalk` (dark board, light text — default) | `marker` (white board, dark text).
- Optional: `bg`, `color` (text/chalk colour), `font` (`handwriting` default | `clean` | `mono` | any family), `fontSize` (default 3.2), `pad`, `frame: false`, `layer`, `hand: true`.
- A **chalk hand** that holds the chalk and tracks the exact point being written/drawn appears automatically when a `board.write`/`board.draw` names a writer via `by` (or set `hand: true` for a writer with no figure). Stand the named figure next to the board.
- Defaults give a large chalkboard, so `rect` is optional.

### Board commands (target an object/board id)

| cmd | args | notes |
|---|---|---|
| `board.write` | `{ "md": "..." }`, plus optional `"by": "figId"` | Write markdown. With `by`, that figure's hand animates as if writing (stand it near the board). `dur` sets writing speed (auto from length otherwise). |
| `board.draw` | `{ "chart": "supply-demand", "xlabel": "...", "ylabel": "..." }` or `{ "shapes": [...] }` | draw a diagram, animated stroke-by-stroke. `by` and `dur` work like `board.write`. Shapes/preset parts can take an `id` for highlighting. |
| `board.highlight` | `{ "target": "demand", "color": "yellow", "dur": 3 }` | circle an element (by `id`) or a written word while talking about it; holds `dur` seconds then fades (`hold: true` keeps it). |
| `board.unhighlight` | — | remove current highlights |
| `board.clear` | — | wipe the board and start fresh at the top |
| `board.erase` | `{ "lines": 2 }` | erase the last N written lines |

**Coloured words:** inline `{colour|text}` anywhere in markdown — named (`red orange amber yellow green teal blue sky purple pink white black`) or hex, e.g. `# {amber|Supply} & {sky|Demand}`. A board `accent` colour auto-colours all headings.

**Highlighting:** the `supply-demand` preset auto-names its parts `axes`, `demand`, `supply`, `equilibrium`, so `board.highlight { target: "demand" }` works immediately. For custom shapes add `"id"`. Pairs naturally with speech: `say "demand slopes down"` + `board.highlight { target: "demand" }` (use `"at": "<"` to do both at once).

**Math equations:** write real math inside `board.write` markdown — `$...$` inline LaTeX, `$$...$$` display LaTeX, and `` `...` `` for AsciiMath. E.g. `"md": "The derivative: $$MC = \\frac{dC}{dQ}$$"` or `"md": "if $C = Q^2$ then $MC = 2Q$"`. (In JSON, escape backslashes: `\\frac`.) Math is typeset (not handwritten) and renders only when the viewer is online the first time; offline it shows the raw source. Prefer LaTeX; AsciiMath is the simpler `` `int_0^1 x dx = 1/2` `` style.

**Zoom to the board:** `camera.focus { on: "bb" }` zooms/pans so the board fills the frame; `camera.reset` returns to the whole scene.

### Drawing diagrams (`board.draw`)

Easiest is the `chart` preset (axes + Demand & Supply curves + equilibrium dot + labels):

```json
{ "target": "bb", "cmd": "board.draw", "by": "prof", "dur": "slow",
  "args": { "chart": "supply-demand", "xlabel": "Quantity", "ylabel": "Price" } }
```

For anything else, give `shapes` — coords are normalized `0..1`, origin bottom-left:

```json
"args": { "shapes": [
  { "t": "axes", "xlabel": "Q", "ylabel": "P" },
  { "t": "curve", "from": [0.1,0.85], "to": [0.9,0.1], "label": "D", "bow": 0.2 },
  { "t": "line",  "from": [0.1,0.1], "to": [0.9,0.9], "label": "S" },
  { "t": "dot",   "at": [0.5,0.5], "label": "E*" },
  { "t": "label", "at": [0.5,1.0], "text": "Market" }
] }
```
Shapes draw in order over `dur`. The diagram sits in the content flow (write text, draw a chart, write more — it auto-scrolls).

Markdown subset: `# Heading`, `## Subheading`, `**bold**`, `*italic*`, `__underline__`,
`- bullet`, blank line = gap, `---` = divider. Put a real newline (`\n`) between lines.
A board id is also a point reference (`"bb"`, `"bb.center"`, `"bb.tr"`) for `camera`/`reachTo`.

Example — a professor teaching:

```json
{ "at": 0, "target": "bb", "cmd": "board.write", "by": "prof", "dur": "slow",
  "args": { "md": "# Supply & Demand\n\n- Price on the **Y** axis\n- They meet at __equilibrium__." } }
```

## Style guide for good scenes

1. Open with a `scene.caption` to set context; keep total length ~10–30 s.
2. Sequential by default; use `"at": "<"` when two characters react simultaneously.
3. Let `move` compute its own duration. Walk distances of 20–50 units read well.
4. One emotional beat at a time: mood → gesture/clip → say. Don't stack 5 things at once.
5. Use `say` for dialogue, `scene.caption` for narration, `emote` for inner state.
6. Prefer clips & semantic commands; drop to `joints` only for special choreography.
7. End with a small button: a bow, a hop, an emote, or a final caption.

## Complete example

```json
{
  "v": 1,
  "scene": { "theme": "street" },
  "figures": [
    { "id": "ana", "archetype": ["woman"], "pos": { "x": 20, "y": 70 }, "mood": "happy" },
    { "id": "bo", "archetype": ["man"], "pos": { "x": 78, "y": 70 }, "facing": "left", "mood": "bored" }
  ],
  "timeline": [
    { "at": 0, "cmd": "scene.caption", "args": { "text": "Ana has news.", "dur": "normal" } },
    { "at": 0, "target": "ana", "cmd": "move", "args": { "style": "run", "to": { "x": 60, "y": 70 } } },
    { "target": "ana", "cmd": "say", "args": { "text": "We shipped it!" } },
    { "at": "<", "target": "bo", "cmd": "lookAt", "args": { "to": "ana.head" } },
    { "target": "bo", "cmd": "mood", "args": { "name": "surprised" } },
    { "target": "bo", "cmd": "emote", "args": { "symbol": "!" } },
    { "target": ["ana", "bo"], "cmd": "playClip", "args": { "name": "hopJoy" } },
    { "target": "bo", "cmd": "mood", "at": "<", "args": { "name": "ecstatic" } },
    { "cmd": "scene.caption", "args": { "text": "It even passed the tests.", "dur": "slow" } }
  ]
}
```
