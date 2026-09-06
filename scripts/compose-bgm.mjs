import fs from 'node:fs';
const sr = 44100,
  bpm = 116,
  beat = 60 / bpm,
  bars = 16,
  duration = beat * 4 * bars,
  n = Math.round(sr * duration);
const l = new Float32Array(n),
  r = new Float32Array(n),
  tau = Math.PI * 2;
let seed = 403;
const rnd = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return (seed / 4294967296) * 2 - 1;
};
function add(start, dur, fn, pan = 0, send = 0.0) {
  const a = Math.floor(start * sr),
    count = Math.ceil(dur * sr),
    pl = Math.sqrt((1 - pan) / 2),
    pr = Math.sqrt((1 + pan) / 2);
  for (let i = 0; i < count; i++) {
    const t = i / sr,
      v = fn(t, i),
      j = (a + i) % n;
    l[j] += v * pl;
    r[j] += v * pr;
    if (send) {
      const k = (j + Math.floor(beat * 0.75 * sr)) % n;
      l[k] += v * pr * send;
      r[k] += v * pl * send;
    }
  }
}
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
function note(start, m, dur, vol, kind = 'lead', pan = 0) {
  const f = hz(m);
  add(
    start,
    dur,
    (t) => {
      const attack = Math.min(1, t / 0.009),
        rel = Math.min(1, (dur - t) / 0.075);
      let v;
      if (kind === 'bass')
        v =
          Math.sin(tau * f * t) +
          0.22 * Math.sin(tau * 2 * f * t) +
          0.07 * Math.sin(tau * 3 * f * t);
      else if (kind === 'pad')
        v =
          (Math.sin(tau * f * 0.998 * t) +
            Math.sin(tau * f * 1.002 * t) +
            0.16 * Math.sin(tau * f * 2 * t)) *
          0.5;
      else
        v =
          Math.sin(tau * f * t) +
          0.32 * Math.sin(tau * f * 2 * t) * Math.exp(-t * 14) +
          0.12 * Math.sin(tau * f * 4 * t) * Math.exp(-t * 20);
      const env =
        kind === 'pad'
          ? Math.sin((Math.PI * t) / dur) ** 0.6
          : attack * rel * Math.exp(-t * (kind === 'bass' ? 3 : 4));
      return v * env * vol;
    },
    pan,
    kind === 'lead' ? 0.25 : kind === 'pad' ? 0.15 : 0,
  );
}
const chords = [
  [48, 55, 60, 63],
  [44, 51, 56, 60],
  [51, 58, 63, 67],
  [46, 53, 58, 62],
];
const melodies = [
  [72, 75, 79, 77, 75, 72, 70, 67],
  [68, 72, 75, 79, 77, 75, 72, 68],
  [79, 82, 79, 75, 77, 79, 75, 72],
  [77, 74, 70, 74, 77, 79, 74, 70],
];
for (let bar = 0; bar < bars; bar++) {
  const t = bar * 4 * beat,
    c = chords[bar % 4],
    mel = melodies[bar % 4];
  c.forEach((m, i) => note(t, m, beat * 4, 0.045, 'pad', (i - 1.5) * 0.35));
  for (let b = 0; b < 4; b++) {
    const k = t + b * beat;
    add(
      k,
      0.38,
      (x) =>
        Math.sin(tau * (45 * x + 95 * 0.028 * (1 - Math.exp(-x / 0.028)))) *
        Math.exp(-x * 13) *
        0.46,
    );
    note(k + (b % 2 ? 0.5 : 0) * beat, c[0] - 12, 0.35, 0.24, 'bass');
    if (b === 1 || b === 3) {
      let z = 0;
      add(
        k,
        0.19,
        (x) => {
          const q = rnd();
          z = z * 0.6 + q * 0.4;
          return (
            (q - z) * Math.exp(-x * 20) * 0.21 +
            Math.sin(tau * 175 * x) * Math.exp(-x * 35) * 0.12
          );
        },
        0.08,
      );
    }
  }
  for (let s = 0; s < 8; s++) {
    const k = t + s * 0.5 * beat + (s % 2 ? 0.012 : 0);
    let z = 0;
    add(
      k,
      s % 2 ? 0.11 : 0.065,
      (x) => {
        const q = rnd(),
          high = q - z;
        z = q;
        return (
          high * Math.exp(-x * (s % 2 ? 36 : 64)) * (s % 2 ? 0.041 : 0.055)
        );
      },
      s % 2 ? 0.35 : -0.35,
    );
    const m = mel[s];
    if (!(bar % 4 === 3 && s === 7))
      note(k, m, 0.33, bar < 4 ? 0.1 : 0.12, 'lead', s % 2 ? 0.14 : -0.14);
  }
  if (bar >= 4) {
    for (let s = 0; s < 16; s++) {
      const m = c[(s * 3) % 4] + 12;
      note(t + s * 0.25 * beat, m, 0.17, 0.034, 'lead', Math.sin(s) * 0.65);
    }
  }
  if (bar % 4 === 3) {
    for (let s = 0; s < 4; s++) {
      const k = t + 3 * beat + s * 0.25 * beat;
      add(
        k,
        0.07,
        (x) => rnd() * Math.exp(-x * 50) * 0.025,
        s % 2 ? 0.5 : -0.5,
      );
    }
  }
}
let peak = 0,
  sum = 0;
for (let i = 0; i < n; i++) {
  l[i] = Math.tanh(l[i] * 1.3);
  r[i] = Math.tanh(r[i] * 1.3);
  peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
  sum += (l[i] * l[i] + r[i] * r[i]) / 2;
}
const scale = 0.88 / peak,
  data = Buffer.alloc(44 + n * 4);
data.write('RIFF', 0);
data.writeUInt32LE(36 + n * 4, 4);
data.write('WAVEfmt ', 8);
data.writeUInt32LE(16, 16);
data.writeUInt16LE(1, 20);
data.writeUInt16LE(2, 22);
data.writeUInt32LE(sr, 24);
data.writeUInt32LE(sr * 4, 28);
data.writeUInt16LE(4, 32);
data.writeUInt16LE(16, 34);
data.write('data', 36);
data.writeUInt32LE(n * 4, 40);
for (let i = 0; i < n; i++) {
  data.writeInt16LE(Math.round(l[i] * scale * 32767), 44 + i * 4);
  data.writeInt16LE(Math.round(r[i] * scale * 32767), 46 + i * 4);
}
fs.writeFileSync(process.argv[2] || 'neon-factory-loop.wav', data);
console.log(
  JSON.stringify({
    duration,
    bpm,
    bars,
    peak: 0.88,
    rms: Math.sqrt(sum / n) * scale,
  }),
);
