"""Create the game's short coin chime and spring bounce (standard-library PCM)."""
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


coin = []
for i in range(round(.44 * RATE)):
    t = i / RATE
    bell = 0
    for frequency, delay, amplitude in [(1318.51, 0, 1), (1975.53, .035, .65), (2637.02, 0, .18)]:
        age = t - delay
        if age >= 0:
            envelope = (1 - math.exp(-1800 * age)) * math.exp(-16 * age)
            bell += amplitude * envelope * math.sin(math.tau * frequency * age)
    coin.append(bell)
save("coin-pling-v2.wav", coin)

spring, phase = [], 0
for i in range(round(.56 * RATE)):
    t = i / RATE
    frequency = 175 + 440 * math.exp(-14 * t) + 65 * math.sin(math.tau * 13 * t) * math.exp(-5 * t)
    phase += math.tau * frequency / RATE
    envelope = (1 - math.exp(-900 * t)) * math.exp(-8 * t) * max(0, 1 - t / .56)
    spring.append(envelope * (math.sin(phase) + .28 * math.sin(2 * phase)))
save("spring-boing.wav", spring)
