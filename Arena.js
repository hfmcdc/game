import { ARENA_CONFIG } from '../config/constants.js';

export class Arena {
  constructor() {
    this.width = ARENA_CONFIG.WIDTH;
    this.height = ARENA_CONFIG.HEIGHT;
    this.borderThickness = ARENA_CONFIG.BORDER_THICKNESS;

    // Static obstacle rectangles: { id, x, y, width, height, type, color }
    // Note: (x, y) is top-left corner
    this.obstacles = [];
    this.spawnPoints = [];

    this.initGeometry();
  }

  initGeometry() {
    const W = this.width;
    const H = this.height;
    const T = this.borderThickness;

    // 1. Boundary walls
    this.obstacles.push(
      { id: 'wall_top', x: 0, y: 0, width: W, height: T, type: 'boundary' },
      { id: 'wall_bottom', x: 0, y: H - T, width: W, height: T, type: 'boundary' },
      { id: 'wall_left', x: 0, y: 0, width: T, height: H, type: 'boundary' },
      { id: 'wall_right', x: W - T, y: 0, width: T, height: H, type: 'boundary' }
    );

    // 2. Central Reactor Core (240x240)
    const centerX = W / 2;
    const centerY = H / 2;
    this.obstacles.push({
      id: 'core_center',
      x: centerX - 120,
      y: centerY - 120,
      width: 240,
      height: 240,
      type: 'core',
    });

    // 3. Four Inner Tactical Columns / Barriers
    // North Barrier
    this.obstacles.push({
      id: 'barrier_north',
      x: centerX - 150,
      y: 420,
      width: 300,
      height: 60,
      type: 'barrier',
    });
    // South Barrier
    this.obstacles.push({
      id: 'barrier_south',
      x: centerX - 150,
      y: H - 480,
      width: 300,
      height: 60,
      type: 'barrier',
    });
    // West Barrier
    this.obstacles.push({
      id: 'barrier_west',
      x: 420,
      y: centerY - 150,
      width: 60,
      height: 300,
      type: 'barrier',
    });
    // East Barrier
    this.obstacles.push({
      id: 'barrier_east',
      x: W - 480,
      y: centerY - 150,
      width: 60,
      height: 300,
      type: 'barrier',
    });

    // 4. Four Corner Bastions (L-Shape / Dual Blocks)
    // Top-Left Bastion
    this.obstacles.push(
      { id: 'bastion_tl_1', x: 320, y: 320, width: 180, height: 60, type: 'bastion' },
      { id: 'bastion_tl_2', x: 320, y: 380, width: 60, height: 120, type: 'bastion' }
    );
    // Top-Right Bastion
    this.obstacles.push(
      { id: 'bastion_tr_1', x: W - 500, y: 320, width: 180, height: 60, type: 'bastion' },
      { id: 'bastion_tr_2', x: W - 380, y: 380, width: 60, height: 120, type: 'bastion' }
    );
    // Bottom-Left Bastion
    this.obstacles.push(
      { id: 'bastion_bl_1', x: 320, y: H - 380, width: 180, height: 60, type: 'bastion' },
      { id: 'bastion_bl_2', x: 320, y: H - 500, width: 60, height: 120, type: 'bastion' }
    );
    // Bottom-Right Bastion
    this.obstacles.push(
      { id: 'bastion_br_1', x: W - 500, y: H - 380, width: 180, height: 60, type: 'bastion' },
      { id: 'bastion_br_2', x: W - 380, y: H - 500, width: 60, height: 120, type: 'bastion' }
    );

    // 5. 8 Symmetrical Spawn Points around the perimeter
    this.spawnPoints = [
      { x: 200, y: 200, angle: Math.PI * 0.25 }, // Top-Left
      { x: centerX, y: 180, angle: Math.PI * 0.5 }, // Top-Center
      { x: W - 200, y: 200, angle: Math.PI * 0.75 }, // Top-Right
      { x: W - 180, y: centerY, angle: Math.PI }, // Right-Center
      { x: W - 200, y: H - 200, angle: -Math.PI * 0.75 }, // Bottom-Right
      { x: centerX, y: H - 180, angle: -Math.PI * 0.5 }, // Bottom-Center
      { x: 200, y: H - 200, angle: -Math.PI * 0.25 }, // Bottom-Left
      { x: 180, y: centerY, angle: 0 }, // Left-Center
    ];
  }

  getSpawnPoint(index) {
    const idx = index % this.spawnPoints.length;
    return { ...this.spawnPoints[idx] };
  }

  getSafeSpawnPoint(livingPlayers = []) {
    if (!livingPlayers || livingPlayers.length === 0) {
      const randIdx = Math.floor(Math.random() * this.spawnPoints.length);
      return { ...this.spawnPoints[randIdx] };
    }

    let bestSpawn = this.spawnPoints[0];
    let maxMinDistSq = -1;

    for (const spawn of this.spawnPoints) {
      let minDistSq = Infinity;
      for (const p of livingPlayers) {
        const dx = spawn.x - p.x;
        const dy = spawn.y - p.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < minDistSq) {
          minDistSq = dSq;
        }
      }

      if (minDistSq > maxMinDistSq) {
        maxMinDistSq = minDistSq;
        bestSpawn = spawn;
      }
    }

    return { ...bestSpawn };
  }
}
