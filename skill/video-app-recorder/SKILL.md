---
name: video-app-recorder
description: Creates product videos of a web app (what's new, feature launch, screen tour, chatbot demo) with HyperFrames, from real screens captured on a local instance plus generated scenes (mystery opening, camera tour with highlights, WhatsApp-like phone chat simulator, closing with typed URL), a music bed cut on the beat and two variants ("coming soon" and "launch"). Use when the user asks for a product video, launch or teaser video, release video, feature demo, "what's new" video or a video of a screen or chat flow of their app.
---

# video-app-recorder

Turns a request into MP4s of the user's web app, built from **real screens** of a local, non-production
instance (never invented UI) and scene generators driven by one `video.config.json`.
Schema and pitfalls: [REFERENCE.md](REFERENCE.md). Style and content rules: [STYLE.md](STYLE.md).

## Quick start

```
/video-app-recorder a 60s "what's new" video of our dashboard and WhatsApp ordering, for LinkedIn
```

All steps use the `video-app-recorder` command. If it is not on PATH, run it from this skill folder:
`node <this skill folder>/bin/video-app-recorder.cjs <command>`. Below, `vr` stands for whichever of the two works
(it is not a real command). In Codex the skill is invoked as `$video-app-recorder`; in Claude Code and Cursor as
`/video-app-recorder`.

## Workflow

Do the steps in order; each has a gate.

1. **Prerequisites.** Check `node --version` (22+), `ffmpeg -version`, `npx hyperframes doctor` (Chrome
   headless) and `python -c "import numpy, scipy"`. If something is missing, tell the user the install
   command for their OS (README § Requirements: winget / brew / apt, `npm install -g hyperframes`,
   `pip install numpy scipy`) instead of installing system software yourself. The app runs locally with
   demo data (development or staging, never production). Gate: the base URL answers.
2. **Understand the request.** Slug, the ONE message, audience, length (default 60–120 s), format
   (16:9 default), features to show and whether it needs the two variants (announce now + release
   later). Ask once, only what cannot be inferred.
3. **Project.** `vr init <dir>` (add `--example` to start from the demo; `vr demo-app` serves the demo app).
4. **Capture.** Write `capture.plan.json` (REFERENCE.md § Capture plan). Credentials only through
   environment variables referenced as `${env:NAME}`; tell the user which ones to export. Run
   `vr capture` in the project (`--only <regex>` to redo
   shots, `--headed` when a captcha appears: the user solves it, never bypass it). Measure every region
   a scene zooms into with a `measure` step. Gate: look at every PNG and at real-resolution frames of
   each `.mp4`; redo shots with leaked state, wrong popup or sensitive data.
5. **Scenes.** Fill `video.config.json` (REFERENCE.md § Config): `hook`, one `zoom` per screen with
   measured `focus`/`ring`, `chat` for conversational flows, `closing`, and `custom` for hand-written
   HyperFrames compositions. Write captions as benefits with real numbers from the captures.
6. **Build and check.** `vr build --variant <name>`, `vr check` and `vr snapshot --at <times>`; read
   the contact sheet.
   Fix and rebuild (rebuilding is always safe: frames and index are regenerated from the config).
7. **Music.** Ask the user to pick a track (royalty-free libraries in STYLE.md) or use the built-in
   calm synth (`music.calm: true`). For a track: `vr analyze-track <file>`,
   set `music.source` + `music.grid`; the build extends it on bar lines with the drop on the reveal
   and on the climax scene.
8. **Render and deliver.** Only after the user agrees: `vr render`
   renders every variant and normalizes loudness to −14 LUFS. Extract frames of the final MP4s at
   scene changes and new scenes and look at them before reporting. Report paths, duration and what
   was not verified (audio is measured, not listened to).

## Content rules (summary of STYLE.md)

- Real screens of demo data; no hidden, internal or admin-only screens.
- One message; each scene says the problem, shows the real action and ends on a real number.
- Data-heavy moments stay still for ≥ 3 s; the first new screen for ≥ 3.5 s.
- Smooth transitions only (fades, slow camera); captions describe what is on screen, no vague slogans.
- Never publish anything from the app while capturing (approve, send, post buttons).
- Real data unfit for a public video (real names, complaints about the vendor, customer PII): do not
  use it. Inject demo content into the real component in a capture step and tell the user.
- Brand claims ("the only…", partnerships) only as the user wrote them; ask them to confirm wording.
