import { assetUrl } from './asset-url.js';

export class ParkAudio {
  constructor(onError = (_message) => {}) {
    this.context = null;
    this.music = null;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.started = false;
    this.paused = false;
    this.onError = onError;
    this.last = {};
    this.duckTimer = null;
  }
  ensureAudio() {
    if (!this.music) {
      this.music = new Audio(assetUrl('/audio/neon-factory-loop.mp3'));
      this.music.loop = true;
      this.music.preload = 'auto';
      this.music.volume = 0.34;
      this.music.addEventListener('error', () =>
        this.onError('背景音乐暂时无法加载，可关闭后重新开启。'),
      );
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!this.context && AudioContext) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.65;
      const limiter = this.context.createDynamicsCompressor();
      limiter.threshold.value = -14;
      limiter.knee.value = 12;
      limiter.ratio.value = 5;
      this.master.connect(limiter);
      limiter.connect(this.context.destination);
      this.noise = this.context.createBuffer(
        1,
        this.context.sampleRate,
        this.context.sampleRate,
      );
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
  }
  async activate() {
    this.ensureAudio();
    this.started = true;
    if (this.context?.state === 'suspended') await this.context.resume();
    if (this.musicEnabled && !this.paused) await this.music.play();
  }
  async setMusicEnabled(value) {
    this.musicEnabled = value;
    if (value) await this.activate();
    else this.music?.pause();
  }
  async setSfxEnabled(value) {
    this.sfxEnabled = value;
    if (this.master)
      this.master.gain.setTargetAtTime(
        value && !this.paused ? 0.65 : 0,
        this.context.currentTime,
        0.02,
      );
    if (value) {
      this.ensureAudio();
      if (this.context?.state === 'suspended') await this.context.resume();
    }
  }
  setPaused(value) {
    this.paused = value;
    if (value) this.music?.pause();
    else if (this.started && this.musicEnabled)
      this.music
        ?.play()
        .catch(() => this.onError('点击 BGM 按钮可重新开启音乐。'));
    if (this.master)
      this.master.gain.setTargetAtTime(
        value || !this.sfxEnabled ? 0 : 0.65,
        this.context.currentTime,
        0.025,
      );
  }
  tone(f, duration, type, volume, end = null, delay = 0) {
    if (!this.context || !this.sfxEnabled || this.paused) return;
    const c = this.context,
      t = c.currentTime + delay,
      o = c.createOscillator(),
      gain = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (end) o.frequency.exponentialRampToValueAtTime(end, t + duration);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(gain);
    gain.connect(this.master);
    o.onended = () => {
      o.disconnect();
      gain.disconnect();
    };
    o.start(t);
    o.stop(t + duration + 0.015);
  }
  impact(duration, volume, frequency, filterType = 'lowpass') {
    if (!this.context || !this.sfxEnabled || this.paused) return;
    const c = this.context,
      t = c.currentTime,
      source = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      gain = c.createGain();
    source.buffer = this.noise;
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequency, t);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(100, frequency * 0.2),
      t + duration,
    );
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    source.start(t);
    source.stop(t + duration);
  }
  play(event) {
    const type = typeof event === 'string' ? event : event.type;
    if (!this.context || !this.sfxEnabled || this.paused) return;
    const now = this.context.currentTime;
    if (now - (this.last[type] ?? -10) < (type === 'destroy' ? 0.08 : 0.04))
      return;
    this.last[type] = now;
    if (type === 'bomb') {
      this.tone(560, 0.14, 'sine', 0.2, 180);
      this.tone(840, 0.07, 'sine', 0.07, 420, 0.03);
    }
    if (type === 'explode') {
      this.impact(0.38, 0.38, 2400);
      this.tone(155, 0.33, 'sine', 0.34, 38);
      this.tone(300, 0.12, 'triangle', 0.1, 62);
    }
    if (type === 'destroy') {
      this.impact(0.15, 0.13, 5500, 'highpass');
      this.tone(720, 0.08, 'triangle', 0.085, 180);
    }
    if (type === 'pickup')
      [660, 880, 1175].forEach((f, i) =>
        this.tone(f, 0.15, 'sine', 0.12, null, i * 0.055),
      );
    if (type === 'start')
      [392, 494, 587].forEach((f, i) =>
        this.tone(f, 0.18, 'triangle', 0.08, null, i * 0.1),
      );
    if (type === 'hurt' || type === 'eliminated') {
      this.tone(255, 0.29, 'sawtooth', 0.075, 55);
      this.impact(0.18, 0.13, 1600);
    }
    if (type === 'unlock') {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
        this.tone(f, 0.7, 'triangle', 0.09, null, i * 0.105),
      );
      [261.63, 329.63, 392].forEach((f) =>
        this.tone(f, 1.6, 'sine', 0.07, null, 0.25),
      );
      if (this.music) {
        this.music.volume = 0.13;
        clearTimeout(this.duckTimer);
        this.duckTimer = setTimeout(() => {
          if (this.music) this.music.volume = 0.34;
        }, 1900);
      }
    }
    if (type === 'finish' && !['won', 'complete'].includes(event.result)) {
      const win = ['p1', 'p2'].includes(event.result),
        notes = win ? [523, 659, 784, 1046] : [392, 349, 294, 196];
      notes.forEach((f, i) =>
        this.tone(f, 0.3, 'triangle', 0.1, null, i * 0.13),
      );
    }
  }
  dispose() {
    clearTimeout(this.duckTimer);
    this.music?.pause();
    if (this.music) {
      this.music.removeAttribute('src');
      this.music.load();
    }
    this.context?.close();
    this.music = null;
    this.context = null;
  }
}
