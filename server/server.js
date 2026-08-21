import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { SERVER_CONFIG } from './config/constants.js';
import { RoomManager } from './rooms/RoomManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Serve client directory as static assets
const clientPath = path.join(__dirname, '..', 'client');
app.use(express.static(clientPath));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Initialize Room Manager
const roomManager = new RoomManager(io);

// Socket.IO event listeners
io.on('connection', (socket) => {
  // Create Room
  socket.on('create_room', ({ playerName }, callback) => {
    const result = roomManager.createRoom(socket, playerName);
    if (typeof callback === 'function') callback(result);
  });

  // Join Room
  socket.on('join_room', ({ roomCode, playerName }, callback) => {
    const result = roomManager.joinRoom(socket, roomCode, playerName);
    if (typeof callback === 'function') callback(result);
  });

  // Toggle Ready Status in Lobby
  socket.on('set_ready', ({ isReady }) => {
    const room = roomManager.getRoomForSocket(socket.id);
    if (room) {
      room.setReady(socket.id, isReady);
    }
  });

  // Host starts the match
  socket.on('start_match', (callback) => {
    const room = roomManager.getRoomForSocket(socket.id);
    if (!room) {
      if (typeof callback === 'function') callback({ success: false, error: 'Not in a room.' });
      return;
    }
    const result = room.startMatch(socket.id);
    if (typeof callback === 'function') callback(result);
  });

  // Player sends continuous movement & aim inputs (60 Hz)
  socket.on('player_input', (inputData) => {
    const room = roomManager.getRoomForSocket(socket.id);
    if (room) {
      room.handlePlayerInput(socket.id, inputData);
    }
  });

  // Player triggers weapon shot
  socket.on('player_shoot', () => {
    const room = roomManager.getRoomForSocket(socket.id);
    if (room) {
      room.handlePlayerShoot(socket.id);
    }
  });

  // Request Play Again (Fresh match countdown directly in arena)
  socket.on('play_again', (callback) => {
    const room = roomManager.getRoomForSocket(socket.id);
    if (room) {
      const result = room.startPlayAgain(socket.id);
      if (typeof callback === 'function') callback(result);
    }
  });

  // Return to Lobby
  socket.on('return_to_lobby', (callback) => {
    const room = roomManager.getRoomForSocket(socket.id);
    if (room) {
      const result = room.returnToLobby(socket.id);
      if (typeof callback === 'function') callback(result);
    }
  });

  // Legacy rematch alias
  socket.on('request_rematch', (callback) => {
    const room = roomManager.getRoomForSocket(socket.id);
    if (room) {
      const result = room.startPlayAgain(socket.id);
      if (typeof callback === 'function') callback(result);
    }
  });

  // Explicit Leave Room
  socket.on('leave_room', () => {
    roomManager.leaveRoom(socket);
  });

  // Disconnect
  socket.on('disconnect', () => {
    roomManager.leaveRoom(socket);
  });
});

const PORT = SERVER_CONFIG.PORT;
server.listen(PORT, () => {
  console.log('====================================================');
  console.log('                 NEXUS - ARENA SERVER               ');
  console.log('             ENTER THE ARENA | Mr.Mallu_gg          ');
  console.log('====================================================');
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Real-time physics tick rate: ${SERVER_CONFIG.TICK_RATE} Hz`);
  console.log(`State snapshot broadcast rate: ${SERVER_CONFIG.SNAPSHOT_RATE} Hz`);
  console.log('====================================================');
});
