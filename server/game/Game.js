import { GAME_STATES, MATCH_CONFIG, PLAYER_CONFIG } from '../config/constants.js';
import { Arena } from './Arena.js';
import { CombatSystem } from '../systems/CombatSystem.js';

export class Game {
  constructor(room) {
    this.room = room;
    this.arena = new Arena();
    this.combatSystem = new CombatSystem(this);

    this.players = new Map(); // id -> Player
    this.projectiles = []; // Active Projectiles

    this.targetScore = MATCH_CONFIG.TARGET_SCORE || 30;
    this.state = GAME_STATES.LOBBY;
    this.countdownTimer = 0;
    this.winner = null;

    this.lastTickTime = performance.now();
  }

  addPlayer(player) {
    this.players.set(player.id, player);
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  startCountdown() {
    this.state = GAME_STATES.COUNTDOWN;
    this.countdownTimer = MATCH_CONFIG.COUNTDOWN_DURATION;
    this.projectiles = [];
    this.winner = null;

    // Distribute spawn points & reset player stats
    let index = 0;
    for (const player of this.players.values()) {
      player.resetMatchStats();
      const spawn = this.arena.getSpawnPoint(index++);
      player.spawn(spawn.x, spawn.y, spawn.angle);
    }
  }

  startPlaying() {
    this.state = GAME_STATES.PLAYING;
  }

  endMatch(winner) {
    this.state = GAME_STATES.GAME_OVER;
    this.winner = winner ? winner.serialize() : null;

    this.room.onMatchEnded(this.winner);
  }

  resetToLobby() {
    this.state = GAME_STATES.LOBBY;
    this.projectiles = [];
    this.winner = null;

    for (const player of this.players.values()) {
      player.isReady = false;
      player.resetMatchStats();
    }
  }

  update(dt) {
    const events = [];

    if (this.state === GAME_STATES.COUNTDOWN) {
      const prevInt = Math.ceil(this.countdownTimer);
      this.countdownTimer -= dt;
      const nextInt = Math.ceil(this.countdownTimer);

      if (nextInt !== prevInt && nextInt >= 0) {
        events.push({
          type: 'countdown_tick',
          count: nextInt, // 3, 2, 1, 0 (0 = GO!)
        });
      }

      if (this.countdownTimer <= 0) {
        this.startPlaying();
        events.push({
          type: 'match_started',
        });
      }
    } else if (this.state === GAME_STATES.PLAYING) {
      const livingPlayers = Array.from(this.players.values()).filter((p) => p.isAlive);

      // 1. Update players and check respawns
      for (const player of this.players.values()) {
        player.update(dt, this.arena);

        // Auto-respawn logic after death delay (2s)
        if (!player.isAlive && player.respawnTimer <= 0) {
          const spawn = this.arena.getSafeSpawnPoint(livingPlayers);
          player.spawn(spawn.x, spawn.y, spawn.angle);

          events.push({
            type: 'player_respawned',
            playerId: player.id,
            playerName: player.name,
            x: spawn.x,
            y: spawn.y,
            angle: spawn.angle,
            player: player.serialize(),
          });
        }
      }

      // 2. Update combat (projectiles + collisions + hits + kills)
      const combatEvents = this.combatSystem.update(dt);
      if (combatEvents.length > 0) {
        events.push(...combatEvents);
      }
    }

    return events;
  }

  getSnapshot() {
    const playersList = [];
    for (const p of this.players.values()) {
      playersList.push(p.serialize());
    }

    const projectilesList = this.projectiles.map((proj) => proj.serialize());

    return {
      state: this.state,
      targetScore: this.targetScore,
      countdown: Math.max(0, Math.ceil(this.countdownTimer)),
      players: playersList,
      projectiles: projectilesList,
      winner: this.winner,
    };
  }
}
