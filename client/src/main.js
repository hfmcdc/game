import { SoundManager } from './audio/SoundManager.js';
import { NetworkManager } from './network/NetworkManager.js';
import { UIManager } from './ui/UIManager.js';
import { NexusGame } from './game/NexusGame.js';
import { DeviceUtils } from './utils/DeviceUtils.js';

class App {
  constructor() {
    this.audio = new SoundManager();
    this.network = new NetworkManager();
    this.ui = new UIManager(this.network, this.audio);
    this.game = new NexusGame(this.network, this.audio, this.ui);

    this.init();
  }

  init() {
    console.log('==============================================');
    console.log('               NEXUS ARENA CLIENT             ');
    console.log('             Built by Mr.Mallu_gg             ');
    console.log('==============================================');

    // Detect mobile & set up orientation handling
    this.setupMobileAdaptation();

    // Connect to Socket.IO backend
    this.network.connect();

    // Wire up application lifecycle
    this.setupNetworkBinds();
  }

  setupMobileAdaptation() {
    const isMobile = DeviceUtils.isMobile();
    if (isMobile) {
      document.body.classList.add('is-mobile');
    }

    const updateOrientationClass = () => {
      document.body.classList.toggle('is-portrait', DeviceUtils.isPortrait());
    };
    updateOrientationClass();
    window.addEventListener('resize', updateOrientationClass);
    window.addEventListener('orientationchange', updateOrientationClass);

    // Best-effort landscape lock + fullscreen, triggered from the first
    // user gesture (PLAY NOW). Falls back gracefully to the CSS
    // rotate-overlay on browsers that don't support the Orientation API.
    if (isMobile) {
      const playBtn = document.getElementById('btn-play-now');
      if (playBtn) {
        playBtn.addEventListener('click', async () => {
          await DeviceUtils.requestFullscreen();
          await DeviceUtils.requestLandscapeLock();
        });
      }
    }
  }

  setupNetworkBinds() {
    // Room Updated (Lobby roster, host change, ready updates)
    this.network.on('room_updated', (data) => {
      this.ui.updateLobbyUI(data);
    });

    // Countdown Started (Match Start Event)
    this.network.on('match_countdown_started', (data) => {
      console.log('[NEXUS] Match start event received');
      console.log('[NEXUS] New game state: COUNTDOWN', data);
      console.log('[NEXUS] Starting ArenaScene');

      // 1. Immediately switch DOM screen to game HUD
      this.ui.showScreen('game');

      // 2. Boot / Start Phaser Arena Scene
      this.game.start(data.arena);

      // 3. Trigger Countdown Display
      console.log('[NEXUS] Countdown started');
      this.ui.showCountdown(data.duration);
    });

    // Countdown Ticks (3, 2, 1, 0)
    this.network.on('countdown_tick', (data) => {
      this.ui.showCountdown(data.count);
    });

    // Match Playing State
    this.network.on('match_started', () => {
      console.log('[NEXUS] PLAYING');
    });

    // Match Over / Victory
    this.network.on('match_over', (data) => {
      console.log('[NEXUS] MATCH OVER', data);
      this.ui.showGameOver(data);
    });

    // Rematch / Returned to Lobby
    this.network.on('returned_to_lobby', () => {
      console.log('[NEXUS] Returned to lobby');
      this.ui.showScreen('lobby');
    });
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
