# Third-party components

Nothing below is bundled in this repository; it is installed or downloaded by the user.

| Component | Used for | License | How it is obtained |
|---|---|---|---|
| [HyperFrames](https://github.com/heygen-com/hyperframes) (HeyGen) | Rendering HTML compositions to video (`check`, `snapshot`, `render`), Chrome headless shell | Apache-2.0 | `npm install -g hyperframes` |
| HyperFrames bundled sound effects | Whoosh, pop, click, typing, chime, riser… | Pixabay Content License (see `CREDITS.md` in the HyperFrames install) | Read from the HyperFrames install at build time; copied only into your own project |
| [GSAP](https://gsap.com) | Timelines inside the generated scenes | GSAP Standard License ("no charge") | Loaded from the jsDelivr CDN at render time |
| [Puppeteer](https://pptr.dev) (`puppeteer-core`) | Screen capture | Apache-2.0 | Comes with HyperFrames, or `npm i puppeteer-core` |
| [Noto Sans](https://fonts.google.com/noto/specimen/Noto+Sans) | Default font | SIL Open Font License 1.1 | Downloaded from Google Fonts by `fetch-font.cjs` |
| [FFmpeg](https://ffmpeg.org) | Video conversion, audio normalization | LGPL/GPL | Installed by the user |
| NumPy, SciPy | Music scripts | BSD-3-Clause | `pip install numpy scipy` |

## Music

No music is included. `calm-track.py` synthesizes an original bed from scratch. If you use a track
from a royalty-free library, check its license for your use (most allow use inside a video but not
redistribution of the file itself) and do not commit it to a public repository.

## Example assets

Everything under `skill/video-app-recorder/examples/` (demo app, logo and avatar SVGs, demo texts) was
created for this project and is covered by the MIT license. "Acme Bistro" is fictional.

## Trademarks

WhatsApp is a trademark of Meta Platforms, Inc. The chat scene is an approximate visual simulation
for demos and is not affiliated with or endorsed by Meta.
