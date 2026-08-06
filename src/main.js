import Phaser from 'phaser';
import { WIDTH, HEIGHT } from './config/constants.js';

import Boot    from './scenes/Boot.js';
import Attract from './scenes/Attract.js';
import Level1  from './scenes/Level1.js';

const config = {
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#232F3E',
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 }, // per-object gravity set in scenes
      debug: false,
    },
  },
  scene: [
    Boot,
    Attract,
    Level1,
    // Level2, Level3, Endless, GameOver — added as built
  ],
};

new Phaser.Game(config);
