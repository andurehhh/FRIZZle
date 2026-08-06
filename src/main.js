import Phaser from 'phaser';
import { WIDTH, HEIGHT } from './config/constants.js';

import Boot    from './scenes/Boot.js';
import Attract from './scenes/Attract.js';
import Level1  from './scenes/Level1.js';
import Level2  from './scenes/Level2.js';
import Level3  from './scenes/Level3.js';
import GameOver from './scenes/GameOver.js';

// Scenes added as built — Endless, LevelClear3 coming Day 3+
const config = {
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#232F3E',
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 }, // per-object gravity applied in Mascot.js
      debug: false,       // flip to true to see hitboxes during dev
    },
  },
  scene: [
    Boot,
    Attract,
    Level1,
    Level2,
    Level3,
    GameOver,
    // LevelClear3  — Day 3
    // Endless      — Day 4
  ],
};

new Phaser.Game(config);
