export class Hud {
  constructor() {
    this.root = document.getElementById('hud');
    this.heartsEl = document.getElementById('hearts');
    this.crystalsEl = document.getElementById('crystals');
    this.messageEl = document.getElementById('message');
    this.furyBarEl = document.getElementById('fury-bar');
    this.furyFillEl = document.getElementById('fury-fill');
    this.furyGlowEl = document.getElementById('fury-glow');
    this._msgTimer = null;
    this._lastFury = -1;
  }

  show() { this.root.classList.add('visible'); }
  hide() { this.root.classList.remove('visible'); }

  setHearts(n, max = 3) {
    this.heartsEl.textContent = '❤️'.repeat(n) + '🤍'.repeat(Math.max(0, max - n));
  }

  setCrystals(n, total) {
    this.crystalsEl.textContent = `◆ ${n}/${total}`;
  }

  flashMessage(text, ms = 1800) {
    this.messageEl.textContent = text;
    this.messageEl.classList.add('visible');
    clearTimeout(this._msgTimer);
    this._msgTimer = setTimeout(() => this.messageEl.classList.remove('visible'), ms);
  }

  setFury(fraction) {
    // Only touch DOM when the value actually changes (avoid layout thrashing)
    const rounded = Math.round(fraction * 200); // ~0.5% resolution
    if (rounded === this._lastFury) return;
    this._lastFury = rounded;
    if (this.furyFillEl) {
      this.furyFillEl.style.width = `${fraction * 100}%`;
    }
    if (this.furyGlowEl) {
      this.furyGlowEl.style.opacity = fraction >= 1 ? '1' : '0';
    }
  }

  setFuryActive(active) {
    if (this.furyBarEl) {
      this.furyBarEl.classList.toggle('fury-active', active);
    }
  }
}

export class Screens {
  constructor() {
    this.title = document.getElementById('title-screen');
    this.win = document.getElementById('win-screen');
    this.death = document.getElementById('death-screen');
    this.winStats = document.getElementById('win-stats');
  }

  hideAll() {
    this.title.classList.add('hidden');
    this.win.classList.add('hidden');
    this.death.classList.add('hidden');
  }

  showWin(crystals, total) {
    this.winStats.textContent = `◆ Crystals: ${crystals} / ${total}`;
    this.win.classList.remove('hidden');
  }

  showDeath() { this.death.classList.remove('hidden'); }
}
