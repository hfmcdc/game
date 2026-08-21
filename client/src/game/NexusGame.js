import { ArenaScene } from './scenes/ArenaScene.js';

export class NexusGame {
  constructor(network, audio, ui) {
    this.network = network;
    this.audio = audio;
    this.ui = ui;
    this.game = null;
    this.arenaScene = null;
  }

  init() {
    if (this.game) return;

    this.arenaScene = new ArenaScene();

    const config = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#050811',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      fps: {
        target: 60,
        forceSetTimeOut: true,
      },
      scene: [this.arenaScene],
    };

    this.game = new Phaser.Game(config);

    window.addEventListener('resize', () => {
      if (this.game && this.game.scale) {
        this.game.scale.resize(window.innerWidth, window.innerHeight);
      }
    });
  }

  start(arenaData) {
    this.init();
    if (this.arenaScene) {
      this.arenaScene.startMatch(arenaData, this.network, this.audio, this.ui);
    }
  }
}
