export class NetworkManager {
  constructor() {
    this.socket = null;
    this.playerId = null;
    this.roomCode = null;
    this.isHost = false;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket) return;

    // Use global io from socket.io.js
    this.socket = window.io();

    this.socket.on('connect', () => {
      this.playerId = this.socket.id;
      console.log(`[NEXUS NET] Connected to server. Socket ID: ${this.playerId}`);
      this.emit('connected', { id: this.playerId });
    });

    this.socket.on('disconnect', () => {
      console.log('[NEXUS NET] Disconnected from server');
      this.emit('disconnected');
    });

    // Forward server events to local event listeners
    const forwardEvents = [
      'room_updated',
      'player_left',
      'match_countdown_started',
      'countdown_tick',
      'match_started',
      'game_snapshot',
      'shot_fired',
      'player_hit',
      'player_died',
      'player_respawned',
      'projectile_hit_wall',
      'match_over',
      'returned_to_lobby',
    ];

    for (const evtName of forwardEvents) {
      this.socket.on(evtName, (data) => {
        this.emit(evtName, data);
      });
    }
  }

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);
  }

  emit(eventName, data) {
    const list = this.listeners.get(eventName);
    if (list) {
      for (const cb of list) {
        cb(data);
      }
    }
  }

  createRoom(playerName) {
    return new Promise((resolve) => {
      this.socket.emit('create_room', { playerName }, (response) => {
        if (response && response.success) {
          this.roomCode = response.roomCode;
          this.isHost = response.isHost;
        }
        resolve(response);
      });
    });
  }

  joinRoom(roomCode, playerName) {
    return new Promise((resolve) => {
      this.socket.emit('join_room', { roomCode, playerName }, (response) => {
        if (response && response.success) {
          this.roomCode = response.roomCode;
          this.isHost = response.player.isHost;
        }
        resolve(response);
      });
    });
  }

  setReady(isReady) {
    if (this.socket) {
      this.socket.emit('set_ready', { isReady });
    }
  }

  startMatch() {
    return new Promise((resolve) => {
      this.socket.emit('start_match', (response) => {
        resolve(response);
      });
    });
  }

  sendInput(inputData) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('player_input', inputData);
    }
  }

  sendShoot() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('player_shoot');
    }
  }

  playAgain() {
    return new Promise((resolve) => {
      this.socket.emit('play_again', (response) => {
        resolve(response);
      });
    });
  }

  returnToLobby() {
    return new Promise((resolve) => {
      this.socket.emit('return_to_lobby', (response) => {
        resolve(response);
      });
    });
  }

  requestRematch() {
    return this.playAgain();
  }

  leaveRoom() {
    if (this.socket) {
      this.socket.emit('leave_room');
      this.roomCode = null;
      this.isHost = false;
    }
  }
}
