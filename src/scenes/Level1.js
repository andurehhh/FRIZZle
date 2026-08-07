import GameScene from './GameScene.js';
import { OBSTACLE_SPEED_L1, GAP_L1, THEME } from '../config/constants.js';

/**
 * Level 1 — ~3/10 difficulty | Ice/Snow theme
 * Collect 3 SBG chips to clear. Wide gaps, slow speed.
 * No monsters — pure intro level.
 */
export default class Level1 extends GameScene {
  constructor() {
    super('Level1');
    this.obstacleSpeed   = OBSTACLE_SPEED_L1;
    this.gapSize         = GAP_L1;
    this.levelNumber     = 1;
    this.nextSceneKey    = 'Level2';
    this.gemsRequired    = 3;
    this.initialTheme    = THEME.ICE;
    this.themeAlternates = false;
    this.hasMonsters     = false;
    this.nextTheme       = THEME.MATRIX; // Level 2 is Matrix themed
  }
}
