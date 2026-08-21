# NEXUS ⚡
> **ENTER THE ARENA.**  
> *A fast-paced, real-time 2D cyberpunk multiplayer arena game.*  
> **Built by Mr.Mallu_gg**

---

## 🎮 Overview

**NEXUS** is an authoritative, browser-based top-down 2D multiplayer arena combat game. Up to 8 players enter an arena, join or create rooms via unique 5-character room codes, and engage in tactical sci-fi combat. The last surviving player is crowned the **Arena Champion**.

---

## ✨ Features

- **Real-Time Multiplayer**: Built with **Socket.IO** and an authoritative Node.js server loop (60 Hz physics, 30 Hz snapshot broadcast).
- **Client-Server Authoritative Physics**: All movement validation, wall collisions, projectile simulation, damage calculations, and win conditions are calculated strictly on the server to prevent cheating or desync.
- **Phaser 3 2D Engine**: High-performance WebGL/Canvas rendering with dynamic neon graphics, custom ship hulls, particle thrusters, muzzle flashes, and screen shake.
- **Dynamic Cyberpunk Arena**: Custom 2000x2000 arena featuring boundary forcefields, central reactor core, corner defense bastions, and tactical cover barriers.
- **Custom Room & Lobby System**: Create private rooms with 5-character codes (e.g. `N7K4P`), 1-click clipboard code sharing, player readiness tracking, and host migration.
- **Zero-Dependency Procedural Audio**: Procedurally synthesized sound effects (lasers, hits, explosions, countdown chimes, victory fanfare, UI clicks) powered by the browser's native **Web Audio API**—no missing audio files or 404s.
- **Cyberpunk UI & HUD**: Real-time health bars with critical HP alerts, alive player counters (`ALIVE: X/8`), kill feed notifications, live scoreboard overlay ([TAB]), and winner celebrations.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3 (Cyberpunk Glassmorphic), Vanilla ES6+ JavaScript, Phaser 3 |
| **Backend** | Node.js, Express, Socket.IO |
| **Audio** | Native Web Audio API Synthesizer |
| **Physics / Network** | Server-Authoritative 60 Hz tick simulation & client-side interpolation |

---

## 📁 Project Structure

```
NEXUS/
├── package.json               # Dependencies & scripts
├── README.md                  # Documentation & testing guide
├── server/
│   ├── server.js              # Express app, static server & Socket.IO events
│   ├── config/
│   │   └── constants.js       # Game constants, tick rates, speeds, stats
│   ├── game/
│   │   ├── Arena.js           # Authoritative arena geometry & spawn points
│   │   ├── Collision.js       # Circle-to-AABB and Circle-to-Circle collision
│   │   ├── Player.js          # Player state model & movement validation
│   │   ├── Projectile.js      # Projectile model & lifetime simulation
│   │   └── Game.js            # Match lifecycle, tick loop & state snapshotting
│   ├── rooms/
│   │   ├── Room.js            # Room state, roster, ready checks, host controls
│   │   └── RoomManager.js     # Room code generation & global room tick coordinator
│   └── systems/
│       └── CombatSystem.js    # Firing rate-limits, hit detection, damage & win checks
├── client/
│   ├── index.html             # UI screens: Landing, Name, Lobby, Game HUD, Game Over
│   ├── styles.css             # Cyberpunk styling, neon glows & responsive design
│   └── src/
│       ├── main.js            # App orchestrator & socket event bindings
│       ├── config.js          # Client constants & color palette
│       ├── audio/
│       │   └── SoundManager.js # Web Audio API procedural sound synthesizer
│       ├── network/
│       │   └── NetworkManager.js # Client Socket.IO communication
│       ├── ui/
│       │   └── UIManager.js   # DOM UI screens, HUD, scoreboard, countdown
│       ├── entities/
│       │   ├── PlayerEntity.js # Phaser ship sprite, nametag, mini HP & thruster
│       │   └── ProjectileEntity.js # Glowing laser projectile & particle spark trail
│       ├── game/
│       │   ├── NexusGame.js   # Phaser Game instance setup
│       │   └── scenes/
│       │       └── ArenaScene.js # 2D arena rendering, camera follow, crosshair & VFX
│       └── utils/
│           └── MathUtils.js   # Coordinates and angle lerp utilities
└── test/
    └── multiplayer_test.js    # Automated integration test script
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18.0.0 or later)
- **npm** (v9.0.0 or later)

### Installation

1. Clone or open the repository:
   ```bash
   cd Nexus
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the NEXUS server:
   ```bash
   npm start
   ```
   Or:
   ```bash
   node server/server.js
   ```

4. Open your browser at:
   ```
   http://localhost:3000
   ```

---

## 👥 How to Test Multiplayer (2 Players)

### Step 1: Open Player 1 (Host)
1. Open a browser window at `http://localhost:3000`.
2. Click **PLAY NOW**.
3. Enter callsign: `MrMallu_Host`.
4. Click **CREATE ROOM**.
5. Note the 5-character Room Code displayed on screen (e.g. `N7K4P`) or click to copy it.

### Step 2: Open Player 2
1. Open a second browser window (or incognito window / another device on same network) at `http://localhost:3000`.
2. Click **PLAY NOW**.
3. Enter callsign: `CyberHunter`.
4. Click **JOIN ROOM**, type the 5-character Room Code, and click **CONNECT TO ROOM**.

### Step 3: Start the Match
1. In Window 2 (Player 2), click **READY**.
2. In Window 1 (Host), click **START MATCH**.
3. Observe the synchronized `3... 2... 1... GO!` countdown and audio beeps on both screens.
4. Move with **W, A, S, D**, aim with the **Mouse**, and shoot with **Left Click**.
5. When Player 2's HP drops to 0, watch the death explosion, kill feed announcement, and instantaneous **MATCH OVER** screen declaring Player 1 the champion with the final scoreboard.
6. Click **PLAY AGAIN** to return both players to the lobby for a rematch.

---

## 🎯 Game Controls

| Key / Action | Function |
|---|---|
| <kbd>W</kbd> | Move Up / Forward |
| <kbd>A</kbd> | Move Left |
| <kbd>S</kbd> | Move Down / Backward |
| <kbd>D</kbd> | Move Right |
| **Mouse Cursor** | Aim Cannons |
| **Left Mouse Button** | Fire Plasma Bolt |
| <kbd>TAB</kbd> *(Hold)* | Toggle Live Scoreboard |

---

## 🛡️ Architecture & Security

- **Server-Authoritative**: The client cannot dictate position teleportation, damage values, or player health. The server checks speed limits, verifies collision against arena walls, and performs ray/circle intersection tests.
- **Input Sanitization**: Usernames are sanitized against XSS/HTML injection and restricted to 2–16 characters.
- **Fire-Rate Throttling**: The server enforces a firing cooldown (`WEAPON_CONFIG.FIRE_RATE = 180ms`) preventing rapid-fire injection scripts.

---

## 🌐 Production Deployment

NEXUS is container-ready and can be deployed to any cloud provider:
- **Render / Railway / Fly.io / Heroku**: Deploy directly using the `npm start` command.
- **Docker**:
  ```dockerfile
  FROM node:20-alpine
  WORKDIR /app
  COPY package*.json ./
  RUN npm install --production
  COPY . .
  EXPOSE 3000
  CMD ["node", "server/server.js"]
  ```

---

## 👨‍💻 Developer Credit

Developed by **Mr.Mallu_gg**  
*NEXUS — Enter the Arena.*
