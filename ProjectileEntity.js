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

    // A continuous emitter for every projectile was the largest client-side
    // cost during firefights. The bolt graphic already has a glow, so keep
    // the effect lightweight and avoid creating another renderer per shot.
    this.sparkTrail = null;
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
    if (this.sparkTrail) this.sparkTrail.setPosition(this.x, this.y);
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
