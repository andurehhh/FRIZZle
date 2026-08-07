import Phaser from 'phaser';
import Mascot from '../entities/Mascot.js';
import Obstacle, { OBSTACLE_TYPE } from '../entities/Obstacle.js';
import Collectible from '../entities/Collectible.js';
import GlitchMonster from '../entities/GlitchMonster.js';
import ThemeManager from '../systems/ThemeManager.js';
import {
  WIDTH, HEIGHT, COLORS, THEME, THEME_CONFIG,
  OBSTACLE_INTERVAL,
  ENDLESS_START_SPEED, ENDLESS_MAX_SPEED,
  ENDLESS_START_GAP, ENDLESS_MIN_GAP,
  DATABIT_SCORE,
} from '../config/constants.js';

/**
 * Endless — infinite mode after clearing all 3 levels.
 *
 * Key differences from GameScene:
 *   - No gem win condition — survive as long as possible
 *   - Score = Data Bits collected (each chip = DATABIT_SCORE points)
 *   - Difficulty ramps fast: speed + gap tighten over time
 *   - Wavy monsters on their own timer
 *   - Theme alternates every ~22s
 *   - On death → EndlessGameOver with score + leaderboard
 */
export default class Endless extends Phaser.Scene {
  constructor() {
    super({ key: 'Endless' });
  }

  create() {
    // --- Theme (alternating) ---
    this._themeManager = new ThemeManager(this, THEME.ICE, { alternates: true });
    this._themeManager.on('themechange', this._onThemeChange, this);

    // --- Background ---
    this._bg = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT,
      THEME_CONFIG[THEME.ICE].bgColor);
    this._buildParticles(THEME.ICE);

    // --- State ---
    this._obstacles    = [];
    this._collectibles = [];
    this._monsters     = [];
    this._score        = 0;
    this._gameOver     = false;
    this._elapsedMs    = 0; // tracks total time for difficulty ramp

    this._spawnTimer       = 0;
    this._firstSpawnDelay  = 1200;
    this._chipTimer        = 0;
    this._chipInterval     = Phaser.Math.Between(2800, 4200);
    this._monsterTimer     = 0;
    this._monsterInterval  = Phaser.Math.Between(3500, 5500);

    // --- Mascot ---
    this._mascot = new Mascot(this);

    // --- HUD ---
    this._scoreText = this.add.text(24, 28, 'SCORE: 0', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#FF9900',
      fontStyle: 'bold',
    }).setOrigin(0, 0).setDepth(10);

    this.add.text(WIDTH / 2, 28, 'ENDLESS MODE', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#FFFFFF',
    }).setOrigin(0.5, 0).setDepth(10);

    // Difficulty indicator
    this._diffText = this.add.text(WIDTH - 20, 28, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#666666',
    }).setOrigin(1, 0).setDepth(10);
  }

  update(time, delta) {
    if (this._gameOver) return;

    this._elapsedMs += delta;
    this._themeManager.update(delta);
    this._mascot.update(time, delta);

    // Off-screen kill
    if (this._mascot.y < 0 || this._mascot.y > HEIGHT) {
      this._triggerGameOver();
      return;
    }

    const mascotBounds = this._mascot.getBounds();
    const { speed, gap } = this._getDifficulty();

    // --- Obstacles ---
    this._spawnTimer += delta;
    const spawnInterval = Math.max(OBSTACLE_INTERVAL - this._elapsedMs * 0.012, 900);
    const threshold = this._obstacles.length === 0 ? this._firstSpawnDelay : spawnInterval;

    if (this._spawnTimer >= threshold) {
      this._spawnTimer = 0;
      this._spawnObstacle(speed, gap);
    }

    for (let i = this._obstacles.length - 1; i >= 0; i--) {
      const obs = this._obstacles[i];
      obs.update();
      if (obs.overlaps(mascotBounds)) { this._triggerGameOver(); return; }
      if (obs.isOffscreen()) { obs.destroy(); this._obstacles.splice(i, 1); }
    }

    // --- Chips ---
    this._chipTimer += delta;
    if (this._chipTimer >= this._chipInterval) {
      this._chipTimer    = 0;
      this._chipInterval = Phaser.Math.Between(2800, 4200);
      this._spawnFreeChip(speed);
    }

    for (let i = this._collectibles.length - 1; i >= 0; i--) {
      const col = this._collectibles[i];
      col.update();
      if (!col.collected && col.overlaps(mascotBounds)) {
        col.collect();
        this._score += DATABIT_SCORE;
        this._scoreText.setText(`SCORE: ${this._score}`);
        this._spawnCollectFX(col);
      }
      if (col.isOffscreen() || col.collected) {
        if (col.isOffscreen()) col.destroy();
        this._collectibles.splice(i, 1);
      }
    }

    // --- Monsters ---
    this._monsterTimer += delta;
    // Monsters get more frequent over time
    const monInterval = Math.max(this._monsterInterval - this._elapsedMs * 0.01, 2000);
    if (this._monsterTimer >= monInterval) {
      this._monsterTimer    = 0;
      this._monsterInterval = Phaser.Math.Between(3500, 5500);
      this._spawnMonster(speed);
    }

    for (let i = this._monsters.length - 1; i >= 0; i--) {
      const mon = this._monsters[i];
      mon.update(delta);
      if (mon.overlaps(mascotBounds)) { this._triggerGameOver(); return; }
      if (mon.isOffscreen()) { mon.destroy(); this._monsters.splice(i, 1); }
    }

    // Update difficulty indicator
    const pct = Math.min(100, Math.round((speed - ENDLESS_START_SPEED) / (ENDLESS_MAX_SPEED - ENDLESS_START_SPEED) * 100));
    this._diffText.setText(`DIFF: ${pct}%`);
  }

  // ---------------------------------------------------------------------------
  // Difficulty ramp
  // ---------------------------------------------------------------------------

  /**
   * Returns current speed and gap based on elapsed time.
   * Ramps fast: reaches near-max around 60–90s.
   */
  _getDifficulty() {
    const t = this._elapsedMs / 1000; // seconds elapsed
    // Speed: linear ramp from start to max over ~80 seconds
    const speedProgress = Math.min(t / 80, 1);
    const speed = ENDLESS_START_SPEED + (ENDLESS_MAX_SPEED - ENDLESS_START_SPEED) * speedProgress;
    // Gap: shrinks from start to min over ~70 seconds
    const gapProgress = Math.min(t / 70, 1);
    const gap = ENDLESS_START_GAP - (ENDLESS_START_GAP - ENDLESS_MIN_GAP) * gapProgress;
    return { speed, gap };
  }

  // ---------------------------------------------------------------------------
  // Spawning
  // ---------------------------------------------------------------------------

  _spawnObstacle(speed, gap) {
    const type   = this._pickObstacleType();
    const margin = 100;
    const gapY   = Phaser.Math.Between(margin + gap / 2, HEIGHT - margin - gap / 2);
    const theme  = this._themeManager.theme;
    const cfg    = this._themeManager.config;

    const obs = new Obstacle(this, WIDTH + 60, gapY, gap, speed, type, theme, cfg);
    this._obstacles.push(obs);
  }

  _pickObstacleType() {
    const last = this._obstacles[this._obstacles.length - 1];
    if (last && last._type !== OBSTACLE_TYPE.COLUMN) return OBSTACLE_TYPE.COLUMN;
    const roll = Math.random();
    if (roll < 0.55) return OBSTACLE_TYPE.COLUMN;
    if (roll < 0.78) return OBSTACLE_TYPE.MOUNTAIN_TOP;
    return OBSTACLE_TYPE.MOUNTAIN_BOT;
  }

  _spawnFreeChip(speed) {
    const theme  = this._themeManager.theme;
    const margin = 80;

    for (let attempt = 0; attempt < 5; attempt++) {
      const y = Phaser.Math.Between(margin, HEIGHT - margin);
      const chip = new Collectible(this, WIDTH + 60, y, speed, theme);
      if (!chip.overlapsObstacles(this._obstacles)) {
        this._collectibles.push(chip);
        return;
      }
      chip.destroy();
    }
  }

  _spawnMonster(speed) {
    const theme = this._themeManager.theme;

    // Avoid zone from nearest column gap
    let avoidZone = null;
    for (const obs of this._obstacles) {
      if (obs._type === 'column' && obs._hitRects.length >= 2) {
        const topRect = obs._hitRects[0];
        const botRect = obs._hitRects[1];
        avoidZone = { minY: topRect.y + topRect.h - 20, maxY: botRect.y + 20 };
        break;
      }
    }

    const mon = new GlitchMonster(this, speed * 1.3, 'wavy', theme, avoidZone);
    this._monsters.push(mon);
  }

  // ---------------------------------------------------------------------------
  // FX
  // ---------------------------------------------------------------------------

  _spawnCollectFX(col) {
    this.cameras.main.flash(100, 255, 153, 0, true);
    const txt = this.add.text(col._gfx.x, col._gfx.y - 10, `+${DATABIT_SCORE}`, {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#FF9900',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: txt,
      y: txt.y - 40,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  // ---------------------------------------------------------------------------
  // Theme
  // ---------------------------------------------------------------------------

  _onThemeChange(newTheme, cfg) {
    this._bg.setFillStyle(cfg.bgColor);
    this._particleObjects?.forEach(p => p.destroy());
    this._buildParticles(newTheme);
  }

  _buildParticles(theme) {
    this._particleObjects = [];
    if (theme === THEME.MATRIX) {
      for (let i = 0; i < 24; i++) {
        const dot = this.add.rectangle(
          Phaser.Math.Between(0, WIDTH), Phaser.Math.Between(0, HEIGHT),
          3, 14, 0x00FF41, 0.5
        );
        this._particleObjects.push(dot);
        this.tweens.add({
          targets: dot, y: HEIGHT + 20,
          duration: Phaser.Math.Between(1500, 3500), repeat: -1,
          delay: Phaser.Math.Between(0, 2500),
          onRepeat: (_, t) => { t.x = Phaser.Math.Between(0, WIDTH); t.y = -20; },
        });
      }
    } else {
      for (let i = 0; i < 24; i++) {
        const flake = this.add.circle(
          Phaser.Math.Between(0, WIDTH), Phaser.Math.Between(0, HEIGHT),
          Phaser.Math.Between(2, 4), 0xE0F7FA, 0.5
        );
        this._particleObjects.push(flake);
        this.tweens.add({
          targets: flake, y: HEIGHT + 10, x: `+=${Phaser.Math.Between(-30, 30)}`,
          duration: Phaser.Math.Between(3500, 7000), repeat: -1,
          delay: Phaser.Math.Between(0, 4000),
          onRepeat: (_, t) => { t.x = Phaser.Math.Between(0, WIDTH); t.y = -10; },
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Game Over
  // ---------------------------------------------------------------------------

  _triggerGameOver() {
    if (this._gameOver) return;
    this._gameOver = true;
    this._mascot.die();
    this.cameras.main.shake(250, 0.01);

    this.time.delayedCall(1000, () => {
      this.scene.start('NameInput', { score: this._score });
    });
  }
}
