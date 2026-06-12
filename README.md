# stick

A tiny stick-figure animation language: describe a scene in JSON, watch it play
as an animated SVG cartoon. Designed so an LLM can write the JSON for you.

Figures come in three switchable visual styles rendered from the same skeleton:
`sketch` (hand-drawn wobbly lines with a touch of line boil — the default),
`ink` (clean minimal stick), and `toon` (filled cartoon body). See the
"three styles" example in the playground.

## Run

Open `index.html` in a browser. The player itself has no build step, no server,
no dependencies. The deployed app lives at https://stickhans.netlify.app/
(GitHub Pages serves a static mirror without the AI features).

- Pick an animation from the dropdown; the JSON source is behind the `{ } JSON` toggle
  (**Render** / Ctrl+Enter applies edits).
- **Space** plays/pauses, the slider scrubs, `⟲` restarts.
- **⬆ Upload** loads a stick JSON file; **⬇ JSON** / **⬇ WebM** download the current
  animation (WebM records in real time while the scene replays).
- Problems with the JSON appear in the warnings panel — the engine never blanks
  the screen over a bad event; it skips it and tells you.
- Signed-in users get a **Create** panel: describe a scene in plain words and an
  edge function asks Claude to write the JSON. Created/uploaded animations are
  saved in the browser (localStorage) under "my animations".

## AI create endpoint (Netlify)

`netlify/edge-functions/create-animation.ts` proxies the Anthropic API so the
key never reaches the browser. Sign-in reuses the m2py mechanism: email
magic-codes issued by the Anvil backend (`mdataapi.anvil.app`), validated
per-request by the edge function; a shared access code (env var) also works.

Required Netlify env vars: `ANTHROPIC_API_KEY`. Optional: `ANTHROPIC_MODEL`
(default `claude-sonnet-4-6`), `STICK_ACCESS_TOKEN` (shared access code),
`STICK_ANVIL_VALIDATE_URL`.

`_lib/stick-prompt.ts` is generated from `PROMPT.md`. After editing PROMPT.md,
regenerate it (PowerShell):

```powershell
$p = [IO.File]::ReadAllText("PROMPT.md", [Text.Encoding]::UTF8)
$json = ConvertTo-Json -InputObject $p
$out = "// AUTO-GENERATED from PROMPT.md - do not edit by hand.`n// Regenerate after editing PROMPT.md (see README, 'AI create endpoint').`n`nexport const STICK_SYSTEM_PROMPT: string =`n  $json;`n"
[IO.File]::WriteAllText("netlify/edge-functions/_lib/stick-prompt.ts", $out, (New-Object Text.UTF8Encoding $false))
```

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
