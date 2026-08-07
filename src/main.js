import Phaser from 'phaser';
import { WIDTH, HEIGHT } from './config/constants.js';

import Boot            from './scenes/Boot.js';
import Attract         from './scenes/Attract.js';
import CaptureScene    from './scenes/CaptureScene.js';
import LevelTransition from './scenes/LevelTransition.js';
import Level1          from './scenes/Level1.js';
import Level2          from './scenes/Level2.js';
import Level3          from './scenes/Level3.js';
import LevelClear3     from './scenes/LevelClear3.js';
import Endless         from './scenes/Endless.js';
import NameInput       from './scenes/NameInput.js';
import EndlessGameOver from './scenes/EndlessGameOver.js';
import GameOver        from './scenes/GameOver.js';

const config = {
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#232F3E',
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [
    Boot,
    Attract,
    CaptureScene,
    LevelTransition,
    Level1,
    Level2,
    Level3,
    LevelClear3,
    Endless,
    NameInput,
    EndlessGameOver,
    GameOver,
  ],
};

new Phaser.Game(config);
