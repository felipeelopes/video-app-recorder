"""Extends a music track to the video length by cutting only on bar boundaries.

The track is described by a bar grid (measure it with analyze-track.py):
  {"bpm": 135.01, "downbeat": 1.768, "intro": [0, 8], "body": [8, 24], "breakdown": [24, 32], "ending": 32}
Bars are counted from the first downbeat. The body's first bar (the "drop") lands on the reveal of the
opening and again on the climax scene; body and breakdown alternate in between, and the original
ending of the track plays at the end of the video.

Usage: python extend-track.py --src track.mp3 --grid '<json>' --reveal 5.8 --climax 164 --duration 189 --out assets/bgm.wav
Requires: numpy, scipy, ffmpeg on PATH.
"""
import argparse
import json
import subprocess

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000

p = argparse.ArgumentParser()
p.add_argument("--project", default=".")
p.add_argument("--src", required=True)
p.add_argument("--grid", required=True)
p.add_argument("--reveal", type=float, default=5.8)
p.add_argument("--climax", type=float, required=True)
p.add_argument("--duration", type=float, required=True)
p.add_argument("--out", required=True)
a = p.parse_args()

grid = json.loads(a.grid)
BAR = 4 * 60 / float(grid["bpm"])
G0 = float(grid["downbeat"])
INTRO = grid.get("intro", [0, 8])
BODY = grid.get("body", [8, 24])
BREAK = grid.get("breakdown", [BODY[1], BODY[1] + 8])
ENDING = grid.get("ending", BREAK[1])


def bar_time(n):
    return G0 + n * BAR


raw = subprocess.run(["ffmpeg", "-v", "error", "-i", a.src, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
                     capture_output=True, check=True).stdout
src = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(float)
src_len = len(src) / SR


def plan(n_bars):
    """Body and breakdown alternate; the last 6 bars of the intro build up into the climax."""
    build = min(6, INTRO[1] - INTRO[0])
    pieces, rest, body = [], n_bars - build, True
    blen, klen = BODY[1] - BODY[0], BREAK[1] - BREAK[0]
    while rest > 0:
        size = min(blen if body else klen, rest)
        pieces.append((BODY[0], BODY[0] + size) if body else (BREAK[0], BREAK[0] + size))
        rest -= size
        body = not body
    return pieces + [(INTRO[1] - build, INTRO[1])]


pieces = plan(round((a.climax - a.reveal) / BAR))
t_reveal = a.climax - sum(y - x for x, y in pieces) * BAR
tail_len = src_len - bar_time(ENDING)
after = max(2, round((a.duration - a.climax - tail_len) / BAR))

out = np.zeros((int(a.duration * SR) + SR, 2))
TAIL = 0.15


def place(ini, end, dest, fade_in=0.01, tail=TAIL):
    i0, i1 = int(ini * SR), min(len(src), int((end + tail) * SR))
    seg = src[i0:i1].copy()
    n_in = int(fade_in * SR)
    if n_in:
        seg[:n_in] *= np.linspace(0, 1, n_in)[:, None]
    n_out = int(tail * SR)
    if n_out and len(seg) > n_out:
        seg[-n_out:] *= np.linspace(1, 0, n_out)[:, None]
    d = int(dest * SR)
    if d < 0:
        seg, d = seg[-d:], 0
    e = min(len(out), d + len(seg))
    out[d:e] += seg[: e - d]


# Opening: the end of the intro with a low-pass opening up, landing exactly on the drop.
start = bar_time(BODY[0]) - t_reveal
i0, i1 = int(max(0, start) * SR), int(bar_time(BODY[0]) * SR)
mystery = src[i0:i1].copy()
blocks = 48
size = max(1, len(mystery) // blocks)
for i in range(blocks):
    fc = min(350 * (40 ** (i / (blocks - 1))), SR / 2 - 100)
    sos = butter(2, fc, "low", fs=SR, output="sos")
    sl = slice(i * size, len(mystery) if i == blocks - 1 else (i + 1) * size)
    mystery[sl] = sosfilt(sos, src[i0:i1], axis=0)[sl]
mystery *= np.clip(np.linspace(0, 1, len(mystery)) * 2.2, 0, 1)[:, None] ** 1.5
off = int(max(0, t_reveal - len(mystery) / SR) * SR)
out[off: off + len(mystery)] += mystery

t = t_reveal
for x, y in pieces:
    place(bar_time(x), bar_time(y), t)
    t += (y - x) * BAR
place(bar_time(BODY[0]), bar_time(BODY[0] + after), t)
t += after * BAR
place(bar_time(ENDING), src_len, t, tail=0.0)

out = out[: int(a.duration * SR)]
n_f = int(1.0 * SR)
out[-n_f:] *= np.linspace(1, 0, n_f)[:, None] ** 2
out *= (10 ** (-17 / 20)) / max(1e-9, np.sqrt(np.mean(out ** 2)))
out *= min(1.0, (10 ** (-1 / 20)) / np.max(np.abs(out)))
wavfile.write(a.out, SR, (out * 32767).astype(np.int16))
print(f"[extend-track] reveal {t_reveal:.2f}s, climax {a.climax:.2f}s, track ending at {t:.2f}s, total {a.duration:.1f}s")
