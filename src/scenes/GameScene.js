import Phaser from 'phaser';
import Mascot from '../entities/Mascot.js';
import Obstacle, { OBSTACLE_TYPE } from '../entities/Obstacle.js';
import Collectible from '../entities/Collectible.js';
import GlitchMonster from '../entities/GlitchMonster.js';
import ThemeManager from '../systems/ThemeManager.js';
import {
  WIDTH, HEIGHT, COLORS, THEME, THEME_CONFIG,
  OBSTACLE_INTERVAL,
} from '../config/constants.js';

/**
 * GameScene — base class for Level1, Level2, Level3.
 *
 * Subclasses configure:
 *   obstacleSpeed    {number}   px/s
 *   gapSize          {number}   px
 *   levelKey         {string}   this scene's key
 *   nextSceneKey     {string}   scene to start on level clear
 *   gemsRequired     {number}   chips to collect to win (0 = survival only)
 *   levelNumber      {number}   1–3
 *   initialTheme     {string}   THEME.ICE | THEME.MATRIX
 *   themeAlternates  {boolean}  switches mid-level
 *   hasMonsters      {boolean}  spawns GlitchMonsters
 *   monsterPattern   {string}   'straight' | 'wavy'
 */
export default class GameScene extends Phaser.Scene {
  constructor(key) {
    super({ key });

    // Defaults — all overridden by subclasses
    this.obstacleSpeed   = 220;
    this.gapSize         = 252;
    this.levelKey        = key;
    this.nextSceneKey    = 'GameOver';
    this.gemsRequired    = 3;
    this.levelNumber     = 1;
    this.initialTheme    = THEME.ICE;
    this.themeAlternates = false;
    this.hasMonsters     = false;
    this.monsterPattern  = 'straight';
  }

  create() {
    // --- Theme ---
    this._themeManager = new ThemeManager(this, this.initialTheme, {
      alternates: this.themeAlternates,
    });
    this._themeManager.on('themechange', this._onThemeChange, this);

    // --- Background ---
    this._bg = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT,
      THEME_CONFIG[this.initialTheme].bgColor);
    this._buildParticles(this.initialTheme);

    // --- State ---
    this._obstacles        = [];
    this._collectibles     = [];
    this._monsters         = [];
    this._gemsCollected    = 0;
    this._gameOver         = false;
    this._levelCleared     = false;
    this._spawnTimer       = 0;
    this._firstSpawnDelay  = 1400;
    this._chipTimer        = 0;
    this._chipInterval     = Phaser.Math.Between(3500, 5500);
    this._monsterTimer     = 0;
    this._monsterInterval  = Phaser.Math.Between(4000, 6000);

    // --- Mascot ---
    this._mascot = new Mascot(this);

    // --- HUD ---
    this._levelLabel = this.add.text(WIDTH / 2, 28, `LEVEL ${this.levelNumber}`, {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#FF9900',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(10);

    // Gem counter — chip icon + count
    this._gemText = this.add.text(24, 28,
      `CHIPS: ${this._gemsCollected} / ${this.gemsRequired}`, {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#FF9900',
    }).setOrigin(0, 0).setDepth(10);

    this._clearLabel = this.add.text(WIDTH / 2, HEIGHT / 2 - 40, '', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#FF9900',
      align: 'center',
    }).setOrigin(0.5).setDepth(10);
  }

  update(time, delta) {
    if (this._gameOver || this._levelCleared) return;

    // Theme tick
    this._themeManager.update(delta);

    // Mascot
    this._mascot.update(time, delta);

    // Screen-edge kill
    if (this._mascot.y < 0 || this._mascot.y > HEIGHT) {
      this._triggerGameOver();
      return;
    }

    const mascotBounds = this._mascot.getBounds();

    // --- Obstacle spawn timer ---
    this._spawnTimer += delta;
    const threshold = this._obstacles.length === 0
      ? this._firstSpawnDelay
      : OBSTACLE_INTERVAL;

    if (this._spawnTimer >= threshold) {
      this._spawnTimer = 0;
      this._spawnObstacle();
    }

    // --- Free-floating chip spawn timer ---
    this._chipTimer += delta;
    if (this._chipTimer >= this._chipInterval) {
      this._chipTimer    = 0;
      this._chipInterval = Phaser.Math.Between(3500, 5500);
      this._spawnFreeChip();
    }

    // --- Monster spawn timer (only on levels with monsters) ---
    if (this.hasMonsters) {
      this._monsterTimer += delta;
      if (this._monsterTimer >= this._monsterInterval) {
        this._monsterTimer    = 0;
        this._monsterInterval = Phaser.Math.Between(4000, 6000);
        this._spawnMonster();
      }
    }

    for (let i = this._obstacles.length - 1; i >= 0; i--) {
      const obs = this._obstacles[i];
      obs.update();

      if (obs.overlaps(mascotBounds)) {
        this._triggerGameOver();
        return;
      }

      if (obs.isOffscreen()) {
        obs.destroy();
        this._obstacles.splice(i, 1);
      }
    }

    // --- Collectibles ---
    for (let i = this._collectibles.length - 1; i >= 0; i--) {
      const col = this._collectibles[i];
      col.update();

      if (!col.collected && col.overlaps(mascotBounds)) {
        col.collect();
        this._gemsCollected++;
        this._updateGemText();
        this._spawnCollectFX(col);

        if (this._gemsCollected >= this.gemsRequired) {
          this._triggerLevelClear();
          return;
        }
      }

      if (col.isOffscreen() || col.collected) {
        if (col.isOffscreen()) col.destroy();
        this._collectibles.splice(i, 1);
      }
    }

    // --- Monsters ---
    for (let i = this._monsters.length - 1; i >= 0; i--) {
      const mon = this._monsters[i];
      mon.update(delta);

      if (mon.overlaps(mascotBounds)) {
        this._triggerGameOver();
        return;
      }

      if (mon.isOffscreen()) {
        mon.destroy();
        this._monsters.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Spawning
  // ---------------------------------------------------------------------------

  /**
   * Spawn an obstacle (pipe, mountain, or monster on Level 3).
   * Monsters replace mountains in the spawn pool for variety.
   */
  _spawnObstacle() {
    const theme    = this._themeManager.theme;
    const themeCfg = this._themeManager.config;
    const type     = this._pickObstacleType();
    const margin   = 110;
    const gapY     = Phaser.Math.Between(
      margin + this.gapSize / 2,
      HEIGHT - margin - this.gapSize / 2
    );

    const obs = new Obstacle(
      this, WIDTH + 60, gapY, this.gapSize,
      this.obstacleSpeed, type, theme, themeCfg
    );
    this._obstacles.push(obs);
  }

  /**
   * Spawn an independent GlitchMonster — picks top or bottom lane randomly.
   * Completely separate from the obstacle spawn queue.
   */
  _spawnMonster() {
    const lane    = Math.random() < 0.5 ? 'top' : 'bot';
    const speed   = this.obstacleSpeed * 0.9;
    const pattern = this.monsterPattern ?? 'straight';
    const theme   = this._themeManager.theme;
    const mon     = new GlitchMonster(this, lane, speed, pattern, theme);
    this._monsters.push(mon);
  }

  /**
   * Tries multiple positions to avoid overlapping existing obstacles.
   */
  _spawnFreeChip() {
    const theme = this._themeManager.theme;
    const margin = 90;
    
    // Try up to 5 positions to find one that doesn't overlap obstacles
    for (let attempt = 0; attempt < 5; attempt++) {
      const y = Phaser.Math.Between(margin, HEIGHT - margin);
      const testChip = new Collectible(this, WIDTH + 60, y, this.obstacleSpeed, theme);
      
      if (!testChip.overlapsObstacles(this._obstacles)) {
        // Clean position found — keep this chip
        this._collectibles.push(testChip);
        return;
      } else {
        // Position overlaps — destroy test chip and try again
        testChip.destroy();
      }
    }
    
    // All 5 attempts failed — skip spawning this chip
    // (prevents infinite loops when screen is very crowded)
  }

  /**
   * Weighted obstacle type picker.
   * Level 3 with monsters: some mountains become monster obstacles.
   * Otherwise: 60% column, 20% mountain-top, 20% mountain-bot.
   */
  _pickObstacleType() {
    const last = this._obstacles[this._obstacles.length - 1];
    if (last && last._type !== OBSTACLE_TYPE.COLUMN) return OBSTACLE_TYPE.COLUMN;

    const roll = Math.random();
    if (roll < 0.60) return OBSTACLE_TYPE.COLUMN;
    if (roll < 0.80) return OBSTACLE_TYPE.MOUNTAIN_TOP;
    return OBSTACLE_TYPE.MOUNTAIN_BOT;
  }

  // ---------------------------------------------------------------------------
  // FX
  // ---------------------------------------------------------------------------

  /** Brief orange flash + score pop text when a chip is collected. */
  _spawnCollectFX(col) {
    this.cameras.main.flash(120, 255, 153, 0, true);

    const txt = this.add.text(col._gfx.x, col._gfx.y - 10, '+CHIP!', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#FF9900',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: txt,
      y: txt.y - 48,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  // ---------------------------------------------------------------------------
  // Theme
  // ---------------------------------------------------------------------------

  _onThemeChange(newTheme, themeCfg) {
    this._bg.setFillStyle(themeCfg.bgColor);
    this._particleObjects?.forEach(p => p.destroy());
    this._buildParticles(newTheme);
  }

  _buildParticles(theme) {
    this._particleObjects = [];

    if (theme === THEME.MATRIX) {
      for (let i = 0; i < 28; i++) {
        const dot = this.add.rectangle(
          Phaser.Math.Between(0, WIDTH),
          Phaser.Math.Between(0, HEIGHT),
          3, 16, 0x00FF41, 0.55
        );
        this._particleObjects.push(dot);
        this.tweens.add({
          targets: dot,
          y: HEIGHT + 20,
          duration: Phaser.Math.Between(1800, 4000),
          repeat: -1,
          delay: Phaser.Math.Between(0, 3000),
          onRepeat: (_, t) => { t.x = Phaser.Math.Between(0, WIDTH); t.y = -20; },
        });
      }
    } else {
      for (let i = 0; i < 28; i++) {
        const flake = this.add.circle(
          Phaser.Math.Between(0, WIDTH),
          Phaser.Math.Between(0, HEIGHT),
          Phaser.Math.Between(2, 5), 0xE0F7FA, 0.6
        );
        this._particleObjects.push(flake);
        this.tweens.add({
          targets: flake,
          y: HEIGHT + 10,
          x: `+=${Phaser.Math.Between(-40, 40)}`,
          duration: Phaser.Math.Between(4000, 9000),
          repeat: -1,
          delay: Phaser.Math.Between(0, 5000),
          onRepeat: (_, t) => { t.x = Phaser.Math.Between(0, WIDTH); t.y = -10; },
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // HUD
  // ---------------------------------------------------------------------------

  _updateGemText() {
    this._gemText.setText(`CHIPS: ${this._gemsCollected} / ${this.gemsRequired}`);
  }

  // ---------------------------------------------------------------------------
  // Game flow
  // ---------------------------------------------------------------------------

  _triggerGameOver() {
    if (this._gameOver || this._levelCleared) return;
    this._gameOver = true;
    this._mascot.die();
    this.cameras.main.shake(200, 0.008);

    this.time.delayedCall(900, () => {
      this.scene.start('GameOver', {
        fromLevel:   this.levelKey,
        levelNumber: this.levelNumber,
      });
    });
  }

  _triggerLevelClear() {
    if (this._gameOver || this._levelCleared) return;
    this._levelCleared = true;

    // Freeze everything
    this._obstacles.forEach(o => { o._speed = 0; });
    this._collectibles.forEach(c => { c._speed = 0; });
    this._monsters.forEach(m => { m._speed = 0; });

    this._clearLabel.setText(
      `LEVEL ${this.levelNumber} CLEAR!\nCollect your candy at the booth!`
    );
    this.cameras.main.flash(500, 255, 153, 0);

    this.time.delayedCall(3200, () => {
      this.scene.start(this.nextSceneKey);
    });
  }
}
