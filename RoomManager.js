import { SERVER_CONFIG } from '../config/constants.js';
import { Room } from './Room.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomCode -> Room
    this.playerRoomMap = new Map(); // socketId -> roomCode

    this.lastTickTime = performance.now();
    this.lastSnapshotTime = performance.now();

    this.startServerLoops();
  }

  generateRoomCode() {
    let code = '';
    let attempts = 0;
    do {
      code = '';
      for (let i = 0; i < 5; i++) {
        const idx = Math.floor(Math.random() * CODE_CHARS.length);
        code += CODE_CHARS[idx];
      }
      attempts++;
    } while (this.rooms.has(code) && attempts < 100);

    return code;
  }

  createRoom(socket, playerName) {
    // Leave any existing room
    this.leaveRoom(socket);

    const roomCode = this.generateRoomCode();
    const room = new Room(roomCode, this.io);
    this.rooms.set(roomCode, room);

    socket.join(roomCode);
    this.playerRoomMap.set(socket.id, roomCode);

    const result = room.addPlayer(socket.id, playerName);
    return { ...result, roomCode };
  }

  joinRoom(socket, roomCode, playerName) {
    if (!roomCode || typeof roomCode !== 'string') {
      return { success: false, error: 'Invalid room code.' };
    }

    const code = roomCode.trim().toUpperCase();
    const room = this.rooms.get(code);

    if (!room) {
      return { success: false, error: `Room ${code} not found.` };
    }

    // Leave any existing room
    this.leaveRoom(socket);

    socket.join(code);
    this.playerRoomMap.set(socket.id, code);

    const result = room.addPlayer(socket.id, playerName);
    if (!result.success) {
      socket.leave(code);
      this.playerRoomMap.delete(socket.id);
    }

    return result;
  }

  leaveRoom(socket) {
    const roomCode = this.playerRoomMap.get(socket.id);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (room) {
      room.removePlayer(socket.id);
      socket.leave(roomCode);

      if (room.isEmpty) {
        this.rooms.delete(roomCode);
      }
    }

    this.playerRoomMap.delete(socket.id);
  }

  getRoomForSocket(socketId) {
    const roomCode = this.playerRoomMap.get(socketId);
    if (!roomCode) return null;
    return this.rooms.get(roomCode) || null;
  }

  startServerLoops() {
    const tickIntervalMs = 1000 / SERVER_CONFIG.TICK_RATE;
    const snapshotIntervalMs = 1000 / SERVER_CONFIG.SNAPSHOT_RATE;

    // 60 Hz Simulation Loop
    setInterval(() => {
      const now = performance.now();
      const dt = (now - this.lastTickTime) / 1000;
      this.lastTickTime = now;

      // Cap delta time to prevent spiral of death on lag spikes
      const clampedDt = Math.min(dt, 0.1);

      for (const room of this.rooms.values()) {
        room.update(clampedDt);
      }
    }, tickIntervalMs);

    // 30 Hz Snapshot Broadcast Loop
    setInterval(() => {
      for (const room of this.rooms.values()) {
        room.broadcastSnapshot();
      }
    }, snapshotIntervalMs);
  }
}
