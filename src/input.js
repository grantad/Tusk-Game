export class Input {
  constructor() {
    this.keys = new Set();
    this.moveX = 0;      // -1..1 strafe
    this.moveZ = 0;      // -1..1 forward
    this.lookDX = 0;     // accumulated look delta this frame
    this.lookDY = 0;
    this.jumpPressed = false;    // edge-triggered, consumed each frame
    this.attackPressed = false;
    this.guardHeld = false;
    this.furyPressed = false;
    this.isTouch = window.matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0;

    this._joyVec = { x: 0, y: 0 };
    this._setupKeyboard();
    this._setupMouse();
    if (this.isTouch) {
      document.body.classList.add('touch');
      this._setupTouch();
    }
  }

  _setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'Space') { this.jumpPressed = true; e.preventDefault(); }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyJ') this.attackPressed = true;
      if (e.code === 'KeyQ') this.guardHeld = true;
      if (e.code === 'KeyF') this.furyPressed = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'KeyQ') this.guardHeld = false;
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.guardHeld = false;
    });
  }

  _setupMouse() {
    const canvas = document.getElementById('game-canvas');
    let dragging = false;
    canvas.addEventListener('mousedown', (e) => {
      dragging = true;
      if (e.button === 0) this.attackPressed = true;
    });
    window.addEventListener('mouseup', () => { dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      this.lookDX += e.movementX;
      this.lookDY += e.movementY;
    });
  }

  _setupTouch() {
    const zone = document.getElementById('joystick-zone');
    const base = document.getElementById('joystick-base');
    const knob = document.getElementById('joystick-knob');
    const RADIUS = 45;
    let joyId = null;
    let origin = { x: 0, y: 0 };

    const setKnob = (dx, dy) => {
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (joyId !== null) return;
      const t = e.changedTouches[0];
      joyId = t.identifier;
      origin = { x: t.clientX, y: t.clientY };
      base.style.display = 'block';
      base.style.left = `${origin.x}px`;
      base.style.top = `${origin.y}px`;
      setKnob(0, 0);
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== joyId) continue;
        let dx = t.clientX - origin.x;
        let dy = t.clientY - origin.y;
        const len = Math.hypot(dx, dy);
        if (len > RADIUS) { dx = dx / len * RADIUS; dy = dy / len * RADIUS; }
        setKnob(dx, dy);
        this._joyVec.x = dx / RADIUS;
        this._joyVec.y = dy / RADIUS;
      }
    }, { passive: false });

    const endJoy = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== joyId) continue;
        joyId = null;
        this._joyVec.x = 0;
        this._joyVec.y = 0;
        base.style.display = 'none';
      }
    };
    zone.addEventListener('touchend', endJoy);
    zone.addEventListener('touchcancel', endJoy);

    // Right-side look drag (anywhere not on joystick zone or buttons)
    const canvas = document.getElementById('game-canvas');
    let lookId = null;
    let lookLast = { x: 0, y: 0 };
    canvas.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        if (lookId === null && t.clientX > window.innerWidth * 0.45) {
          lookId = t.identifier;
          lookLast = { x: t.clientX, y: t.clientY };
        }
      }
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== lookId) continue;
        this.lookDX += (t.clientX - lookLast.x) * 2.2;
        this.lookDY += (t.clientY - lookLast.y) * 2.2;
        lookLast = { x: t.clientX, y: t.clientY };
      }
    }, { passive: false });
    const endLook = (e) => {
      for (const t of e.changedTouches) if (t.identifier === lookId) lookId = null;
    };
    canvas.addEventListener('touchend', endLook);
    canvas.addEventListener('touchcancel', endLook);

    // Buttons
    const bindBtn = (id, fn) => {
      const el = document.getElementById(id);
      el.addEventListener('touchstart', (e) => { e.preventDefault(); fn(); }, { passive: false });
    };
    bindBtn('btn-jump', () => { this.jumpPressed = true; });
    bindBtn('btn-attack', () => { this.attackPressed = true; });

    const bindHoldBtn = (id, onDown, onUp) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(); }, { passive: false });
      el.addEventListener('touchend', (e) => { e.preventDefault(); onUp(); }, { passive: false });
      el.addEventListener('touchcancel', (e) => { e.preventDefault(); onUp(); }, { passive: false });
    };
    bindHoldBtn('btn-guard', () => { this.guardHeld = true; }, () => { this.guardHeld = false; });
    bindBtn('btn-fury', () => { this.furyPressed = true; });
  }

  // Call once per frame BEFORE reading; computes axes from keys/joystick.
  poll() {
    let x = 0, z = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    if (x === 0 && z === 0) { x = this._joyVec.x; z = this._joyVec.y; }
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    this.moveX = x;
    this.moveZ = z;
  }

  // Call at the END of the frame to consume edge-triggered inputs.
  endFrame() {
    this.jumpPressed = false;
    this.attackPressed = false;
    this.furyPressed = false;
    this.lookDX = 0;
    this.lookDY = 0;
  }
}
