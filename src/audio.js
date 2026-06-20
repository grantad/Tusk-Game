// Tiny WebAudio synth — no audio files needed.
export class Sfx {
  constructor() {
    this.ctx = null;
  }

  // Must be called from a user gesture (button tap) to unlock audio on mobile.
  unlock() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  _tone(freq, endFreq, duration, type = 'square', volume = 0.15) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  jump() { this._tone(300, 600, 0.18, 'square', 0.1); }
  doubleJump() { this._tone(400, 880, 0.2, 'square', 0.1); }
  collect() { this._tone(880, 1760, 0.15, 'sine', 0.18); }
  charge() { this._tone(200, 90, 0.25, 'sawtooth', 0.12); }
  stomp() { this._tone(220, 60, 0.2, 'square', 0.15); }
  hurt() { this._tone(160, 60, 0.35, 'sawtooth', 0.18); }
  checkpoint() { this._tone(523, 1046, 0.3, 'triangle', 0.15); }
  win() {
    if (!this.ctx) return;
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this._tone(f, f, 0.25, 'triangle', 0.16), i * 130);
    });
  }
  death() { this._tone(300, 40, 0.7, 'sawtooth', 0.15); }
  groundPound() {
    this._tone(120, 30, 0.4, 'sawtooth', 0.2);
    this._tone(80, 20, 0.5, 'square', 0.12);
  }
  wallCling() {
    this._tone(600, 200, 0.12, 'sawtooth', 0.08);
  }
  shield() {
    this._tone(440, 660, 0.3, 'sine', 0.12);
    this._tone(880, 1320, 0.3, 'sine', 0.06);
  }
  shieldBreak() {
    this._tone(1200, 200, 0.3, 'square', 0.15);
    this._tone(800, 100, 0.35, 'sawtooth', 0.1);
  }
  furyActivate() {
    if (!this.ctx) return;
    [220, 330, 440, 660, 880].forEach((f, i) => {
      setTimeout(() => this._tone(f, f * 1.5, 0.2, 'sawtooth', 0.12), i * 80);
    });
  }
  thunderPounce() {
    this._tone(1000, 2000, 0.15, 'square', 0.1);
    this._tone(600, 1400, 0.2, 'sawtooth', 0.08);
  }
}
