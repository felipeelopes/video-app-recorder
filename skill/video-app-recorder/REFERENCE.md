# Reference — video-app-recorder

## Contents

- [Capture plan](#capture-plan)
- [Config](#config)
- [Scene types](#scene-types)
- [Chat conversation](#chat-conversation)
- [Variants](#variants)
- [Music and sound](#music-and-sound)
- [Pitfalls](#pitfalls)

## Capture plan

`capture.plan.json`:

| Field | Meaning |
|---|---|
| `base` | App URL. Only `localhost`/`127.0.0.1` unless `allowRemote: true` or `--allow-remote` (staging with demo data only). |
| `viewport` | `{ width, height, scale }`, default 1920×1080×1. |
| `login` | Optional. `check` (route that needs a session), `loginUrlPattern` (regex of the login URL), `steps` (see below), `captchaSelector` (stops the run; solve with `--headed`), `timeout` (s). |
| `state` | localStorage keys applied before every shot (`null` removes; `"prefix*": null` removes by prefix). Keeps UI toggles from leaking between shots. |
| `beforeEach` | Steps run at the start of every shot. |
| `shots[]` | `name`, `route`, `waitFor` (selector), `delay` (ms), `record` (extra seconds of video after the steps; the recording starts before the first step), `steps`, `selector` (crop to element), `fullPage`, `state`, `keepState`, `description`. |
| `extras[]` | `{ from, name, description }` files copied next to the captures (logos, icons). |
| `profileDir` | Browser profile (default `~/.cache/video-app-recorder/profile`); the session survives between runs. |

Steps: `{ "click": sel }`, `{ "fill": sel, "value": "..." }` (native setter + `input` event, works with
React/Vue/Angular), `{ "type": sel, "text": "...", "delay": 45 }` (real keystrokes), `{ "press": "Enter" }`,
`{ "js": "..." }` (async body; `return` a value), plus `pause` (ms) and `measure` (stores the returned
value in the manifest). Values may reference `${env:NAME}`; values are never printed.

Measure regions instead of estimating them from thumbnails:

```json
{ "js": "const b = document.querySelector('#mic').getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];", "measure": "mic" }
```

Output: `capture/assets/<name>.png` (+ `.mp4`), `manifest.json`, `capture/extracted/asset-descriptions.md`.

## Config

`video.config.json`:

| Field | Meaning |
|---|---|
| `slug`, `lang` | Output name prefix and document language. |
| `brand` | `name`, `primary` (accent word/underline), `ink`, `muted`, `background`, `accent` (three `#RRGGBB` colors: gradients, rings, badges), `logo`, `font` `{ family, file }` (default Noto Sans from `assets/fonts`, fetched by `fetch-font.cjs`). |
| `scenes[]` | Ordered scenes; each has `id` and `type`. Durations are computed by the generators. |
| `variants` | Named overrides, see below. |
| `music` | `calm` or `source` + `grid`, `climax` (scene id), `volume`. |
| `sound` | `transitions` (whoosh between scenes), `sfxDir`, `sfx: false`. |
| `output.dir` | Where `render.cjs` writes the final MP4s. |

Text fields accept `[[word]]` to paint a word with the accent gradient (or the primary color in the
headline). Chat texts accept `*bold*`, `_italic_` and URLs.

## Scene types

**hook** (8 s): `teaser` (typed letter by letter), `teaserSub`, `middle` (question or claim; `\n` breaks
lines; long text switches to a smaller two-line layout), `flashes` (up to 3 blurred screenshots),
`headline` (`"My App [[changed.]]"`), `tagline` (`"Your work, [[one step ahead.]]"`).

**zoom**: `image` (1920×1080 capture), `intro` `{ kicker, title, sub }`, `introHold` (s),
`beats[]` `{ focus: [x, y], scale, ring: [x, y, w, h], callout, hold }`. The camera puts `focus` near the
center (above the callout) and is clamped so the screenshot always covers the frame.

**chat**: phone with a WhatsApp-like dark chat; see [Chat conversation](#chat-conversation).

**closing** (8 s): `logo`, `brand`, `tagline`, `sub`, `url` (typed with a blinking cursor),
`highlight` (part of the URL in the gradient), `badge` (e.g. "Coming soon").

**custom**: `src` (a HyperFrames composition you wrote), `duration`, optional `cues`. Use it for
anything the generators do not cover; follow the HyperFrames composition rules (paused GSAP timeline
registered in `window.__timelines[id]`, seek-safe animation).

Any scene can add `videos[]` `{ src, start, duration, mediaStart, x, y, w, h, fit }` (screen recordings
placed at scene-local time) and `cues[]` `[sfx, time, volume, cut]`.

## Chat conversation

Scene fields: `contact` `{ name, avatar, status, typing }`, `clock`, `placeholder`, `tail` (s after the
last message), `captions` `{ kicker, title, sub, items[], badge }`, `messages[]`.

| Message | Fields |
|---|---|
| Date chip | `{ "type": "date", "text": "Today", "visible": true }` |
| System note | `{ "type": "system", "text": "..." }` |
| Incoming | `{ "from": "in", "text", "time", "buttons": [], "focus": { "label", "text", "hold" }, "notify": true, "reveal" }` |
| Outgoing | `{ "from": "out", "text", "time", "via": "typed" \| "tap" \| "sent", "tap": "button label", "quote": true, "reveal" }` |
| Flow card | incoming with `"card": { "title", "body", "footer", "button" }` |
| Form reply | outgoing with `"formReply": "Book now", "formReplySub": "Response sent."` |
| Form sheet | `{ "type": "sheet", "tap": true, "screens": [ { "title", "progress", "heading", "options": [{ "title", "desc" }], "choose", "fields": [{ "label", "value" }], "checks": [{ "label", "checked" }], "note", "cta", "hold", "reveal" } ] }` |
| Pause | `{ "type": "pause", "seconds": 1 }` |

- Incoming messages show "typing…" in the header first; reading time grows with the text length.
- `via: "typed"` types the text in the composer (keep it short: about 32 characters fit).
- `via: "tap"` animates the matching button of the last incoming message; `quote: true` quotes it.
- `focus` zooms the phone on that message with a label beside it (use it once or twice per scene for
  the smartest moment).
- `reveal` shows caption item N (number, or a list) or `"badge"` when the message appears. Items never
  referenced appear at the start.

## Variants

```json
"variants": {
  "soon":   { "scenes": { "hook": { "teaser": "Coming soon…" }, "closing": { "badge": "Coming soon" } } },
  "launch": { "scenes": { "hook": { "teaser": "It's here…" } }, "remove": ["some-scene-id"] }
}
```

`build.cjs --variant soon` merges the overrides into the scenes; `render.cjs` renders every variant.

## Music and sound

- `music.calm: true`: original synthesized bed (`calm-track.py`), quiet mystery until the reveal,
  grows by sections, opens on the climax, resolves on the closing.
- `music.source` + `music.grid`: a real track the user picked, extended by `extend-track.py` cutting
  only on bar lines. Measure the grid with `analyze-track.py <file>`:
  `{ "bpm": 135.01, "downbeat": 1.768, "intro": [0, 8], "body": [8, 24], "breakdown": [24, 32], "ending": 32 }`
  (bars counted from `downbeat`). The body's first bar lands on the hook reveal and on `music.climax`.
- Sound effects come from the HyperFrames install (Pixabay license, not redistributed here): whoosh on
  scene changes, riser + cinematic whoosh into the climax, and each generator's cues (pops, taps,
  typing, chime). Add or override with `cues` on a scene.
- `render.cjs` normalizes to −14 LUFS without re-encoding the picture.

## Pitfalls

- **Production by accident.** Point `base` at localhost or a staging host with demo data. Check how the
  app decides its environment before starting it (a wrong profile can connect to production services).
- **Captcha.** Never automate it. `--headed`, a human solves it, the profile keeps the session.
- **State leaking between shots.** Everything the UI stores in localStorage goes in `state`; drawers
  without storage get closed in `beforeEach`.
- **`networkidle` never arrives** in apps with websockets or long polling; the script uses `load` + `waitFor`.
- **JSON escaping.** Long JS in a plan: write it in a `.js` file and generate the plan with
  `JSON.stringify`; regexes like `\s` break hand-written JSON.
- **`textContent`/`innerHTML` in timelines** are unstable when seeking; the generators reveal text by
  toggling `display` of pre-built spans. Do the same in custom scenes.
- **`visibility: "visible"`** set by a timeline leaks after the scene ends; restore with `"inherit"`.
- **Screen recordings in zoomed scenes.** A `<video>` does not follow a camera transform; for zooms,
  extract stills (`ffmpeg -ss <t> -i x.mp4 -frames:v 1 x.png`) and animate images.
- **Contrast warnings** from `hyperframes check` on the chat's blue ticks and green buttons are the
  messenger's own colors; overlaps while a sheet slides are transient. Real overlaps of text are not.
- **Verify the MP4**, not only snapshots: extract frames at scene changes of the final file.
