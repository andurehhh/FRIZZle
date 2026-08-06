import GameScene from './GameScene.js';
import { OBSTACLE_SPEED_L2, GAP_L2, THEME } from '../config/constants.js';

/**
 * Level 2 — ~5/10 difficulty | Matrix/Glitch theme
 * Collect 3 SBG chips to clear. Medium gaps, faster speed.
 * No monsters — same chip count as L1 but harder obstacles.
 */
export default class Level2 extends GameScene {
  constructor() {
    super('Level2');
    this.obstacleSpeed   = OBSTACLE_SPEED_L2;
    this.gapSize         = GAP_L2;
    this.levelNumber     = 2;
    this.nextSceneKey    = 'Level3';
    this.gemsRequired    = 3;
    this.initialTheme    = THEME.MATRIX;
    this.themeAlternates = false;
    this.hasMonsters     = false;
  }
}
