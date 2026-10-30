"""Small original Foley/synth cues. Deterministic, mono PCM, no external samples."""
import math
import random
import struct
import wave
from pathlib import Path

RATE = 22050
OUT = Path(__file__).resolve().parents[1] / 'assets/common/sounds'
rng = random.Random(837)


def save(name, seconds, sample):
    previous = 0
    values = []
    for i in range(round(seconds * RATE)):
        t = i / RATE
        previous = .65 * previous + .35 * rng.uniform(-1, 1)
        envelope = min(1, t / .006) * min(1, (seconds - t) / .025)
        values.append(max(-.88, min(.88, sample(t, previous) * envelope)))
    with wave.open(str(OUT / (name + '.wav')), 'wb') as f:
        f.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        f.writeframes(b''.join(struct.pack('<h', round(v * 32767)) for v in values))


save('footstep-sand', .14, lambda t,n: (.35*n + .16*math.sin(2*math.pi*115*t))*math.exp(-t*27))
save('footstep-stone', .13, lambda t,n: (.27*n + .24*math.sin(2*math.pi*180*t))*math.exp(-t*35))
save('footstep-leaf', .16, lambda t,n: (.5*n + .09*math.sin(2*math.pi*90*t))*math.exp(-t*23))
save('armor-cloth', .18, lambda t,n: (.2*n + .03*math.sin(2*math.pi*980*t))*math.sin(math.pi*t/.18))
save('landing-soft', .22, lambda t,n: (.25*n + .4*math.sin(2*math.pi*(95*t-95*t*t)))*math.exp(-t*20))
save('bow-release', .32, lambda t,n: (.32*math.sin(2*math.pi*(380*t-210*t*t)) + .16*math.sin(2*math.pi*760*t) + .14*n)*math.exp(-t*12))
save('hammer-swoosh', .32, lambda t,n: (.65*n + .12*math.sin(2*math.pi*(105*t-65*t*t)))*math.sin(math.pi*t/.32)**2)
save('helper-curious', .28, lambda t,n: .24*math.sin(2*math.pi*(650*t+900*t*t))*math.sin(math.pi*t/.28)**2)
save('helper-brave', .35, lambda t,n: .25*math.sin(2*math.pi*(490*t-280*t*t))*(.7+.3*math.sin(2*math.pi*19*t))*math.sin(math.pi*t/.35))
save('helper-slurp', .23, lambda t,n: (.18*n+.18*math.sin(2*math.pi*(300*t+40*math.sin(20*t)/20)))*math.sin(math.pi*t/.23)**2)
save('helper-bounce', .22, lambda t,n: .25*math.sin(2*math.pi*(460*t-440*t*t))*math.sin(math.pi*t/.22)**2)
