export class UIManager {
  constructor(network, audio) {
    this.network = network;
    this.audio = audio;

    this.currentScreen = 'landing';
    this.isReady = false;
    this.localPlayerName = '';

    // Cache DOM Elements
    this.screens = {
      landing: document.getElementById('screen-landing'),
      name: document.getElementById('screen-name'),
      lobby: document.getElementById('screen-lobby'),
      game: document.getElementById('screen-game'),
      gameover: document.getElementById('screen-gameover'),
    };

    this.inputs = {
      playerName: document.getElementById('input-player-name'),
      roomCode: document.getElementById('input-room-code'),
    };

    this.buttons = {
      playNow: document.getElementById('btn-play-now'),
      createRoom: document.getElementById('btn-create-room'),
      showJoin: document.getElementById('btn-show-join'),
      joinSubmit: document.getElementById('btn-join-room-submit'),
      joinCancel: document.getElementById('btn-join-room-cancel'),
      backToLanding: document.getElementById('btn-back-to-landing'),
      lobbyReady: document.getElementById('btn-lobby-ready'),
      lobbyStart: document.getElementById('btn-lobby-start'),
      lobbyLeave: document.getElementById('btn-lobby-leave'),
      playAgain: document.getElementById('btn-play-again'),
      returnLobby: document.getElementById('btn-return-lobby'),
      gameOverMenu: document.getElementById('btn-gameover-menu'),
      audioToggle: document.getElementById('btn-audio-toggle'),
    };

    this.lobby = {
      roomBadge: document.getElementById('lobby-room-badge'),
      roomCode: document.getElementById('lobby-room-code'),
      playerCount: document.getElementById('lobby-player-count'),
      playerList: document.getElementById('lobby-player-list'),
      statusHint: document.getElementById('lobby-status-hint'),
      errorMsg: document.getElementById('lobby-error-msg'),
      nameErrorMsg: document.getElementById('name-error-msg'),
      joinContainer: document.getElementById('join-room-container'),
    };

    this.hud = {
      roomCode: document.getElementById('hud-room-code'),
      targetGoal: document.getElementById('hud-target-goal'),
      score: document.getElementById('hud-score'),
      targetScore: document.getElementById('hud-target-score'),
      liveLeaderboard: document.getElementById('hud-live-leaderboard'),
      playerName: document.getElementById('hud-player-name'),
      healthFill: document.getElementById('hud-health-fill'),
      healthText: document.getElementById('hud-health-text'),
      killFeed: document.getElementById('kill-feed'),
      eliminationPopup: document.getElementById('elimination-popup'),
      respawnBanner: document.getElementById('respawn-banner'),
      respawnTimerText: document.getElementById('respawn-timer-text'),
      countdownOverlay: document.getElementById('countdown-overlay'),
      countdownText: document.getElementById('countdown-text'),
      scoreboardModal: document.getElementById('scoreboard-modal'),
      scoreboardBody: document.getElementById('scoreboard-table-body'),
    };

    this.gameOver = {
      winnerName: document.getElementById('gameover-winner-name'),
      winnerScore: document.getElementById('gameover-winner-score'),
      tableBody: document.getElementById('gameover-table-body'),
    };

    this.setupEventListeners();
  }

  showScreen(screenName) {
    this.currentScreen = screenName;
    for (const [key, el] of Object.entries(this.screens)) {
      if (key === screenName) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }
  }

  setupEventListeners() {
    // Audio Toggle
    this.buttons.audioToggle.addEventListener('click', () => {
      const muted = this.audio.toggleMute();
      this.buttons.audioToggle.textContent = muted ? '🔇' : '🔊';
    });

    // Landing -> Name Entry
    this.buttons.playNow.addEventListener('click', () => {
      this.audio.playClick();
      this.audio.init();
      this.showScreen('name');
      this.inputs.playerName.focus();
    });

    this.buttons.backToLanding.addEventListener('click', () => {
      this.audio.playClick();
      this.showScreen('landing');
    });

    // Join Section Toggle
    this.buttons.showJoin.addEventListener('click', () => {
      this.audio.playClick();
      this.lobby.joinContainer.style.display = 'block';
      this.inputs.roomCode.focus();
    });

    this.buttons.joinCancel.addEventListener('click', () => {
      this.audio.playClick();
      this.lobby.joinContainer.style.display = 'none';
      this.lobby.nameErrorMsg.textContent = '';
    });

    // Create Room
    this.buttons.createRoom.addEventListener('click', async () => {
      this.audio.playClick();
      const name = this.inputs.playerName.value.trim();
      if (!this.validateName(name)) return;

      this.localPlayerName = name;
      this.lobby.nameErrorMsg.textContent = 'Creating room...';

      const res = await this.network.createRoom(name);
      if (res.success) {
        this.lobby.nameErrorMsg.textContent = '';
        this.showLobby(res);
      } else {
        this.lobby.nameErrorMsg.textContent = res.error || 'Failed to create room.';
      }
    });

    // Join Room Submit
    this.buttons.joinSubmit.addEventListener('click', async () => {
      this.audio.playClick();
      const name = this.inputs.playerName.value.trim();
      if (!this.validateName(name)) return;

      const code = this.inputs.roomCode.value.trim().toUpperCase();
      if (code.length !== 5) {
        this.lobby.nameErrorMsg.textContent = 'Room code must be 5 characters.';
        return;
      }

      this.localPlayerName = name;
      this.lobby.nameErrorMsg.textContent = 'Connecting to room...';

      const res = await this.network.joinRoom(code, name);
      if (res.success) {
        this.lobby.nameErrorMsg.textContent = '';
        this.showLobby(res);
      } else {
        this.lobby.nameErrorMsg.textContent = res.error || 'Could not join room.';
      }
    });

    // Copy Room Code
    this.lobby.roomBadge.addEventListener('click', () => {
      const code = this.lobby.roomCode.textContent;
      if (code && code !== '------') {
        navigator.clipboard.writeText(code).then(() => {
          const hint = this.lobby.roomBadge.querySelector('.copy-hint');
          if (hint) {
            hint.textContent = '✓ COPIED!';
            setTimeout(() => {
              hint.textContent = '(CLICK TO COPY)';
            }, 2000);
          }
        });
      }
    });

    // Ready Button Toggle
    this.buttons.lobbyReady.addEventListener('click', () => {
      this.audio.playClick();
      this.isReady = !this.isReady;
      this.buttons.lobbyReady.textContent = this.isReady ? 'UNREADY' : 'READY';
      this.buttons.lobbyReady.className = this.isReady ? 'cyber-btn btn-magenta' : 'cyber-btn btn-green';
      this.network.setReady(this.isReady);
    });

    // Host Start Match
    this.buttons.lobbyStart.addEventListener('click', async () => {
      console.log('[NEXUS] Start match clicked');
      this.audio.playClick();
      this.lobby.errorMsg.textContent = 'Initializing match...';
      console.log('[NEXUS] Start request sent');
      const res = await this.network.startMatch();
      console.log('[NEXUS] Start match response:', res);
      if (res && !res.success) {
        this.lobby.errorMsg.textContent = res.error;
      }
    });

    // Leave Room
    this.buttons.lobbyLeave.addEventListener('click', () => {
      this.audio.playClick();
      this.network.leaveRoom();
      this.isReady = false;
      this.buttons.lobbyReady.textContent = 'READY';
      this.buttons.lobbyReady.className = 'cyber-btn btn-green';
      this.showScreen('name');
    });

    // Play Again (Direct rematch into arena)
    this.buttons.playAgain.addEventListener('click', async () => {
      this.audio.playClick();
      const res = await this.network.playAgain();
      if (res && !res.success) {
        console.warn('Play again failed:', res.error);
      }
    });

    // Return to Lobby
    if (this.buttons.returnLobby) {
      this.buttons.returnLobby.addEventListener('click', async () => {
        this.audio.playClick();
        const res = await this.network.returnToLobby();
        if (res && res.success) {
          this.showScreen('lobby');
        }
      });
    }

    // Game Over -> Main Menu
    this.buttons.gameOverMenu.addEventListener('click', () => {
      this.audio.playClick();
      this.network.leaveRoom();
      this.showScreen('landing');
    });

    // Keyboard TAB for Scoreboard in Game
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' && this.currentScreen === 'game') {
        e.preventDefault();
        this.hud.scoreboardModal.classList.add('visible');
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Tab' && this.currentScreen === 'game') {
        e.preventDefault();
        this.hud.scoreboardModal.classList.remove('visible');
      }
    });
  }

  validateName(name) {
    if (!name || name.length < 2) {
      this.lobby.nameErrorMsg.textContent = 'Username must be at least 2 characters.';
      return false;
    }
    if (name.length > 16) {
      this.lobby.nameErrorMsg.textContent = 'Username must be 16 characters or less.';
      return false;
    }
    return true;
  }

  showLobby(data) {
    this.showScreen('lobby');
    this.lobby.roomCode.textContent = data.roomCode;
    this.lobby.errorMsg.textContent = '';
    this.isReady = false;
    this.buttons.lobbyReady.textContent = 'READY';
    this.buttons.lobbyReady.className = 'cyber-btn btn-green';
  }

  updateLobbyUI(data) {
    const { roomCode, hostId, players } = data;
    this.lobby.roomCode.textContent = roomCode;
    this.lobby.playerCount.textContent = players.length;

    const isHost = this.network.playerId === hostId;
    this.network.isHost = isHost;

    if (isHost) {
      this.buttons.lobbyStart.style.display = 'inline-block';
      this.buttons.lobbyStart.disabled = players.length < 2;
      this.lobby.statusHint.textContent =
        players.length < 2
          ? 'Waiting for at least 2 players to start...'
          : 'Ready to launch deathmatch!';
    } else {
      this.buttons.lobbyStart.style.display = 'none';
      this.lobby.statusHint.textContent = 'Waiting for host to start the match...';
    }

    // Render roster
    this.lobby.playerList.innerHTML = '';
    for (const p of players) {
      const li = document.createElement('li');
      li.className = `player-item ${p.id === this.network.playerId ? 'is-me' : ''}`;

      const left = document.createElement('div');
      left.className = 'player-item-left';

      const dot = document.createElement('div');
      dot.className = 'player-color-dot';
      dot.style.color = p.color;
      dot.style.backgroundColor = p.color;

      const nameSpan = document.createElement('span');
      nameSpan.textContent = p.name;

      left.appendChild(dot);
      left.appendChild(nameSpan);

      if (p.isHost) {
        const badge = document.createElement('span');
        badge.className = 'host-badge';
        badge.textContent = 'HOST';
        left.appendChild(badge);
      }

      const statusSpan = document.createElement('span');
      statusSpan.className = `ready-status ${p.isReady ? 'ready' : 'waiting'}`;
      statusSpan.textContent = p.isReady ? '✓ READY' : 'WAITING';

      li.appendChild(left);
      li.appendChild(statusSpan);
      this.lobby.playerList.appendChild(li);
    }
  }

  showCountdown(count) {
    this.hud.countdownOverlay.style.display = 'flex';
    if (count === 0) {
      this.hud.countdownText.textContent = 'GO!';
      this.hud.countdownText.className = 'countdown-number go';
      this.audio.playCountdownBeep(true);
      setTimeout(() => {
        this.hud.countdownOverlay.style.display = 'none';
      }, 900);
    } else {
      this.hud.countdownText.textContent = count;
      this.hud.countdownText.className = 'countdown-number';
      this.audio.playCountdownBeep(false);
    }
  }

  showEliminationPopup(text = '+1 POINT') {
    if (!this.hud.eliminationPopup) return;
    const pts = this.hud.eliminationPopup.querySelector('.elim-points');
    if (pts) pts.textContent = text;

    this.hud.eliminationPopup.style.display = 'block';
    this.hud.eliminationPopup.style.animation = 'none';
    // Force reflow
    void this.hud.eliminationPopup.offsetWidth;
    this.hud.eliminationPopup.style.animation = 'elimPop 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';

    setTimeout(() => {
      this.hud.eliminationPopup.style.display = 'none';
    }, 850);
  }

  updateHUD(localPlayer, allPlayers, roomCode, targetScore = 30) {
    if (!localPlayer) return;

    this.hud.roomCode.textContent = `ROOM: ${roomCode}`;
    this.hud.playerName.textContent = localPlayer.name;
    this.hud.score.textContent = localPlayer.score;
    if (this.hud.targetScore) this.hud.targetScore.textContent = targetScore;
    if (this.hud.targetGoal) this.hud.targetGoal.textContent = targetScore;

    // Health Bar
    const hpPct = Math.max(0, (localPlayer.health / localPlayer.maxHealth) * 100);
    this.hud.healthFill.style.width = `${hpPct}%`;
    this.hud.healthText.textContent = `${localPlayer.health} / ${localPlayer.maxHealth} HP`;

    if (hpPct <= 25) {
      this.hud.healthFill.classList.add('low');
    } else {
      this.hud.healthFill.classList.remove('low');
    }

    // Respawn Banner for Dead Local Player
    if (this.hud.respawnBanner) {
      if (!localPlayer.isAlive) {
        this.hud.respawnBanner.style.display = 'block';
        const sec = Math.max(1, Math.ceil(localPlayer.respawnTimer || 2));
        this.hud.respawnTimerText.textContent = `RESPAWNING IN ${sec}s...`;
      } else {
        this.hud.respawnBanner.style.display = 'none';
      }
    }

    // Live Top Leaderboard
    this.renderLiveLeaderboard(allPlayers);

    // Full TAB Scoreboard table
    this.renderScoreboard(allPlayers);
  }

  renderLiveLeaderboard(players) {
    if (!this.hud.liveLeaderboard) return;
    const sorted = [...players].sort((a, b) => b.score - a.score || a.deaths - b.deaths);
    this.hud.liveLeaderboard.innerHTML = '';

    sorted.slice(0, 4).forEach((p, idx) => {
      const row = document.createElement('div');
      row.className = `hud-leader-row ${p.id === this.network.playerId ? 'is-local' : ''}`;
      row.innerHTML = `
        <span style="color: ${p.color};">${idx + 1}. ${p.name} ${p.id === this.network.playerId ? '(YOU)' : ''}</span>
        <span class="hud-leader-score">${p.score}</span>
      `;
      this.hud.liveLeaderboard.appendChild(row);
    });
  }

  renderScoreboard(players) {
    const sorted = [...players].sort((a, b) => b.score - a.score || a.deaths - b.deaths);
    this.hud.scoreboardBody.innerHTML = '';

    for (const p of sorted) {
      const kd = p.deaths === 0 ? p.kills.toFixed(1) : (p.kills / p.deaths).toFixed(1);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color: ${p.color}; font-weight: 700;">${p.name} ${p.id === this.network.playerId ? '(YOU)' : ''}</td>
        <td style="color: var(--neon-amber); font-weight: 700;">${p.score}</td>
        <td>${p.deaths}</td>
        <td>${kd}</td>
        <td style="color: ${p.isAlive ? 'var(--neon-green)' : 'var(--neon-magenta)'}">${p.isAlive ? (p.isInvulnerable ? 'SHIELD' : 'ACTIVE') : 'RESPAWNING'}</td>
      `;
      this.hud.scoreboardBody.appendChild(tr);
    }
  }

  addKillFeedEntry(killerName, victimName) {
    const item = document.createElement('div');
    item.className = 'kill-feed-item';
    item.innerHTML = `<span class="killer">${killerName}</span> ⚔ <span class="victim">${victimName}</span>`;

    this.hud.killFeed.appendChild(item);

    setTimeout(() => {
      if (item.parentNode) item.parentNode.removeChild(item);
    }, 5000);
  }

  showGameOver(data) {
    this.showScreen('gameover');
    this.audio.playVictory();

    const winner = data.winner;
    this.gameOver.winnerName.textContent = winner ? winner.name : 'NO CHAMPION';
    this.gameOver.winnerName.style.color = winner ? winner.color : '#fff';

    if (this.gameOver.winnerScore) {
      const score = winner ? winner.score : (data.targetScore || 30);
      this.gameOver.winnerScore.textContent = `${score} POINTS (TARGET REACHED)`;
    }

    // Populate final scoreboard
    const scoreboard = data.scoreboard || [];
    scoreboard.sort((a, b) => b.score - a.score || a.deaths - b.deaths);

    this.gameOver.tableBody.innerHTML = '';
    scoreboard.forEach((p, idx) => {
      const tr = document.createElement('tr');
      if (winner && p.id === winner.id) {
        tr.className = 'winner-row';
      }
      tr.innerHTML = `
        <td>#${idx + 1}</td>
        <td style="color: ${p.color}; font-weight: 700;">${p.name}</td>
        <td style="color: var(--neon-amber); font-weight: 700;">${p.score}</td>
        <td>${p.deaths}</td>
      `;
      this.gameOver.tableBody.appendChild(tr);
    });
  }
}
