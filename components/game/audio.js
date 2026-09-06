export class ParkAudio {
  constructor() {
    this.context = null;
    this.enabled = false;
    this.timer = null;
    this.step = 0;
  }
  async enable(value) {
    this.enabled = value;
    if (value) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      this.context ??= new C();
      if (this.context.state === 'suspended') await this.context.resume();
      this.start();
    } else this.stop();
  }
  tone(f, d = 0.12, type = 'sine', vol = 0.05, end = null) {
    if (!this.enabled || !this.context) return;
    const c = this.context,
      t = c.currentTime,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (end) o.frequency.exponentialRampToValueAtTime(end, t + d);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + d + 0.01);
  }
  play(type) {
    if (type === 'bomb') this.tone(490, 0.12, 'sine', 0.08, 190);
    if (type === 'explode') this.tone(140, 0.3, 'triangle', 0.1, 36);
    if (type === 'pickup') this.tone(660, 0.25, 'sine', 0.07, 980);
    if (type === 'core' || type === 'finish') {
      this.tone(523, 0.4, 'sine', 0.09);
      setTimeout(() => this.tone(784, 0.6, 'sine', 0.06), 150);
    }
    if (type === 'hurt' || type === 'eliminated')
      this.tone(230, 0.25, 'sawtooth', 0.04, 60);
  }
  start() {
    if (this.timer) return;
    const notes = [130.81, 196, 164.81, 196, 130.81, 220, 196, 164.81];
    this.timer = setInterval(() => {
      this.tone(notes[this.step % 8], 0.55, 'sine', 0.022);
      if (this.step % 2 === 0) this.tone(65.4, 0.15, 'triangle', 0.035, 33);
      this.step++;
    }, 480);
  }
  suspend() {
    this.stop();
  }
  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }
  dispose() {
    this.stop();
    this.context?.close();
  }
}
