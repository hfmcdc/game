import { GAME_STATES, MATCH_CONFIG } from '../config/constants.js';
import { Game } from '../game/Game.js';
import { Player } from '../game/Player.js';

export class Room {
  constructor(code, io) {
    this.code = code;
    this.io = io;
    this.hostId = null;
    this.players = new Map(); // socketId -> Player
    this.game = new Game(this);

    this.colorCounter = 0;
    this.createdAt = Date.now();
  }

  get isFull() {
    return this.players.size >= MATCH_CONFIG.MAX_PLAYERS_PER_ROOM;
  }

  get isEmpty() {
    return this.players.size === 0;
  }

  addPlayer(socketId, rawName) {
    if (this.isFull) {
      return { success: false, error: 'Room is full (Maximum 8 players).' };
    }

    if (this.game.state === GAME_STATES.PLAYING || this.game.state === GAME_STATES.COUNTDOWN) {
      return { success: false, error: 'Match already in progress in this room.' };
    }

    const isHost = this.players.size === 0;
    if (isHost) {
      this.hostId = socketId;
    }

    const player = new Player(socketId, rawName, this.colorCounter++);
    player.isHost = isHost;

    this.players.set(socketId, player);
    this.game.addPlayer(player);

    this.broadcastRoomUpdate();

    return {
      success: true,
      player: player.serialize(),
      roomCode: this.code,
      isHost,
    };
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (!player) return;

    this.players.delete(socketId);
    this.game.removePlayer(socketId);

    // Host migration
    if (this.hostId === socketId && this.players.size > 0) {
      const newHost = this.players.values().next().value;
      this.hostId = newHost.id;
      newHost.isHost = true;
    }

    this.broadcastRoomUpdate();

    this.io.to(this.code).emit('player_left', {
      playerId: socketId,
      playerName: player.name,
    });
  }

  setReady(socketId, isReady) {
    const player = this.players.get(socketId);
    if (player && this.game.state === GAME_STATES.LOBBY) {
      player.isReady = !!isReady;
      this.broadcastRoomUpdate();
    }
  }

  startMatch(socketId) {
    console.log(`[NEXUS SERVER] Start request received from socket: ${socketId}`);
    console.log(`[NEXUS SERVER] Room: ${this.code}`);
    console.log(`[NEXUS SERVER] Players: ${this.players.size} (${Array.from(this.players.values()).map(p => `${p.name} [ready:${p.isReady}]`).join(', ')})`);
    const allReady = Array.from(this.players.values()).every(p => p.isHost || p.isReady);
    console.log(`[NEXUS SERVER] All players ready: ${allReady}`);
    console.log(`[NEXUS SERVER] Current match state: ${this.game.state}`);

    if (this.hostId !== socketId) {
      console.log('[NEXUS SERVER] Start match rejected: requester is not host');
      return { success: false, error: 'Only the host can start the match.' };
    }

    if (this.players.size < MATCH_CONFIG.MIN_PLAYERS_TO_START) {
      console.log(`[NEXUS SERVER] Start match rejected: only ${this.players.size} players (min ${MATCH_CONFIG.MIN_PLAYERS_TO_START})`);
      return {
        success: false,
        error: `At least ${MATCH_CONFIG.MIN_PLAYERS_TO_START} players are required to start a match.`,
      };
    }

    if (this.game.state !== GAME_STATES.LOBBY && this.game.state !== GAME_STATES.GAME_OVER) {
      console.log(`[NEXUS SERVER] Start match rejected: match already running in state ${this.game.state}`);
      return { success: false, error: 'Match already running.' };
    }

    console.log(`[NEXUS SERVER] Broadcasting match start (match_countdown_started) to room ${this.code}`);
    this.game.startCountdown();
    this.io.to(this.code).emit('match_countdown_started', {
      duration: MATCH_CONFIG.COUNTDOWN_DURATION,
      arena: {
        width: this.game.arena.width,
        height: this.game.arena.height,
        obstacles: this.game.arena.obstacles,
      },
    });

    return { success: true };
  }

  startPlayAgain(socketId) {
    if (this.game.state !== GAME_STATES.GAME_OVER && this.game.state !== GAME_STATES.LOBBY) {
      return { success: false, error: 'Cannot restart while game is active.' };
    }

    console.log(`[NEXUS SERVER] Play Again / Direct Rematch launched for room ${this.code}`);
    this.game.startCountdown();
    this.io.to(this.code).emit('match_countdown_started', {
      duration: MATCH_CONFIG.COUNTDOWN_DURATION,
      arena: {
        width: this.game.arena.width,
        height: this.game.arena.height,
        obstacles: this.game.arena.obstacles,
      },
    });

    return { success: true };
  }

  returnToLobby(socketId) {
    this.game.resetToLobby();
    this.broadcastRoomUpdate();
    this.io.to(this.code).emit('returned_to_lobby');
    return { success: true };
  }

  requestRematch(socketId) {
    return this.startPlayAgain(socketId);
  }

  handlePlayerInput(socketId, inputData) {
    const player = this.players.get(socketId);
    if (player) {
      player.setInput(inputData);
    }
  }

  handlePlayerShoot(socketId) {
    const player = this.players.get(socketId);
    if (player) {
      const shotEvent = this.game.combatSystem.tryShoot(player);
      if (shotEvent) {
        this.io.to(this.code).emit('shot_fired', shotEvent);
      }
    }
  }

  onMatchEnded(winner) {
    this.io.to(this.code).emit('match_over', {
      winner,
      targetScore: this.game.targetScore,
      scoreboard: Array.from(this.players.values()).map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        kills: p.kills,
        deaths: p.deaths,
        score: p.score,
        isAlive: p.isAlive,
      })),
    });
  }

  broadcastRoomUpdate() {
    this.io.to(this.code).emit('room_updated', {
      roomCode: this.code,
      hostId: this.hostId,
      state: this.game.state,
      players: Array.from(this.players.values()).map((p) => p.serialize()),
    });
  }

  update(dt) {
    const events = this.game.update(dt);

    // Emit instant events (e.g. countdown ticks, hits, kills, match start)
    for (const evt of events) {
      this.io.to(this.code).emit(evt.type, evt);
    }
  }

  broadcastSnapshot() {
    if (this.game.state === GAME_STATES.PLAYING || this.game.state === GAME_STATES.COUNTDOWN) {
      this.io.to(this.code).emit('game_snapshot', this.game.getSnapshot());
    }
  }
}
