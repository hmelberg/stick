# stick

A tiny stick-figure animation language: describe a scene in JSON, watch it play
as an animated SVG cartoon. Designed so an LLM can write the JSON for you.

Figures come in three switchable visual styles rendered from the same skeleton:
`sketch` (hand-drawn wobbly lines with a touch of line boil — the default),
`ink` (clean minimal stick), and `toon` (filled cartoon body). See the
"three styles" example in the playground.

## Run

Open `index.html` in a browser. No build step, no server, no dependencies.

- Pick an example from the dropdown, or paste/edit JSON and hit **Render** (Ctrl+Enter).
- **Space** plays/pauses, the slider scrubs, `⟲` restarts.
- Problems with the JSON appear in the warnings panel — the engine never blanks
  the screen over a bad event; it skips it and tells you.

## Use with an LLM

Give the model the contents of [PROMPT.md](PROMPT.md) plus a description of the
scene you want ("a bored student gets confused and shrugs"). Paste the JSON it
returns into the editor. If the warnings panel complains, paste the warnings
back to the model and ask it to fix them.

## How it works

Everything is a pure function of time. `compile(json)` expands every timeline
command into tweens on named channels (`sam.x`, `sam.shoulderL`, `sam.smile`,
`cam.z`, …); each frame samples all channels at time `t` and redraws the SVG.
That's what makes scrubbing, pausing, and deterministic replay free.

On top of the tweened base pose the engine layers procedural motion — walking
gaits driven by distance traveled, breathing, idle sway, auto-blinks — and then
applies constraints (pinned feet, reaching hands) with two-bone IK.

| file | role |
|---|---|
| `js/engine.js` | easing, channels/tweens, compiler core |
| `js/commands.js` | every JSON command, expanded into tweens |
| `js/figure.js` | skeleton math, gait, IK, idle life |
| `js/styles.js` | the three visual styles (ink / sketch / toon), faces, mitten hands |
| `js/scene.js` | scenery, themes, anchors, point resolution |
| `js/presets.js` | durations, moods, characters, built-in clips, themes |
| `js/examples.js` | bundled example scenes |
| `js/app.js` | playground UI |
| `PROMPT.md` | the reference you hand to an LLM |

## Test

```
node test/smoke.js
```

Compiles every bundled example and samples the full timeline, checking for
exceptions, NaN positions, and unexpected warnings.
