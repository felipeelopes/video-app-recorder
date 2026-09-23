"""Original calm music bed, synthesized from scratch (no third-party samples).

Mood: warm, confident tech, nothing harsh. 84 BPM, D major with ninth chords (Dmaj9, Bm9, Gmaj9,
Asus), soft sine pad, a few electric-piano hits per bar, sparse bell motif, round bass and barely-felt
percussion. No constant arpeggio or hi-hat (those were rejected as annoying).

Usage: python calm-track.py <duration> <climax start> <closing start> [reveal] [out.wav]
  - 0 to reveal (default 5.6 s): mystery (B minor drone, high shimmer, soft wind);
  - reveal to climax: calm bed that grows by sections;
  - 2 s before the climax: a breath with a soft rise; climax to closing: fully open;
  - closing: resolves on Dmaj9 with a bell and fade.
Output: out.wav (48 kHz stereo, -3 dBFS peak). Requires numpy and scipy.
"""
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 130.0
T_CLIMAX = float(sys.argv[2]) if len(sys.argv) > 2 else 116.0
T_END = float(sys.argv[3]) if len(sys.argv) > 3 else 125.0
T_REVEAL = float(sys.argv[4]) if len(sys.argv) > 4 else 5.6
T_RISE = T_CLIMAX - 2.0
# Section marks as fractions of the reveal -> climax span (quiet start, fuller middle, fullest before the climax)
SEC1, SEC2, SEC3 = (T_REVEAL + (T_CLIMAX - T_REVEAL) * f for f in (0.3, 0.5, 0.72))
T_PERC = T_REVEAL + (T_CLIMAX - T_REVEAL) * 0.1
BPM = 84
BEAT = 60 / BPM
BAR = 4 * BEAT
N = int(SR * DUR)
t_all = np.arange(N) / SR
rng = np.random.default_rng(11)


def note(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def filt(x, fc, kind):
    return sosfilt(butter(2, fc, kind, fs=SR, output="sos"), x)


def curve(points):
    ts, vs = zip(*points)
    return np.interp(t_all, ts, vs)


def env_ad(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na) ** 1.5
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr) ** 1.5
    return e


L = np.zeros(N)
R = np.zeros(N)


def add(sig, start, pan=0.0, gain=1.0, dest=None):
    i0 = int(start * SR)
    if i0 >= N or i0 < 0:
        return
    end = min(N, i0 + len(sig))
    s = sig[: end - i0] * gain
    if dest is not None:
        dest[i0:end] += s
        return
    L[i0:end] += s * np.sqrt(0.5 * (1 - pan))
    R[i0:end] += s * np.sqrt(0.5 * (1 + pan))


# Chords (2 bars each) from the reveal on: Dmaj9, Bm9, Gmaj9, Asus(add9).
CHORDS = [[50, 57, 61, 64, 66], [47, 54, 57, 61, 62], [43, 50, 54, 57, 59], [45, 52, 55, 59, 62]]
BASS_NOTES = [38, 35, 31, 33]
CHORD_LEN = 2 * BAR


def chord_at(t):
    return int(max(0.0, t - T_REVEAL) // CHORD_LEN) % 4


# Energy sections (0..1) aligned to the video.
energy = curve([
    (0, 0.0), (T_REVEAL, 0.0), (T_REVEAL + 0.01, 0.45), (SEC1, 0.55), (SEC2, 0.65),
    (SEC3, 0.8), (T_RISE, 0.85), (T_CLIMAX, 1.0), (T_END, 1.0), (DUR, 0.7),
])


# Slightly detuned sine pad, slow attack and a long tail overlapping the next chord.
def pad_note(midi, n, bright):
    tt = np.arange(n) / SR
    s = np.zeros(n)
    for c in (-6, 0, 6):
        f = note(midi) * 2 ** (c / 1200)
        phase = rng.uniform(0, 2 * np.pi)
        s += np.sin(2 * np.pi * f * tt + phase) + bright * 0.18 * np.sin(4 * np.pi * f * tt + phase)
    return s / 3


pad_l = np.zeros(N)
pad_r = np.zeros(N)

# Mystery intro: low, open Bm(add9) growing until the reveal.
n = int((T_REVEAL + 1.5) * SR)
for i, m in enumerate([35, 47, 54, 61, 66]):
    s = pad_note(m, n, 0.2) * env_ad(n, 2.5, 1.5)
    (pad_l if i % 2 else pad_r)[:n] += s * 0.7
    (pad_r if i % 2 else pad_l)[:n] += s * 0.45

t0 = T_REVEAL
while t0 < DUR:
    k = chord_at(t0 + 0.01)
    n = int((CHORD_LEN + 1.8) * SR)
    for i, m in enumerate([x + 12 for x in CHORDS[k][1:]]):
        s = pad_note(m, n, 1.0 if t0 >= T_CLIMAX else 0.6) * env_ad(n, 1.2, 1.8)
        add(s * (0.75 if i % 2 else 0.5), t0, dest=pad_l)
        add(s * (0.5 if i % 2 else 0.75), t0, dest=pad_r)
    t0 += CHORD_LEN

pad_l = filt(pad_l, 2400, "low") * (0.35 + 0.35 * energy)
pad_r = filt(pad_r, 2400, "low") * (0.35 + 0.35 * energy)
intro_level = curve([(0, 0.0), (3.0, 0.8), (T_REVEAL, 1.0), (DUR, 1.0)])
L += pad_l * intro_level * 0.2
R += pad_r * intro_level * 0.2

# High shimmer and wind during the mystery (only until the reveal).
n = int(T_REVEAL * SR)
tt = np.arange(n) / SR
bright = sum(np.sin(2 * np.pi * note(m) * tt) * (0.5 + 0.5 * np.sin(2 * np.pi * v * tt))
             for m, v in ((85, 0.21), (90, 0.33), (93, 0.17)))
bright *= env_ad(n, 2.0, 1.2) * 0.012
wind = filt(filt(rng.standard_normal(n), 400, "high"), 1800, "low") * env_ad(n, 2.5, 1.0) * 0.02
add(bright + wind, 0, pan=-0.2)
add(np.roll(bright, 2400) + wind * 0.8, 0, pan=0.2)


# Electric piano: a few hits per bar (beat 1 and the and-of-3), slightly rolled.
def piano(midi, dur, vel):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    f = note(midi)
    s = (np.sin(2 * np.pi * f * tt)
         + 0.35 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt * 3.5)
         + 0.08 * np.sin(2 * np.pi * 3.01 * f * tt) * np.exp(-tt * 8))
    s *= np.exp(-tt * 1.3) * env_ad(n, 0.004, 0.25)
    s *= 1 + 0.12 * np.sin(2 * np.pi * 4.5 * tt)
    return s * vel


t0 = T_REVEAL
bar_i = 0
while t0 < T_END + BAR:
    k = chord_at(t0 + 0.01)
    notes = [x + 12 for x in CHORDS[k][1:]]
    for j, (offset, vel) in enumerate(((0.0, 1.0), (2.5 * BEAT, 0.6))):
        if j == 1 and bar_i % 2 == 1 and t0 < SEC2:
            continue
        for i, m in enumerate(notes):
            add(piano(m, 2.4, vel * 0.065), t0 + offset + i * 0.018, pan=-0.25 + i * 0.15)
    t0 += BAR
    bar_i += 1

# Reveal: a full piano chord marking the headline.
for i, m in enumerate([38, 50, 57, 61, 64, 66, 69]):
    add(piano(m, 4.0, 0.06), T_REVEAL + i * 0.025, pan=-0.3 + i * 0.1)


# Bell motif (D pentatonic), short phrases with rests, from the first section on.
def bell(midi, vel):
    n = int(1.6 * SR)
    tt = np.arange(n) / SR
    f = note(midi)
    s = np.sin(2 * np.pi * f * tt) + 0.22 * np.sin(2 * np.pi * 4.0 * f * tt) * np.exp(-tt * 6)
    return s * np.exp(-tt * 2.6) * env_ad(n, 0.003, 0.2) * vel


PHRASES = [
    [(0, 78), (0.5, 76), (1, 74), (2, 76)],
    [(0, 74), (0.5, 76), (1, 78), (1.5, 81), (3, 78)],
    [(0, 81), (1, 78), (1.5, 76), (2.5, 74)],
    [(0, 76), (0.5, 78), (1.5, 74), (2, 71)],
]
t0 = SEC1
f = 0
while t0 < T_END:
    if not (T_RISE - 2 * BAR <= t0 < T_CLIMAX):
        octave = 12 if t0 >= T_CLIMAX else 0
        for b, m in PHRASES[f % 4]:
            add(bell(m + octave, 0.05), t0 + b * BEAT, pan=0.3 if f % 2 else -0.3)
        f += 1
    t0 += 2 * BAR if t0 < SEC3 else BAR * (1 if t0 >= T_CLIMAX else 2)

# Round bass: long root on 1 and a short anticipation on the and-of-4.
t0 = T_REVEAL
while t0 < T_END + BAR:
    m = BASS_NOTES[chord_at(t0 + 0.01)]
    for offset, dur, vel in ((0.0, 2.6 * BEAT, 1.0), (3.5 * BEAT, 0.4 * BEAT, 0.55)):
        n = int(dur * SR)
        tt = np.arange(n) / SR
        s = np.sin(2 * np.pi * note(m) * tt) + 0.15 * np.sin(4 * np.pi * note(m) * tt)
        s *= env_ad(n, 0.02, min(0.25, dur / 2))
        add(filt(s, 260, "low") * vel * 0.075, t0 + offset)
    t0 += BAR

# Barely-felt percussion: soft kick on 1 and 3; a light rim on 2 and 4 only in the fuller sections.
t0 = T_PERC
while t0 < T_END:
    if not (T_RISE <= t0 < T_CLIMAX):
        for b in (0, 2):
            n = int(0.35 * SR)
            tt = np.arange(n) / SR
            fr = 70 * np.exp(-tt * 20) + 48
            kick = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-tt * 9)
            add(kick * (0.1 if t0 >= T_CLIMAX else 0.06), t0 + b * BEAT)
        if t0 >= SEC3:
            for b in (1, 3):
                n = int(0.12 * SR)
                noise = filt(filt(rng.standard_normal(n), 1500, "high"), 5000, "low")
                add(noise * np.exp(-np.arange(n) / SR * 45) * (0.05 if t0 >= T_CLIMAX else 0.035),
                      t0 + b * BEAT, pan=0.15)
    t0 += BAR

# Soft rise (filtered noise, never harsh) into the climax.
n = int((T_CLIMAX - T_RISE) * SR)
rise = filt(filt(rng.standard_normal(n), 600, "high"), 4000, "low") * np.linspace(0, 1, n) ** 2.5
add(rise * 0.05, T_RISE)

# Ending: bells resolving over the closing Dmaj9.
for i, m in enumerate([74, 78, 81, 85]):
    add(bell(m, 0.04), T_END + 0.3 + i * 0.22, pan=-0.2 + i * 0.13)

# Convolution reverb (2.2 s tail) and final mix.
n_ir = int(2.2 * SR)
tt = np.arange(n_ir) / SR
ir_l = rng.standard_normal(n_ir) * np.exp(-tt * 3.0)
ir_r = rng.standard_normal(n_ir) * np.exp(-tt * 3.0)
ir_l, ir_r = filt(ir_l, 5000, "low"), filt(ir_r, 5000, "low")
ir_l /= np.sqrt(np.sum(ir_l ** 2))
ir_r /= np.sqrt(np.sum(ir_r ** 2))
wet_l = fftconvolve(L, ir_l)[:N]
wet_r = fftconvolve(R, ir_r)[:N]
L = L * 0.75 + wet_l * 0.45
R = R * 0.75 + wet_r * 0.45

mix = np.stack([L, R], axis=1)
mix = filt(mix.T, 35, "high").T
mix = filt(mix.T, 9000, "low").T
mix /= np.max(np.abs(mix))
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
fade = curve([(0, 0.0), (1.5, 1.0), (DUR - 3.0, 1.0), (DUR, 0.0)])
mix *= fade[:, None]
mix *= 10 ** (-3 / 20) / np.max(np.abs(mix))

OUT = sys.argv[5] if len(sys.argv) > 5 else "assets/bgm.wav"
wavfile.write(OUT, SR, (mix * 32767).astype(np.int16))
print(f"[calm-track] {OUT} {DUR:.1f}s {BPM} BPM")
