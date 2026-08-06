import GameScene from './GameScene.js';
import { OBSTACLE_SPEED_L3, GAP_L3, THEME } from '../config/constants.js';

/**
 * Level 3 — ~7/10 difficulty | Alternating Ice ↔ Matrix theme
 * Collect 5 SBG chips to clear. Tight gaps, fast speed.
 * Glitch monsters fly straight across — never paired with an obstacle spawn.
 */
export default class Level3 extends GameScene {
  constructor() {
    super('Level3');
    this.obstacleSpeed   = OBSTACLE_SPEED_L3;
    this.gapSize         = GAP_L3;
    this.levelNumber     = 3;
    this.nextSceneKey    = 'LevelClear3'; // prize screen — built on Day 3
    this.gemsRequired    = 5;
    this.initialTheme    = THEME.ICE;
    this.themeAlternates = true;
    this.hasMonsters     = true;
    this.monsterPattern  = 'straight';
  }
}
