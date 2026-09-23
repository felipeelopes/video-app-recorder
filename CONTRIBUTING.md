# Contributing

Issues and pull requests are welcome.

- Keep the scripts dependency-free (Node built-ins, Python + NumPy/SciPy) and cross-platform.
- New scene types go in `skill/video-app-recorder/scripts/lib/<type>.cjs`, return
  `{ html, duration, cues }` and must be seek-safe: a paused GSAP timeline registered in
  `window.__timelines[id]`, no `Math.random`/`Date` in animation, text revealed by toggling `display`
  of pre-built elements (not `textContent` in the timeline).
- Test against the demo app: build both variants, run `npx hyperframes check` and look at a
  `npx hyperframes snapshot` contact sheet. Include a contact sheet in the PR for visual changes.
- Document new config fields in `REFERENCE.md`.
- Never add real screenshots, customer data, credentials or third-party media to the repository.
