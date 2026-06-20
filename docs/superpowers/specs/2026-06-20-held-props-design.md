# Held Props — Design Spec

**Date:** 2026-06-20
**Status:** Approved (design), pending implementation plan
**Scope:** Hand-attached props for the `stick` animation engine — give/hold, drop, throw, pick up, hand off. Sibling features (new emotions + intensity, per-figure variation) are deliberately **out of scope** for this round.

## 1. Goal

Let a figure hold an object in a hand so the object follows the hand each frame (an apple, a gun, a cup…), and let figures pick props up, put them down, throw them along an arc, and hand them to each other. The DSL must stay easy for an LLM to author: naming a prop ("give ana an apple") should produce a correct-looking result with no manual posing or geometry.

## 2. Background (current engine)

- **Objects** (`doc.objects`) are simple shapes (`circle/rect/ellipse/line/path/text`) animated through channels `id.tx/.ty/.scale/.rot/.opacity/.fill`, each with a `pivot` (natural centre) and a `layer` (`back/mid/fig/front`). Defined/normalized at compile time (`STICK.normalizeObject`, `STICK.initObjectChannels`).
- **Figures** expose live world joint positions via `STICK.computeFigure(rt, fig, t)` → `P.world.{handL,handR,head,…}` and local arm joints `P.armL/armR.{elb,hand}`, plus `P.toWorld(localPt)` to convert local→world (scene coords, pre-camera).
- **Draw loop** (`js/app.js draw()`): computes a `Ps` map of every figure's pose **first**, then draws objects. Object transform is:
  `translate(tx ty) translate(px py) rotate(rot) scale(sc) translate(-px -py)`.
- **`rt.loco`** is a list of locomotion intervals (`{fig,t0,t1,style,x0,y0}`) consulted during pose computation. Held props use the same pattern.
- **Compile → build order:** `render()` runs `STICK.compile(doc)` (which executes every timeline command, laying down channels and side-effects) and *then* `rebuildStage(rt)` builds DOM nodes for everything in `rt.objs`. So a command may create a prop object during compile and it will get a DOM node automatically — no runtime DOM creation needed.
- **Hand IK already exists:** `reachTo`, `pin`, `release` set `reach{L,R}{on,x,y}` channels; `joints`/`raiseArm` set shoulder/elbow.

## 3. Core mechanism — grips

Add a runtime list, analogous to `rt.loco`:

```
rt.grips = [ { obj, fig, hand /* 'L'|'R' */, t0, t1 /* number, ∞ while held */, follow /* bool|null */ } ]
```

A grip means "object `obj` is held by figure `fig`'s `hand` from `t0` until `t1`."

- **Opened** by `give`/`pickUp`/`handOff` with `t1 = Infinity`.
- **Closed** by `drop`/`throw`/`handOff`: set `t1` to the release time and write the release position/rotation into the object's `tx/ty/rot` channels (a `set` keyframe) so the object stays where it left the hand.
- **One grip per (fig, hand)** at a time. Release commands (`drop/throw/handOff`) find the active grip for a `(fig, hand)`; if `hand` is omitted they act on whichever hand currently holds something.

### Draw-time application (`js/app.js draw()`)

After the `Ps` map is built and before/while drawing objects, for each object look up an active grip (`t0 ≤ t < t1`). If held:

1. Get the holder's pose `P = Ps.get(grip.fig)` (already computed). If absent, fall through to channel-driven transform.
2. `handW = P.world['hand' + grip.hand]`. Compute `tx = handW.x − obj.pivot.x`, `ty = handW.y − obj.pivot.y` so the prop's **grip point (= its pivot)** sits exactly at the hand.
3. Rotation: if the prop is `directional` (or `follow === true`): `elbW = P.toWorld(P['arm'+grip.hand].elb)`; `rot = atan2(handW.y − elbW.y, handW.x − elbW.x)` (+ the prop's authored base angle). Loose props (or `follow === false`): keep the object's current `rot` channel (usually 0).
4. Apply `scale` from the object's channel as today.

While gripped, this **overrides** the object's `tx/ty/rot` channels; when not gripped, channels drive the object normally (so a dropped prop obeys `set` keyframes / later tweens). Held props live on the **`fig` layer** so they share the figures' camera/parallax transform and align exactly with the hand (the `front` layer can carry a different parallax factor); within that layer they are drawn after figures so they render in front of the body.

## 4. Built-in prop library (`js/props.js`, new file)

`STICK.props` is a table of named props. Each entry:

```
apple: {
  shape: 'path' | 'circle' | …,
  props: { … SVG geometry authored around the grip point … },
  grip:  { x, y },        // hand-contact point (becomes the object's pivot)
  directional: false,     // true → rotates to the forearm
  baseAngle: 0,           // authored orientation offset (deg) for directional props
  scale: 1,               // default scale
  fill: '#c0392b',        // default colour (overridable)
  layer: 'fig',
}
```

Starter set (≈15): `apple, ball, cup, coffee, balloon, book, briefcase, phone, sign, flower, umbrella, pencil, gun, sword, wand`. Directional: `gun, sword, wand, pencil, phone`. The rest are loose/upright. Geometry is simple stick-style (paths + basic shapes), drawn in the same minimal aesthetic as the figures.

Helpers in `js/props.js`:
- `STICK.makeProp(rt, name, opts)` → creates a normalized object from a library entry (applying `scale`/`color`/`id` overrides), registers it in `rt.objs`, and inits its channels; returns the object. Generates a unique id (`<figId>_<name>`, with a numeric suffix on collision) unless an explicit `id` is given.
- `STICK.propAngle(P, hand, baseAngle)` → forearm angle helper used by the draw loop (kept here so the geometry/orientation logic lives with the library).

`give`/`pickUp` accept either a **library name** (auto-create via `makeProp`) or an **existing object id** (escape hatch — used as-is, `directional` inferred from an optional `obj.directional` flag or treated as loose).

## 5. Commands (DSL)

All are figure-targeted (`target: figId`). `hand` accepts `left|right` (default `right`).

| cmd | args | behaviour |
|---|---|---|
| `give` (alias `hold`) | `{ prop, hand, scale?, color?, follow?, id? }` | Create/resolve the prop, open a grip on `(fig,hand)` at `t0`, and ease the holding arm to a default hold pose. Returns the pose duration. |
| `drop` (alias `putDown`) | `{ hand?, to? }` | Close the active grip; write the prop's current hand position to its channels. If `to` is `"ground"` or a point, tween `ty` so it settles there. |
| `throw` | `{ hand?, to, spin?, height? }` | Close the grip; animate `tx/ty` along a parabola from the hand to the resolved `to` (default arc `height`), sampled into ~10 short linear tween segments, plus a `rot` spin tween. Prop rests where it lands. A short throwing arm motion accompanies it. |
| `pickUp` | `{ object, hand }` | `object` is an **existing on-stage object id** (e.g. a prop dropped earlier, or an authored `objects` shape) — or a resolvable point. `reachTo` that position over a short dur, open a grip at the end of the reach, then ease to the hold pose (releasing the reach). Picking up a library prop that isn't on stage is a no-op + warning (use `give` to materialise a new prop). |
| `handOff` | `{ to, hand?, toHand? }` | Close the giver's active grip on `(fig, hand)` and, at the same instant, open one on `to`'s `toHand` (default `left`); ease the receiver's arm to the hold pose so the prop reads as received. Authors position the two figures close together; no automatic walk-together. |

**Hold pose:** `give`/`pickUp` tween the holding arm via existing joint channels to roughly `shoulder ≈ 35°, elbow ≈ 110°` (hand in front of the body). Fully overridable afterward with `raiseArm`/`joints`/`reachTo`; the prop keeps following the hand regardless of subsequent posing.

**Orientation override:** `follow: true|false` forces/forbids forearm rotation; an explicit `angle: n` (on `give`) pins a fixed rotation.

## 6. Files touched

- **`js/props.js`** (new) — `STICK.props`, `STICK.makeProp`, `STICK.propAngle`. Add `<script src="js/props.js">` to `index.html` after `scene.js`, before `commands.js`.
- **`js/engine.js`** — add `grips: []` to the `rt` object.
- **`js/commands.js`** — handlers `give/hold`, `drop/putDown`, `throw`, `pickUp`, `handOff`, plus grip open/close helpers.
- **`js/app.js`** — in `draw()`, apply active grips to object transforms (override `tx/ty/rot`).
- **`js/examples.js`** — one new example showcasing give → throw / hand off.
- **`PROMPT.md`** — a "Props" section: library names + the five commands.

## 7. Edge cases & decisions

- **Multiple props / same name:** unique generated ids; release commands key off `(fig,hand)`, so authors never need to name the prop to drop/throw it.
- **Seek/scrub & loop:** grips are pure time intervals (like `loco`) and prop motion is in channels, so scrubbing backward/forward and looping are deterministic — no stateful playback.
- **Parallax:** held props on the `fig` layer share the figure's parallax factor, guaranteeing hand alignment even in parallax scenes.
- **Holding while walking:** the prop reads `P.world.hand` each frame, so it tracks arm swing during a walk automatically.
- **Released prop physics:** `drop` leaves the prop at the release point (optionally settling to ground); no continuous gravity/bounce simulation in this round (YAGNI). `throw` uses a single sampled parabola, not a physics loop.
- **Bust figures:** props attach to hands, which busts have, so held props work on busts too.

## 8. Verification

- **Headless (chrome-devtools `evaluate_script`):**
  - While held: the prop's drawn grip point is within a small tolerance of `P.world.hand` across several sampled times (including mid-walk).
  - After `drop`: prop position is static at the release point.
  - After `throw`: prop lands within tolerance of the target; mid-flight `ty` is above the chord (arc).
  - After `handOff`: the active grip's `fig` changes at the handoff time.
  - Directional prop (gun): drawn `rot` ≈ forearm angle.
- **Visual screenshots:** apple in hand (loose/upright), gun pointing along a raised arm, a throw arc, a hand-off between two figures.
- **Regression:** every existing example still compiles with **no warnings**.
- **New example** renders cleanly and reads clearly.

## 9. Out of scope (future rounds)

- New emotions (crying, confused) + intensity modifiers ("very angry/sad").
- Per-figure random face variation.
- Continuous physics (gravity, bouncing, collisions).
- Two-handed props / props that deform.
