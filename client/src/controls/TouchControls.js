import { CLIENT_CONFIG } from '../config.js';

// A single dynamic (floating-origin) virtual joystick.
// The base appears wherever the player first touches inside its zone,
// and the nub is dragged relative to that point.
class Joystick {
  constructor(zoneEl, baseEl, nubEl, options = {}) {
    this.zoneEl = zoneEl;
    this.baseEl = baseEl;
    this.nubEl = nubEl;

    this.maxRadius = options.maxRadius || 46;
    this.deadzone = options.deadzone ?? 0.22;
    this.onStart = options.onStart || (() => {});
    this.onMove = options.onMove || (() => {});
    this.onEnd = options.onEnd || (() => {});

    this.activePointerId = null;
    this.originX = 0;
    this.originY = 0;

    // Normalized vector, each axis in [-1, 1]
    this.vector = { x: 0, y: 0 };
    this.angle = 0;
    this.magnitude = 0;
    this.active = false;

    this._onDown = this._onDown.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onUp = this._onUp.bind(this);

    this._bind();
  }

  _bind() {
    this.zoneEl.addEventListener('pointerdown', this._onDown, { passive: false });
    this.zoneEl.addEventListener('pointermove', this._onMove, { passive: false });
    this.zoneEl.addEventListener('pointerup', this._onUp, { passive: false });
    this.zoneEl.addEventListener('pointercancel', this._onUp, { passive: false });
  }

  destroy() {
    this.zoneEl.removeEventListener('pointerdown', this._onDown);
    this.zoneEl.removeEventListener('pointermove', this._onMove);
    this.zoneEl.removeEventListener('pointerup', this._onUp);
    this.zoneEl.removeEventListener('pointercancel', this._onUp);
  }

  _onDown(e) {
    if (this.activePointerId !== null) return; // one touch per stick
    this.activePointerId = e.pointerId;
    try {
      this.zoneEl.setPointerCapture(e.pointerId);
    } catch (err) {
      /* ignore - some browsers don't support capture on plain divs */
    }

    const rect = this.zoneEl.getBoundingClientRect();
    this.originX = e.clientX;
    this.originY = e.clientY;

    this.baseEl.style.left = `${e.clientX - rect.left}px`;
    this.baseEl.style.top = `${e.clientY - rect.top}px`;
    this.baseEl.classList.add('joystick-visible');
    this.nubEl.style.transform = 'translate(-50%, -50%)';

    this.active = true;
    this.vector = { x: 0, y: 0 };
    this.magnitude = 0;
    this.onStart();
    e.preventDefault();
  }

  _onMove(e) {
    if (e.pointerId !== this.activePointerId) return;

    const dx = e.clientX - this.originX;
    const dy = e.clientY - this.originY;
    const rawDist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const dist = Math.min(rawDist, this.maxRadius);
    const clampedX = Math.cos(angle) * dist;
    const clampedY = Math.sin(angle) * dist;

    this.nubEl.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;

    this.angle = angle;
    this.magnitude = dist / this.maxRadius;
    this.vector = {
      x: this.magnitude >= this.deadzone ? clampedX / this.maxRadius : 0,
      y: this.magnitude >= this.deadzone ? clampedY / this.maxRadius : 0,
    };

    this.onMove({ x: this.vector.x, y: this.vector.y, angle: this.angle, magnitude: this.magnitude });
    e.preventDefault();
  }

  _onUp(e) {
    if (e.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    this.active = false;
    this.vector = { x: 0, y: 0 };
    this.magnitude = 0;
    this.baseEl.classList.remove('joystick-visible');
    this.onEnd();
    e.preventDefault();
  }
}

// Wraps the two joysticks + scoreboard button into one interface the
// ArenaScene can query each frame, mirroring the shape of keyboard/mouse
// input (up/left/down/right + angle) so the rest of the game logic
// doesn't need to know whether it's touch or keyboard driving it.
export class TouchControls {
  constructor(scene) {
    this.scene = scene;
    this.network = scene.network;
    this.ui = scene.ui;

    this.layer = document.getElementById('touch-controls-layer');

    this.moveJoystick = null;
    this.aimJoystick = null;
    this.scoreboardBtn = null;

    this.aimAngle = 0;
    this.hasAimed = false;
    this.fireTimer = null;

    this._setup();
  }

  _setup() {
    if (!this.layer) return;
    this.layer.classList.add('active');

    const moveZone = document.getElementById('touch-move-zone');
    const moveBase = document.getElementById('move-joystick-base');
    const moveNub = document.getElementById('move-joystick-nub');

    const aimZone = document.getElementById('touch-aim-zone');
    const aimBase = document.getElementById('aim-joystick-base');
    const aimNub = document.getElementById('aim-joystick-nub');

    this.moveJoystick = new Joystick(moveZone, moveBase, moveNub, {
      maxRadius: 46,
      deadzone: 0.25,
    });

    this.aimJoystick = new Joystick(aimZone, aimBase, aimNub, {
      maxRadius: 46,
      deadzone: 0.15,
      onStart: () => this._startFiring(),
      onMove: ({ angle }) => {
        this.aimAngle = angle;
        this.hasAimed = true;
      },
      onEnd: () => this._stopFiring(),
    });

    this.scoreboardBtn = document.getElementById('touch-scoreboard-btn');
    if (this.scoreboardBtn) {
      const show = (e) => {
        e.preventDefault();
        if (this.ui && this.ui.hud.scoreboardModal) {
          this.ui.hud.scoreboardModal.classList.add('visible');
        }
      };
      const hide = (e) => {
        e.preventDefault();
        if (this.ui && this.ui.hud.scoreboardModal) {
          this.ui.hud.scoreboardModal.classList.remove('visible');
        }
      };
      this.scoreboardBtn.addEventListener('pointerdown', show, { passive: false });
      this.scoreboardBtn.addEventListener('pointerup', hide, { passive: false });
      this.scoreboardBtn.addEventListener('pointercancel', hide, { passive: false });
      this.scoreboardBtn.addEventListener('pointerleave', hide, { passive: false });
    }
  }

  _startFiring() {
    if (this.network) this.network.sendShoot();
    this._stopFiring();
    // Fire at ~ the server's rate limit so every tap of the interval lands.
    this.fireTimer = setInterval(() => {
      if (this.network) this.network.sendShoot();
    }, CLIENT_CONFIG.TOUCH_FIRE_INTERVAL);
  }

  _stopFiring() {
    if (this.fireTimer) {
      clearInterval(this.fireTimer);
      this.fireTimer = null;
    }
  }

  // Returns movement flags in the same shape ArenaScene already expects
  // from the keyboard (up/left/down/right booleans), so diagonals "just work".
  getMovementInput() {
    const v = this.moveJoystick ? this.moveJoystick.vector : { x: 0, y: 0 };
    return {
      up: v.y < 0,
      down: v.y > 0,
      left: v.x < 0,
      right: v.x > 0,
    };
  }

  // Current facing/aim angle to send to the server. Falls back to the
  // player's last known angle until the aim stick has been touched once,
  // so the ship doesn't snap to angle 0 on spawn.
  getAimAngle(fallbackAngle) {
    return this.hasAimed ? this.aimAngle : fallbackAngle;
  }

  destroy() {
    this._stopFiring();
    if (this.moveJoystick) this.moveJoystick.destroy();
    if (this.aimJoystick) this.aimJoystick.destroy();
    if (this.layer) this.layer.classList.remove('active');
  }
}
