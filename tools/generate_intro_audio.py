"""Rebuild the intro's original gentle music and cartoon effects (no downloads)."""
from array import array
import math
from pathlib import Path
import random
import sys
import wave

RATE = 22050
OUT = Path(__file__).resolve().parents[1] / 'assets' / 'intro' / 'sounds'
TAU = math.tau


def save(name, samples):
    peak = max(abs(x) for x in samples) or 1
    gain = min(1, .78 / peak)
    pcm = array('h', (round(max(-1, min(1, x * gain)) * 32767) for x in samples))
    if sys.byteorder != 'little':
        pcm.byteswap()
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / (name + '.wav')), 'wb') as handle:
        handle.setparams((1, 2, RATE, len(pcm), 'NONE', 'not compressed'))
        handle.writeframes(pcm.tobytes())


def envelope(t, length, attack=.03, release=.08):
    return min(1, max(0, t / attack)) * min(1, max(0, (length - t) / release))


def tone(t, frequency):
    return math.sin(TAU * frequency * t)


def effects():
    rng = random.Random(417)
    length = 1.2
    whoosh, low, phase = [], 0, 0
    for i in range(round(length * RATE)):
        t = i / RATE
        noise = rng.uniform(-1, 1)
        low = low * .91 + noise * .09
        phase += TAU * (74 - 35 * t / length) / RATE
        sweep = math.sin(math.pi * t / length) ** 1.7
        whoosh.append((low * 1.5 + math.sin(phase) * .16) * sweep * .8)
    save('whoosh', whoosh)
    for name, length in [('hop', .19), ('boing', .4), ('snore', 1.0), ('yawn', 1.15)]:
        samples, phase = [], 0
        for i in range(round(length * RATE)):
            t = i / RATE
            if name == 'hop':
                frequency, volume = 690 - 440 * t / length, .45 * math.exp(-t * 13)
                sample = math.sin(phase) + .14 * math.sin(phase * 2)
            elif name == 'boing':
                frequency, volume = 150 + 360 * math.exp(-t * 15) + math.sin(t * 65) * 18, .55 * math.exp(-t * 8)
                sample = math.sin(phase) + .2 * math.sin(phase * 2)
            elif name == 'snore':
                frequency, volume = 84 + 15 * math.sin(math.pi * t / length), .21 * math.sin(math.pi * t / length) ** 2
                sample = math.sin(phase) + .25 * math.sin(phase * 3) + rng.uniform(-.1, .1)
            else:
                frequency, volume = 128 + 45 * math.sin(math.pi * t / length), .26 * math.sin(math.pi * t / length) ** 1.2
                sample = math.sin(phase) + .35 * math.sin(phase * 2) + .12 * math.sin(phase * 4)
            phase += TAU * frequency / RATE
            samples.append(sample * volume * envelope(t, length, .025, .06))
        save(name, samples)
    chime = [0.0] * round(1.7 * RATE)
    for j, freq in enumerate([523.25, 659.25, 783.99, 1046.5]):
        start = j * .13
        for i in range(round(start * RATE), len(chime)):
            t = i / RATE - start
            chime[i] += .18 * (tone(t, freq) + .3 * tone(t, freq * 2.76)) * math.exp(-t * 4) * envelope(t, 1.7 - start, .006, .12)
    save('chime', chime)


def music():
    length, beat = 32, .625
    samples = [0.0] * round(length * RATE)
    # An original slow celesta pattern over warm, lightly plucked chords.
    chords = [(261.63, 329.63, 392), (220, 261.63, 329.63), (174.61, 220, 261.63), (196, 246.94, 293.66)]
    pattern = [0, 2, 1, 2, 0, 1, 2, 1]
    for step in range(51):
        start = step * beat
        chord = chords[(step // 8) % 4]
        frequency = chord[pattern[step % 8]] * (2 if step % 4 == 3 else 1)
        duration = min(1.7, length - start)
        for i in range(round(start * RATE), min(len(samples), round((start + duration) * RATE))):
            t = i / RATE - start
            bell = tone(t, frequency) + .24 * tone(t, frequency * 2) + .1 * tone(t, frequency * 3.01)
            samples[i] += bell * .21 * math.exp(-t * 3.2) * envelope(t, duration, .012, .12)
    for i in range(len(samples)):
        samples[i] *= envelope(i / RATE, length, 1, 1.8)
    save('music', samples)


if __name__ == '__main__':
    effects()
    music()
    print('Seven original intro sounds written to', OUT)
