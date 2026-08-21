import { MathUtils } from '../utils/MathUtils.js';
import { CLIENT_CONFIG } from '../config.js';

export class PlayerEntity {
  constructor(scene, playerData, isLocal = false) {
    this.scene = scene;
    this.id = playerData.id;
    this.name = playerData.name;
    this.colorHex = playerData.color || '#00f0ff';
    this.colorNum = MathUtils.hexToNumber(this.colorHex);
    this.isLocal = isLocal;

    this.x = playerData.x || 0;
    this.y = playerData.y || 0;
    this.targetX = this.x;
    this.targetY = this.y;

    this.angle = playerData.angle || 0;
    this.targetAngle = this.angle;

    this.health = playerData.health || 100;
    this.maxHealth = playerData.maxHealth || 100;
    this.isAlive = playerData.isAlive !== undefined ? playerData.isAlive : true;
    this.isInvulnerable = !!playerData.isInvulnerable;
    this.isMoving = false;

    // Main Container
    this.container = scene.add.container(this.x, this.y);
    this.container.setDepth(10);

    // 1. Ship Graphics (Hull + Cannon + Neon Accents + Shield)
    this.shipGraphics = scene.add.graphics();
    this.drawShip();
    this.container.add(this.shipGraphics);

    // 2. Nametag & Health Bar Container (Unrotated above player)
    this.uiContainer = scene.add.container(this.x, this.y - 42);
    this.uiContainer.setDepth(15);

    // Nametag Text
    this.nameText = scene.add.text(0, -10, this.name, {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: this.isLocal ? '#00f0ff' : '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.nameText.setOrigin(0.5, 0.5);
    this.uiContainer.add(this.nameText);

    // Mini HP Bar
    this.hpBarBg = scene.add.rectangle(0, 4, 44, 5, 0x000000, 0.8);
    this.hpBarBg.setStrokeStyle(1, 0x00f0ff, 0.5);
    this.hpBarFill = scene.add.rectangle(-21, 4, 42, 3, 0x00ff66, 1);
    this.hpBarFill.setOrigin(0, 0.5);

    this.uiContainer.add(this.hpBarBg);
    this.uiContainer.add(this.hpBarFill);

    // 3. Thruster Particle Emitter
    if (scene.textures.exists('particle_dot')) {
      this.thrusterParticles = scene.add.particles(0, 0, 'particle_dot', {
        speed: { min: 20, max: 60 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.7, end: 0 },
        tint: this.colorNum,
        lifespan: 180,
        frequency: 40,
        emitting: false,
      });
      this.thrusterParticles.setDepth(5);
    }
  }

  drawShip() {
    this.shipGraphics.clear();

    if (!this.isAlive) {
      // Charred Wreck
      this.shipGraphics.fillStyle(0x222222, 0.4);
      this.shipGraphics.fillCircle(0, 0, 16);
      this.shipGraphics.lineStyle(1.5, 0x444444, 0.6);
      this.shipGraphics.strokeCircle(0, 0, 16);
      return;
    }

    // Shield Dome when Invulnerable
    if (this.isInvulnerable) {
      this.shipGraphics.lineStyle(2, 0x00f0ff, 0.85);
      this.shipGraphics.strokeCircle(0, 0, 32);
      this.shipGraphics.fillStyle(0x00f0ff, 0.15);
      this.shipGraphics.fillCircle(0, 0, 32);
    }

    // Outer Glow Ring
    this.shipGraphics.lineStyle(1.5, this.colorNum, 0.45);
    this.shipGraphics.strokeCircle(0, 0, 24);

    // Ship Hull (Triangular Cyber Fighter)
    this.shipGraphics.fillStyle(0x0b172a, 0.95);
    this.shipGraphics.beginPath();
    this.shipGraphics.moveTo(22, 0); // Nose
    this.shipGraphics.lineTo(-16, -18); // Left Wing
    this.shipGraphics.lineTo(-8, 0); // Engine indention
    this.shipGraphics.lineTo(-16, 18); // Right Wing
    this.shipGraphics.closePath();
    this.shipGraphics.fillPath();

    // Hull Neon Edge Stroke
    this.shipGraphics.lineStyle(2.5, this.colorNum, 1);
    this.shipGraphics.strokePath();

    // Dual Plasma Cannons
    this.shipGraphics.fillStyle(this.colorNum, 1);
    this.shipGraphics.fillRect(6, -14, 12, 3);
    this.shipGraphics.fillRect(6, 11, 12, 3);

    // Central Glowing Reactor Core
    this.shipGraphics.fillStyle(0xffffff, 0.9);
    this.shipGraphics.fillCircle(0, 0, 5);
    this.shipGraphics.fillStyle(this.colorNum, 0.7);
    this.shipGraphics.fillCircle(0, 0, 9);
  }

  updateFromSnapshot(data) {
    this.targetX = data.x;
    this.targetY = data.y;
    this.targetAngle = data.angle;

    this.isMoving = Math.abs(data.vx) > 5 || Math.abs(data.vy) > 5;

    // Check health change for hit flinch
    if (data.health < this.health) {
      this.playHitFlinch();
    }
    this.health = data.health;
    this.maxHealth = data.maxHealth || 100;

    const prevInvulnerable = this.isInvulnerable;
    this.isInvulnerable = !!data.isInvulnerable;

    const wasAlive = this.isAlive;
    this.isAlive = data.isAlive;

    if (wasAlive && !this.isAlive) {
      this.onDeath();
    } else if (!wasAlive && this.isAlive) {
      this.onRespawn();
    } else if (prevInvulnerable !== this.isInvulnerable) {
      this.drawShip();
    }

    this.updateHpBar();
  }

  updateHpBar() {
    const hpPct = Math.max(0, this.health / this.maxHealth);
    this.hpBarFill.width = 42 * hpPct;

    if (hpPct > 0.5) {
      this.hpBarFill.setFillStyle(0x00ff66, 1);
    } else if (hpPct > 0.25) {
      this.hpBarFill.setFillStyle(0xffe600, 1);
    } else {
      this.hpBarFill.setFillStyle(0xff0055, 1);
    }
  }

  playHitFlinch() {
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0.3,
      duration: 50,
      yoyo: true,
      repeat: 1,
    });
  }

  onDeath() {
    this.drawShip();
    this.uiContainer.setVisible(false);
    if (this.thrusterParticles) this.thrusterParticles.stop();
  }

  onRespawn() {
    this.x = this.targetX;
    this.y = this.targetY;
    this.container.setPosition(this.x, this.y);
    this.drawShip();
    this.uiContainer.setVisible(true);
  }

  update(dt) {
    // Smooth Positional Lerping
    this.x = MathUtils.lerp(this.x, this.targetX, CLIENT_CONFIG.INTERPOLATION_LERP);
    this.y = MathUtils.lerp(this.y, this.targetY, CLIENT_CONFIG.INTERPOLATION_LERP);

    this.container.setPosition(this.x, this.y);
    this.uiContainer.setPosition(this.x, this.y - 42);

    // Smooth Angle Lerping
    this.angle = MathUtils.lerpAngle(this.angle, this.targetAngle, CLIENT_CONFIG.ROTATION_LERP);
    this.container.setRotation(this.angle);

    // Thruster Particle position & emission
    if (this.thrusterParticles) {
      if (this.isAlive && this.isMoving) {
        const rearOffset = 18;
        const tx = this.x - Math.cos(this.angle) * rearOffset;
        const ty = this.y - Math.sin(this.angle) * rearOffset;
        this.thrusterParticles.setPosition(tx, ty);
        this.thrusterParticles.start();
      } else {
        this.thrusterParticles.stop();
      }
    }
  }

  destroy() {
    this.container.destroy();
    this.uiContainer.destroy();
    if (this.thrusterParticles) {
      this.thrusterParticles.destroy();
      this.thrusterParticles = null;
    }
  }
}
