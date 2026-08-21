import { MathUtils } from '../utils/MathUtils.js';

export class ProjectileEntity {
  constructor(scene, data) {
    this.scene = scene;
    this.id = data.id;
    this.ownerId = data.ownerId;
    this.colorHex = data.color || '#00f0ff';
    this.colorNum = MathUtils.hexToNumber(this.colorHex);

    this.x = data.x;
    this.y = data.y;
    this.vx = data.vx;
    this.vy = data.vy;
    this.angle = data.angle;

    // Laser Bolt Graphics Container
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(8);
    this.drawLaser();

    // Laser Spark Trail
    this.sparkTrail = scene.add.particles(this.x, this.y, 'particle_dot', {
      speed: { min: 10, max: 40 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: this.colorNum,
      lifespan: 120,
      frequency: 20,
    });
    this.sparkTrail.setDepth(7);
  }

  drawLaser() {
    this.graphics.clear();
    this.graphics.setPosition(this.x, this.y);
    this.graphics.setRotation(this.angle);

    // Outer Glow Halo
    this.graphics.fillStyle(this.colorNum, 0.4);
    this.graphics.fillRoundedRect(-14, -4, 28, 8, 4);

    // Inner Bright Core
    this.graphics.fillStyle(0xffffff, 1);
    this.graphics.fillRoundedRect(-10, -2, 20, 4, 2);
  }

  updateFromSnapshot(data) {
    this.x = data.x;
    this.y = data.y;
    this.vx = data.vx;
    this.vy = data.vy;
    this.angle = data.angle;

    this.graphics.setPosition(this.x, this.y);
    this.graphics.setRotation(this.angle);
    this.sparkTrail.setPosition(this.x, this.y);
  }

  destroy() {
    if (this.graphics) this.graphics.destroy();
    if (this.sparkTrail) {
      this.sparkTrail.stop();
      this.scene.time.delayedCall(150, () => {
        this.sparkTrail.destroy();
      });
    }
  }
}
