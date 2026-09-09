import test from 'node:test';
import assert from 'node:assert/strict';
import { ParkAudio } from '../components/game/audio.js';
class Param {
  constructor() {
    this.value = 0;
  }
  setValueAtTime(v) {
    this.value = v;
  }
  linearRampToValueAtTime(v) {
    this.value = v;
  }
  exponentialRampToValueAtTime(v) {
    this.value = v;
  }
  setTargetAtTime(v) {
    this.value = v;
  }
}
class SoundNode {
  constructor() {
    this.gain = new Param();
    this.frequency = new Param();
    this.threshold = new Param();
    this.knee = new Param();
    this.ratio = new Param();
  }
  connect() {}
  disconnect() {}
  start() {
    this.started = true;
  }
  stop() {}
}
class Context {
  constructor() {
    this.state = 'suspended';
    this.currentTime = 10;
    this.sampleRate = 100;
    this.destination = {};
    this.voices = [];
  }
  async resume() {
    this.state = 'running';
  }
  createGain() {
    return new SoundNode();
  }
  createDynamicsCompressor() {
    return new SoundNode();
  }
  createBiquadFilter() {
    return new SoundNode();
  }
  createOscillator() {
    const v = new SoundNode();
    this.voices.push(v);
    return v;
  }
  createBufferSource() {
    const v = new SoundNode();
    this.voices.push(v);
    return v;
  }
  createBuffer() {
    return { getChannelData: () => new Float32Array(100) };
  }
  close() {
    this.state = 'closed';
  }
}
class Music {
  constructor(src) {
    this.src = src;
    this.playing = false;
    this.plays = 0;
  }
  addEventListener() {}
  async play() {
    this.playing = true;
    this.plays++;
  }
  pause() {
    this.playing = false;
  }
  removeAttribute() {
    this.src = '';
  }
  load() {}
}
function setup() {
  const w = globalThis.window,
    a = globalThis.Audio;
  globalThis.window = { AudioContext: Context };
  globalThis.Audio = Music;
  return () => {
    globalThis.window = w;
    globalThis.Audio = a;
  };
}
test('BGM starts only after activation, loops, pauses and resumes', async () => {
  const clean = setup();
  const audio = new ParkAudio();
  try {
    assert.equal(audio.music, null);
    await audio.activate();
    assert.equal(audio.music.loop, true);
    assert.equal(audio.music.playing, true);
    assert.match(audio.music.src, /neon-factory-loop.mp3$/);
    audio.setPaused(true);
    assert.equal(audio.music.playing, false);
    audio.setPaused(false);
    assert.equal(audio.music.playing, true);
  } finally {
    audio.dispose();
    clean();
  }
});
test('BGM and sound effects can be muted independently and stay muted across pause', async () => {
  const clean = setup();
  const audio = new ParkAudio();
  try {
    await audio.activate();
    await audio.setMusicEnabled(false);
    audio.play('bomb');
    assert.equal(audio.music.playing, false);
    assert.ok(audio.context.voices.length > 0);
    await audio.setSfxEnabled(false);
    const count = audio.context.voices.length;
    audio.play('explode');
    assert.equal(audio.context.voices.length, count);
    audio.setPaused(true);
    audio.setPaused(false);
    assert.equal(audio.music.playing, false);
    assert.equal(audio.master.gain.value, 0);
    await audio.setMusicEnabled(true);
    assert.equal(audio.music.playing, true);
    assert.equal(audio.sfxEnabled, false);
  } finally {
    audio.dispose();
    clean();
  }
});
test('placement, explosion, block break and unlock trigger separate sounds without repeated same-tick explosions', async () => {
  const clean = setup();
  const audio = new ParkAudio();
  try {
    await audio.activate();
    for (const type of [
      'bomb',
      'explode',
      'destroy',
      'pickup',
      'unlock',
      'boss-awake',
      'boss-rage',
      'attack-warning',
      'summon-warning',
      'boss-attack',
      'boss-hit',
      'boss-defeated',
      'summon',
    ]) {
      const count = audio.context.voices.length;
      audio.play({ type });
      assert.ok(audio.context.voices.length > count, type);
    }
    const beforeFinale = audio.context.voices.length;
    audio.play({ type: 'finish', result: 'complete' });
    assert(
      audio.context.voices.length >= beforeFinale + 7,
      'campaign victory has its own fanfare',
    );
    const count = audio.context.voices.length;
    audio.play({ type: 'explode' });
    assert.equal(audio.context.voices.length, count);
    audio.dispose();
    assert.equal(audio.music, null);
    assert.equal(audio.context, null);
  } finally {
    clean();
  }
});
