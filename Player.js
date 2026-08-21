import { PLAYER_CONFIG } from '../config/constants.js';
import { Collision } from './Collision.js';

export const PLAYER_COLORS = [
  '#00f0ff', // Cyber Cyan
  '#ff0055', // Neon Pink / Magenta
  '#00ff66', // Matrix Green
  '#ffe600', // Electric Amber
  '#ff7700', // Solar Orange
  '#b026ff', // Cyber Purple
  '#00e5ff', // Deep Cyan
  '#ff3366', // Crimson Neon
];

export class Player {
  constructor(id, name, colorIndex = 0) {
    this.id = id;
    this.name = this.sanitizeName(name);
    this.color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
    this.colorIndex = colorIndex;

    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0; // In radians
    this.radius = PLAYER_CONFIG.RADIUS;

    this.health = PLAYER_CONFIG.MAX_HEALTH;
    this.maxHealth = PLAYER_CONFIG.MAX_HEALTH;
    this.isAlive = true;
    this.respawnTimer = 0;
    this.invulnerableTimer = 0;

    this.kills = 0;
    this.deaths = 0;
    this.score = 0;

    this.isReady = false;
    this.isHost = false;

    this.lastShotTime = 0;
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      angle: 0,
      shoot: false,
    };
  }

  sanitizeName(rawName) {
    if (!rawName || typeof rawName !== 'string') return 'Pilot_' + Math.floor(1000 + Math.random() * 9000);
    const cleaned = rawName.replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
    if (cleaned.length < PLAYER_CONFIG.MIN_NAME_LENGTH) {
      return 'Pilot_' + Math.floor(1000 + Math.random() * 9000);
    }
    return cleaned.slice(0, PLAYER_CONFIG.MAX_NAME_LENGTH);
  }

  spawn(x, y, angle = 0) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = angle;
    this.health = this.maxHealth;
    this.isAlive = true;
    this.respawnTimer = 0;
    this.invulnerableTimer = PLAYER_CONFIG.INVULNERABILITY_TIME;
  }

  setInput(inputData) {
    if (!inputData || typeof inputData !== 'object') return;
    this.input.up = !!inputData.up;
    this.input.down = !!inputData.down;
    this.input.left = !!inputData.left;
    this.input.right = !!inputData.right;

    if (typeof inputData.angle === 'number' && !isNaN(inputData.angle)) {
      this.angle = inputData.angle;
      this.input.angle = inputData.angle;
    }
    this.input.shoot = !!inputData.shoot;
  }

  update(dt, arena) {
    if (!this.isAlive) {
      this.vx = 0;
      this.vy = 0;
      if (this.respawnTimer > 0) {
        this.respawnTimer -= dt;
      }
      return;
    }

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    let moveX = 0;
    let moveY = 0;

    if (this.input.up) moveY -= 1;
    if (this.input.down) moveY += 1;
    if (this.input.left) moveX -= 1;
    if (this.input.right) moveX += 1;

    // Normalize diagonal movement
    if (moveX !== 0 && moveY !== 0) {
      moveX *= PLAYER_CONFIG.DIAGONAL_MODIFIER;
      moveY *= PLAYER_CONFIG.DIAGONAL_MODIFIER;
    }

    this.vx = moveX * PLAYER_CONFIG.BASE_SPEED;
    this.vy = moveY * PLAYER_CONFIG.BASE_SPEED;

    // Provisional new position
    let newX = this.x + this.vx * dt;
    let newY = this.y + this.vy * dt;

    // Resolve collisions against all arena obstacles (including boundary walls)
    for (const obstacle of arena.obstacles) {
      const res = Collision.resolveCircleRect(newX, newY, this.radius, obstacle);
      newX = res.x;
      newY = res.y;
    }

    this.x = newX;
    this.y = newY;
  }

  takeDamage(amount) {
    if (!this.isAlive || this.invulnerableTimer > 0) return false;

    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.isAlive = false;
      this.deaths += 1;
      this.respawnTimer = PLAYER_CONFIG.RESPAWN_DELAY;
      return true; // Indicates player died on this hit
    }
    return false;
  }

  resetMatchStats() {
    this.kills = 0;
    this.deaths = 0;
    this.score = 0;
    this.health = this.maxHealth;
    this.isAlive = true;
    this.respawnTimer = 0;
    this.invulnerableTimer = 0;
  }

  serialize() {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      colorIndex: this.colorIndex,
      x: Math.round(this.x * 10) / 10,
      y: Math.round(this.y * 10) / 10,
      vx: Math.round(this.vx),
      vy: Math.round(this.vy),
      angle: Math.round(this.angle * 1000) / 1000,
      health: this.health,
      maxHealth: this.maxHealth,
      isAlive: this.isAlive,
      isInvulnerable: this.invulnerableTimer > 0,
      respawnTimer: Math.max(0, Math.round(this.respawnTimer * 10) / 10),
      kills: this.kills,
      deaths: this.deaths,
      score: this.score,
      isReady: this.isReady,
      isHost: this.isHost,
    };
  }
}
