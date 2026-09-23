# Changelog

## 0.1.0 — 2026-09-23

- First public version: capture (`capture.mjs`), scene generators (`hook`, `zoom`, `chat`, `closing`,
  `custom`), in-house assembler (`build.cjs`), variants, music on the beat grid (`extend-track.py`,
  `analyze-track.py`), calm synth bed (`calm-track.py`), render with loudness normalization
  (`render.cjs`), demo app and example project.

### Added after the first draft

- Single command `video-app-recorder` (`init`, `capture`, `build`, `check`, `snapshot`, `render`,
  `analyze-track`, `font`, `demo-app`, `install-skill`) published as the package `bin`.
- `install-skill --for claude|codex|cursor|agents [--project]` copies the skill where each agent reads it.
- README: dependencies per OS, configuration, install and usage in Claude Code, Codex and Cursor,
  troubleshooting.
