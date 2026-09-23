"""Measures the bar grid of a track for extend-track.py: BPM, first downbeat and energy per bar.

Usage: python analyze-track.py assets/track.mp3
Pick the downbeat candidate whose energy jump falls exactly on a section change (intro -> body is
usually bar 8 or 16), then write the grid in video.config.json (music.grid).
"""
import subprocess
import sys

import numpy as np

SR = 22050
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", sys.argv[1], "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.float32).astype(float)
print(f"duration {len(x) / SR:.2f}s")

hop = 256
fps = SR / hop
e = np.array([np.sum(x[i:i + 1024] ** 2) for i in range(0, len(x) - 1024, hop)])
onset = np.maximum(np.diff(np.log(e + 1e-9)), 0)

best = None
for bpm in np.arange(70, 180, 0.01):
    per = 60 / bpm * fps
    for phase in np.arange(0, per, 0.5):
        idx = (phase + per * np.arange(int((len(onset) - phase) / per))).astype(int)
        score = onset[idx].sum() / len(idx)
        if best is None or score > best[0]:
            best = (score, bpm, phase / fps)
_, bpm, phase = best
beat = 60 / bpm
bar = 4 * beat
print(f"bpm {bpm:.2f}  bar {bar:.4f}s")

for k in range(4):
    g0 = phase + k * beat
    energy, t0 = [], g0
    while t0 + bar < len(x) / SR:
        seg = x[int(t0 * SR):int((t0 + bar) * SR)]
        energy.append(20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9))
        t0 += bar
    print(f"downbeat={g0:.3f}s  " + " ".join(f"{i}:{v:.0f}" for i, v in enumerate(energy)))
