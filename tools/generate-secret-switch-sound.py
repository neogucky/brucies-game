"""Synthesize two heavy stone slabs grinding past each other (original PCM)."""
import math
from pathlib import Path
import random
import struct
import wave

RATE = 44100
DEST = Path(__file__).resolve().parents[1] / "assets/common/sounds/stone-scrape.wav"
random_source = random.Random(29)
samples = []
low, grit, phase = 0, 0, 0
for i in range(round(.96 * RATE)):
    t = i / RATE
    noise = random_source.uniform(-1, 1)
    low += .065 * (noise - low)
    grit += .48 * (noise - grit)
    pressure = .55 + .2 * math.sin(math.tau * 6.5 * t) + .13 * math.sin(math.tau * 13 * t)
    envelope = max(0, min(1, t / .035, (.96 - t) / .18))
    phase += math.tau * (87 + 12 * math.sin(math.tau * 2.4 * t)) / RATE
    friction = .8 * low + .23 * grit + .06 * math.sin(phase)
    clatter = 0
    for delay in [.07, .26, .48, .71]:
        age = t - delay
        if 0 <= age < .08:
            clatter += .11 * math.exp(-55 * age) * (noise + math.sin(math.tau * 145 * age))
    samples.append(envelope * (pressure * friction + clatter))

peak = max(abs(value) for value in samples) or 1
pcm = b"".join(struct.pack("<h", round(value / peak * 23500)) for value in samples)
with wave.open(str(DEST), "wb") as audio:
    audio.setnchannels(1)
    audio.setsampwidth(2)
    audio.setframerate(RATE)
    audio.writeframes(pcm)
