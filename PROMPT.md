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

- `archetype`: `man` | `woman` | `kid` | `person` (sets hair/height defaults).
- `character`: `professor` (glasses) | `student` | `dancer` (fedora) — stronger presets.
- `voice` (optional): controls spoken audio when the viewer enables sound. By
  default a voice is derived from the figure's archetype + current mood, so you
  usually omit this. Override with `{ "gender": "male\|female\|child", "pitch":
  0.1..2 or "high\|low", "rate": 0.4..2.2 or "fast\|slow", "volume": 0..1 }`.
- `hair`: `none` | `short` | `tuft` | `long` | `bun` | `sides`. Also `glasses: true`, `hat: "fedora"`.
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
`mouthOpen` 0..1 · `pupilX`/`pupilY` −1..1 (gaze direction).

### Moods (presets for face + posture + idle motion)
`neutral` `happy` `ecstatic` `bored` `thinking` `angry` `sad` `surprised` `sleepy`

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
| `say` | `{ "text": "...", "dur": ..., "sing": false, "voice": {...} }` | speech bubble + mouth movement; dur auto from length. If the viewer turns **sound** on, lines are spoken aloud (browser voices). `sing: true` makes it sing-song. `voice` overrides this line only. |
| `emote` | `{ "symbol": "?\|!\|...\|zzz\|heart\|music\|sparkle\|idea" }` | floating symbol above head |
| `scene.caption` | `{ "text": "...", "dur": "slow" }` | narrator text at the bottom |
| `playClip` | `{ "name": "wave", "repeat": 2 }` | run a clip |
| `wait` | — (use `dur`) | beat of stillness |
| `facing` | `{ "dir": "left\|right" }` | instant turn |
| `camera.panTo` | `{ "to": ... }` | |
| `camera.zoom` | `{ "scale": 1.5, "to": ... }` | scale 1 = full scene |
| `camera.set` | `{ "x": 50, "y": 50, "scale": 1 }` | instant |

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
`text` (x,y,text,size) · `path` (d). Layers: `back`, `mid` (default), `front`.

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
- Optional: `bg`, `color` (text/chalk colour), `font` (`handwriting` default | `clean` | `mono` | any family), `fontSize` (default 3.2), `pad`, `frame: false`, `layer`.
- Defaults give a large chalkboard, so `rect` is optional.

### Board commands (target an object/board id)

| cmd | args | notes |
|---|---|---|
| `board.write` | `{ "md": "..." }`, plus optional `"by": "figId"` | Write markdown. With `by`, that figure's hand animates as if writing (stand it near the board). `dur` sets writing speed (auto from length otherwise). |
| `board.clear` | — | wipe the board and start fresh at the top |
| `board.erase` | `{ "lines": 2 }` | erase the last N written lines |

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
