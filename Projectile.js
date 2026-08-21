import { WEAPON_CONFIG } from '../config/constants.js';

let projectileCounter = 0;

export class Projectile {
  constructor(ownerId, ownerName, x, y, angle, color) {
    this.id = `proj_${Date.now()}_${++projectileCounter}`;
    this.ownerId = ownerId;
    this.ownerName = ownerName;
    this.color = color;

    // Spawn slightly in front of the player
    const spawnOffset = 28;
    this.x = x + Math.cos(angle) * spawnOffset;
    this.y = y + Math.sin(angle) * spawnOffset;

    this.vx = Math.cos(angle) * WEAPON_CONFIG.PROJECTILE_SPEED;
    this.vy = Math.sin(angle) * WEAPON_CONFIG.PROJECTILE_SPEED;
    this.angle = angle;

    this.radius = WEAPON_CONFIG.PROJECTILE_RADIUS;
    this.damage = WEAPON_CONFIG.DAMAGE;
    this.lifetime = WEAPON_CONFIG.PROJECTILE_LIFETIME;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifetime -= dt;

    return this.lifetime <= 0; // True if expired
  }

  serialize() {
    return {
      id: this.id,
      ownerId: this.ownerId,
      x: Math.round(this.x * 10) / 10,
      y: Math.round(this.y * 10) / 10,
      vx: Math.round(this.vx),
      vy: Math.round(this.vy),
      angle: Math.round(this.angle * 1000) / 1000,
      color: this.color,
    };
  }
}
