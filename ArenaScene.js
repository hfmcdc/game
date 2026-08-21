import { CLIENT_CONFIG, COLORS } from '../../config.js';
import { PlayerEntity } from '../../entities/PlayerEntity.js';
import { ProjectileEntity } from '../../entities/ProjectileEntity.js';
import { TouchControls } from '../../controls/TouchControls.js';
import { DeviceUtils } from '../../utils/DeviceUtils.js';

export class ArenaScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ArenaScene' });

    this.network = null;
    this.audio = null;
    this.ui = null;

    this.arenaData = null;
    this.pendingArenaData = null;
    this.isSceneReady = false;

    this.players = new Map(); // id -> PlayerEntity
    this.projectiles = new Map(); // id -> ProjectileEntity

    this.localPlayerId = null;
    this.localPlayer = null;

    this.keys = null;
    this.crosshair = null;
    this.bgGfx = null;
    this.wallGfx = null;

    this.isMobile = DeviceUtils.isMobile();
    this.touchControls = null;
    this.lastHudUpdateAt = 0;
  }

  init(data) {
    if (data) {
      if (data.network) this.network = data.network;
      if (data.audio) this.audio = data.audio;
      if (data.ui) this.ui = data.ui;
      if (this.network) this.localPlayerId = this.network.playerId;
    }
  }

  create() {
    console.log('[NEXUS] ArenaScene create() booted');

    // 1. Generate programmatic particle texture if missing
    if (!this.textures.exists('particle_dot')) {
      const gfx = this.make.graphics({ x: 0, y: 0, add: false });
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(8, 8, 8);
      gfx.generateTexture('particle_dot', 16, 16);
      gfx.destroy();
    }

    // 2. Camera Setup
    this.cameras.main.setBackgroundColor('#050811');
    this.cameras.main.setBounds(0, 0, CLIENT_CONFIG.ARENA_WIDTH, CLIENT_CONFIG.ARENA_HEIGHT);

    // 3. Graphics Containers for Arena
    this.bgGfx = this.add.graphics();
    this.bgGfx.setDepth(1);
    this.wallGfx = this.add.graphics();
    this.wallGfx.setDepth(4);

    // 4. Setup Input Keys
    this.keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    });

    // 5. Setup Crosshair (desktop mouse-aim only)
    this.createCrosshair();

    if (this.isMobile) {
      // Mobile: hide the mouse-following crosshair (ship rotation shows
      // facing instead) and drive firing entirely from the aim stick.
      this.crosshair.setVisible(false);
      this.touchControls = new TouchControls(this);
    } else {
      // 6. Setup Mouse Click Shooting (desktop only)
      this.input.on('pointerdown', (pointer) => {
        if (pointer.leftButtonDown() && this.network) {
          this.network.sendShoot();
        }
      });
    }

    // 7. Wire up Network Events
    if (this.network) {
      this.setupNetworkEvents();
    }

    this.isSceneReady = true;

    // 8. Build pending arena if available
    if (this.pendingArenaData) {
      this.buildArena(this.pendingArenaData);
      this.pendingArenaData = null;
    }
  }

  startMatch(arenaData, network, audio, ui) {
    if (network) this.network = network;
    if (audio) this.audio = audio;
    if (ui) this.ui = ui;
    if (this.network) this.localPlayerId = this.network.playerId;

    this.resetArena();

    if (this.isSceneReady && this.add) {
      this.buildArena(arenaData);
    } else {
      this.pendingArenaData = arenaData;
    }
  }

  createCrosshair() {
    const gfx = this.add.graphics();
    gfx.setDepth(100);

    gfx.lineStyle(1.5, COLORS.CYAN, 0.8);
    gfx.strokeCircle(0, 0, 10);
    gfx.lineBetween(-16, 0, -10, 0);
    gfx.lineBetween(10, 0, 16, 0);
    gfx.lineBetween(0, -16, 0, -10);
    gfx.lineBetween(0, 10, 0, 16);

    this.crosshair = gfx;
  }

  buildArena(arenaData) {
    if (!arenaData || !this.bgGfx || !this.wallGfx) return;

    this.arenaData = arenaData;
    const W = arenaData.width || CLIENT_CONFIG.ARENA_WIDTH;
    const H = arenaData.height || CLIENT_CONFIG.ARENA_HEIGHT;

    this.bgGfx.clear();
    this.wallGfx.clear();

    // 1. Grid Background
    this.bgGfx.lineStyle(1, COLORS.GRID_LINE, 0.4);
    const gridSize = 100;
    for (let x = 0; x <= W; x += gridSize) {
      this.bgGfx.lineBetween(x, 0, x, H);
    }
    for (let y = 0; y <= H; y += gridSize) {
      this.bgGfx.lineBetween(0, y, W, y);
    }

    // 2. Arena Center Neon Circles
    this.bgGfx.lineStyle(2, COLORS.CYAN, 0.35);
    this.bgGfx.strokeCircle(W / 2, H / 2, 350);
    this.bgGfx.lineStyle(1, COLORS.MAGENTA, 0.25);
    this.bgGfx.strokeCircle(W / 2, H / 2, 500);

    // 3. Render Walls & Obstacles
    if (arenaData.obstacles) {
      for (const obs of arenaData.obstacles) {
        const isCore = obs.type === 'core';
        const strokeColor = isCore ? COLORS.MAGENTA : COLORS.CYAN;
        const fillColor = isCore ? 0x1a0515 : COLORS.WALL_FILL;

        // Obstacle Fill
        this.wallGfx.fillStyle(fillColor, 0.95);
        this.wallGfx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // Obstacle Neon Glow Stroke
        this.wallGfx.lineStyle(2.5, strokeColor, 1);
        this.wallGfx.strokeRect(obs.x, obs.y, obs.width, obs.height);

        // Tech Cross Details on Core
        if (isCore) {
          this.wallGfx.lineStyle(1.5, COLORS.MAGENTA, 0.6);
          this.wallGfx.lineBetween(obs.x, obs.y, obs.x + obs.width, obs.y + obs.height);
          this.wallGfx.lineBetween(obs.x + obs.width, obs.y, obs.x, obs.y + obs.height);
        }
      }
    }
  }

  setupNetworkEvents() {
    if (this._networkEventsConfigured) return;
    this._networkEventsConfigured = true;

    // Snapshot state from server
    this.network.on('game_snapshot', (snapshot) => {
      this.handleSnapshot(snapshot);
    });

    // Shot fired FX
    this.network.on('shot_fired', (data) => {
      this.handleShotFired(data);
    });

    // Player hit FX
    this.network.on('player_hit', (data) => {
      this.handlePlayerHit(data);
    });

    // Player died FX
    this.network.on('player_died', (data) => {
      this.handlePlayerDied(data);
    });

    // Player respawned FX
    this.network.on('player_respawned', (data) => {
      this.handlePlayerRespawned(data);
    });

    // Projectile hit wall FX
    this.network.on('projectile_hit_wall', (data) => {
      this.handleWallHit(data);
    });
  }

  handleSnapshot(snapshot) {
    if (!this.isSceneReady || !snapshot || !snapshot.players) return;

    if (!this.localPlayerId && this.network) {
      this.localPlayerId = this.network.playerId;
    }

    const seenPlayerIds = new Set();

    // Sync Players
    for (const pData of snapshot.players) {
      seenPlayerIds.add(pData.id);
      let entity = this.players.get(pData.id);

      if (!entity) {
        const isLocal = pData.id === this.localPlayerId;
        entity = new PlayerEntity(this, pData, isLocal);
        this.players.set(pData.id, entity);

        if (isLocal) {
          this.localPlayer = entity;
          this.cameras.main.startFollow(entity.container, true, 0.1, 0.1);
        }
      }

      entity.updateFromSnapshot(pData);
    }

    // Remove disconnected players
    for (const [id, entity] of this.players.entries()) {
      if (!seenPlayerIds.has(id)) {
        entity.destroy();
        this.players.delete(id);
      }
    }

    // Sync Projectiles
    const seenProjIds = new Set();
    if (snapshot.projectiles) {
      for (const projData of snapshot.projectiles) {
        seenProjIds.add(projData.id);
        let projEntity = this.projectiles.get(projData.id);

        if (!projEntity) {
          projEntity = new ProjectileEntity(this, projData);
          this.projectiles.set(projData.id, projEntity);
        } else {
          projEntity.updateFromSnapshot(projData);
        }
      }
    }

    for (const [id, entity] of this.projectiles.entries()) {
      if (!seenProjIds.has(id)) {
        entity.destroy();
        this.projectiles.delete(id);
      }
    }

    // DOM updates are much more expensive than drawing the game. Limit the HUD
    // refresh rate; snapshots still update entities immediately.
    const now = performance.now();
    if (this.localPlayer && this.ui && now - this.lastHudUpdateAt >= CLIENT_CONFIG.HUD_UPDATE_INTERVAL) {
      const localData = snapshot.players.find((p) => p.id === this.localPlayerId);
      this.ui.updateHUD(localData, snapshot.players, this.network ? this.network.roomCode : '', snapshot.targetScore || 10);
      this.lastHudUpdateAt = now;
    }
  }

  handleShotFired(data) {
    if (this.audio) this.audio.playLaser();
    if (!this.isSceneReady) return;

    // Muzzle flash particle burst
    const emitter = this.add.particles(data.x, data.y, 'particle_dot', {
      speed: { min: 80, max: 180 },
      angle: {
        min: Phaser.Math.RadToDeg(data.angle) - 30,
        max: Phaser.Math.RadToDeg(data.angle) + 30,
      },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: 0x00f0ff,
      lifespan: 100,
      quantity: 8,
    });
    emitter.setDepth(9);

    this.time.delayedCall(120, () => {
      emitter.destroy();
    });
  }

  handlePlayerHit(data) {
    if (this.audio) this.audio.playHit();
    if (!this.isSceneReady) return;

    // Floating Damage Text
    const dmgText = this.add.text(data.x, data.y - 30, `-${data.damage}`, {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '20px',
      fontStyle: '900',
      color: '#ff0055',
      stroke: '#000000',
      strokeThickness: 4,
    });
    dmgText.setOrigin(0.5, 0.5);
    dmgText.setDepth(25);

    this.tweens.add({
      targets: dmgText,
      y: data.y - 70,
      alpha: 0,
      duration: 650,
      ease: 'Power2',
      onComplete: () => {
        dmgText.destroy();
      },
    });

    // Hit Spark Burst
    const hitEmitter = this.add.particles(data.x, data.y, 'particle_dot', {
      speed: { min: 60, max: 200 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: 0xff0055,
      lifespan: 220,
      quantity: 14,
    });
    hitEmitter.setDepth(20);

    this.time.delayedCall(250, () => {
      hitEmitter.destroy();
    });
  }

  handlePlayerDied(data) {
    if (this.audio) this.audio.playExplosion();
    if (this.ui) this.ui.addKillFeedEntry(data.killerName, data.victimName);

    // If local player got the kill, show prominent celebration popup
    if (data.killerId === this.localPlayerId && this.ui) {
      this.ui.showEliminationPopup('+1 POINT');
    }

    if (!this.isSceneReady) return;

    // Large Death Shockwave & Particle Explosion
    const deathEmitter = this.add.particles(data.x, data.y, 'particle_dot', {
      speed: { min: 80, max: 320 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xff0055, 0xffe600, 0x00f0ff, 0xffffff],
      lifespan: 600,
      quantity: 45,
    });
    deathEmitter.setDepth(22);

    this.cameras.main.shake(300, 0.015);

    this.time.delayedCall(700, () => {
      deathEmitter.destroy();
    });
  }

  handlePlayerRespawned(data) {
    if (!this.isSceneReady) return;

    // Respawn Neon Ring Effect
    const respawnEmitter = this.add.particles(data.x, data.y, 'particle_dot', {
      speed: { min: 60, max: 180 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0x00f0ff, 0x00ff66, 0xffffff],
      lifespan: 350,
      quantity: 20,
    });
    respawnEmitter.setDepth(18);

    this.time.delayedCall(400, () => {
      respawnEmitter.destroy();
    });
  }

  handleWallHit(data) {
    if (!this.isSceneReady) return;

    const wallEmitter = this.add.particles(data.x, data.y, 'particle_dot', {
      speed: { min: 40, max: 120 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: COLORS.CYAN,
      lifespan: 140,
      quantity: 6,
    });
    wallEmitter.setDepth(9);

    this.time.delayedCall(160, () => {
      wallEmitter.destroy();
    });
  }

  update(time, delta) {
    if (!this.isSceneReady) return;
    const dt = delta / 1000;

    let worldPoint = null;
    if (!this.isMobile) {
      // Update crosshair position in world space (desktop mouse-aim only)
      const pointer = this.input.activePointer;
      worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      if (this.crosshair) {
        this.crosshair.setPosition(worldPoint.x, worldPoint.y);
      }
    }

    // Collect and send inputs
    if (this.localPlayer && this.localPlayer.isAlive && this.network) {
      let up, left, down, right, angle;

      if (this.isMobile && this.touchControls) {
        const move = this.touchControls.getMovementInput();
        up = move.up;
        left = move.left;
        down = move.down;
        right = move.right;
        angle = this.touchControls.getAimAngle(this.localPlayer.angle);
      } else {
        up = this.keys.w.isDown || this.keys.up.isDown;
        left = this.keys.a.isDown || this.keys.left.isDown;
        down = this.keys.s.isDown || this.keys.down.isDown;
        right = this.keys.d.isDown || this.keys.right.isDown;

        angle = Phaser.Math.Angle.Between(this.localPlayer.x, this.localPlayer.y, worldPoint.x, worldPoint.y);
      }

      this.network.sendInput({
        up,
        left,
        down,
        right,
        angle,
      });
    }

    // Update all player entities for smooth interpolation
    for (const entity of this.players.values()) {
      entity.update(dt);
    }
  }

  resetArena() {
    if (this.touchControls) {
      this.touchControls.hasAimed = false;
    }

    for (const p of this.players.values()) {
      p.destroy();
    }
    this.players.clear();

    for (const pr of this.projectiles.values()) {
      pr.destroy();
    }
    this.projectiles.clear();

    this.localPlayer = null;
  }
}
