"""Synthesize the knight's hurt cue and last-heart monitor beep (original PCM)."""
import math
from pathlib import Path
import struct
import wave

RATE = 44100
DEST = Path(__file__).resolve().parents[1] / "assets/common/sounds"


def save(name, samples):
    peak = max(abs(v) for v in samples) or 1
    pcm = b"".join(struct.pack("<h", round(v / peak * 23500)) for v in samples)
    with wave.open(str(DEST / name), "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(RATE)
        audio.writeframes(pcm)


# Two low, descending pulses, unlike the creatures' higher injured sound.
hurt = []
for i in range(round(.38 * RATE)):
    t = i / RATE
    value = 0
    for delay, frequency, volume in [(0, 360, 1), (.15, 240, .8)]:
        age = t - delay
        if 0 <= age <= .22:
            phase = math.tau * (frequency * age - 250 * age * age)
            envelope = min(1, age / .006) * math.exp(-19 * age) * min(1, (.22 - age) / .02)
            value += volume * envelope * (math.sin(phase) + .3 * math.sin(3 * phase))
    hurt.append(value)
save("player-hurt.wav", hurt)

beep = []
for i in range(round(.18 * RATE)):
    t = i / RATE
    envelope = max(0, min(1, t / .012, (.18 - t) / .025))
    beep.append(envelope * math.sin(math.tau * 1046.5 * t))
save("low-health-beep.wav", beep)
