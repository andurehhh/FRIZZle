import Phaser from 'phaser';
import Mascot from '../entities/Mascot.js';
import Obstacle, { OBSTACLE_TYPE } from '../entities/Obstacle.js';
import Collectible from '../entities/Collectible.js';
import GlitchMonster from '../entities/GlitchMonster.js';
import ThemeManager from '../systems/ThemeManager.js';
import PhotoPool from '../state/photoPool.js';
import {
  WIDTH, HEIGHT, COLORS, THEME, THEME_CONFIG,
  OBSTACLE_INTERVAL,
  ENDLESS_START_SPEED, ENDLESS_MAX_SPEED,
  ENDLESS_START_GAP, ENDLESS_MIN_GAP,
  DATABIT_SCORE, FONT_TITLE, FONT_BODY,
  CHIP_GAP_CHANCE, CHIP_FREE_CHANCE,
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

    // --- Background: scrolling ice-bg (same as levels) at 80% opacity ---
    this._bgImage1 = this.add.image(WIDTH / 2, HEIGHT / 2, 'ice-bg')
      .setDisplaySize(WIDTH, HEIGHT).setAlpha(0.8);
    this._bgImage2 = this.add.image(WIDTH + WIDTH / 2, HEIGHT / 2, 'ice-bg')
      .setDisplaySize(WIDTH, HEIGHT).setFlipX(true).setAlpha(0.8);

    this._bg = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT,
      THEME_CONFIG[THEME.ICE].bgColor).setAlpha(0);
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
    this._chipSpawnAfterObs = false;
    this._monsterTimer     = 0;
    this._monsterInterval  = Phaser.Math.Between(3500, 5500);
    this._scoreTickTimer   = 0; // accumulates ms for time-based scoring

    // --- Mascot ---
    this._mascot = new Mascot(this);

    // --- Pause system ---
    this._paused = false;
    this._pauseOverlay = null;
    this._escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // --- Load face pool for enemy faces ---
    this._facePool = [];
    PhotoPool.getRandomPhotos(10).then(photos => {
      this._facePool = photos;
    }).catch(() => {});

    // --- Audio ---
    this._setupEndlessAudio();

    // --- HUD ---
    this._scoreText = this.add.text(24, 28, 'SCORE: 0', {
      fontSize: '16px',
      fontFamily: FONT_TITLE,
      color: '#FF9900',
    }).setOrigin(0, 0).setDepth(10);

    this.add.text(WIDTH / 2, 28, 'ENDLESS MODE', {
      fontSize: '12px',
      fontFamily: FONT_TITLE,
      color: '#FFFFFF',
    }).setOrigin(0.5, 0).setDepth(10);

    // Difficulty indicator
    this._diffText = this.add.text(WIDTH - 20, 28, '', {
      fontSize: '18px',
      fontFamily: FONT_BODY,
      color: '#666666',
    }).setOrigin(1, 0).setDepth(10);
  }

  update(time, delta) {
    if (this._gameOver) return;

    // Pause toggle
    if (Phaser.Input.Keyboard.JustDown(this._escKey)) {
      this._togglePause();
      return;
    }
    if (this._paused) return;

    // Scroll background
    const { speed: currentSpeed } = this._getDifficulty();
    const bgSpeed = currentSpeed * 0.3;
    const bgDx = bgSpeed / 60;
    this._bgImage1.x -= bgDx;
    this._bgImage2.x -= bgDx;
    if (this._bgImage1.x <= -WIDTH / 2) this._bgImage1.x = this._bgImage2.x + WIDTH;
    if (this._bgImage2.x <= -WIDTH / 2) this._bgImage2.x = this._bgImage1.x + WIDTH;

    this._elapsedMs += delta;
    this._themeManager.update(delta);
    this._mascot.update(time, delta);

    // Time-based scoring: +1 point per second alive
    this._scoreTickTimer += delta;
    if (this._scoreTickTimer >= 1000) {
      this._scoreTickTimer -= 1000;
      this._score += 1;
      this._scoreText.setText(`SCORE: ${this._score}`);
    }

    // Off-screen kill
    if (this._mascot.y < 0 || this._mascot.y > HEIGHT) {
      this._triggerGameOver();
      return;
    }

    const mascotBounds = this._mascot.getHitBounds();
    const { speed, gap } = this._getDifficulty();

    // --- Obstacles ---
    this._spawnTimer += delta;
    const spawnInterval = Math.max(OBSTACLE_INTERVAL - this._elapsedMs * 0.012, 900);
    const threshold = this._obstacles.length === 0 ? this._firstSpawnDelay : spawnInterval;

    if (this._spawnTimer >= threshold) {
      this._spawnTimer = 0;
      this._spawnObstacle(speed, gap);
      this._chipSpawnAfterObs = true;
    }

    // Free chip at midpoint between obstacles
    if (this._chipSpawnAfterObs && this._spawnTimer >= threshold * 0.5) {
      this._chipSpawnAfterObs = false;
      if (Math.random() < CHIP_FREE_CHANCE) {
        const margin = 80;
        const y = Phaser.Math.Between(margin, HEIGHT - margin);
        const theme = this._themeManager.theme;
        const col = new Collectible(this, WIDTH + 60, y, speed, theme);
        this._collectibles.push(col);
      }
    }

    for (let i = this._obstacles.length - 1; i >= 0; i--) {
      const obs = this._obstacles[i];
      obs.update();
      if (obs.overlaps(mascotBounds)) { this._triggerGameOver(); return; }
      if (obs.isOffscreen()) { obs.destroy(); this._obstacles.splice(i, 1); }
    }

    // --- Chips (collected from within pipe gaps) ---
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
    // Spawn interval decreases with time: starts 4-5.5s, ramps down to 1.5s minimum
    const diffProgress = Math.min(this._elapsedMs / 80000, 1); // 0→1 over 80s
    const monIntervalMin = 1500;
    const monIntervalMax = Phaser.Math.Linear(5500, 2000, diffProgress);
    const monInterval = Math.max(monIntervalMin, monIntervalMax - (this._monsterTimer > 0 ? 0 : 0));

    // Cap at 3 monsters on screen simultaneously
    const canSpawn = this._monsters.length < 3;

    if (this._monsterTimer >= monInterval && canSpawn) {
      this._monsterTimer    = 0;
      this._monsterInterval = Phaser.Math.Between(
        Math.round(monIntervalMin),
        Math.round(monIntervalMax)
      );
      this._spawnMonster(speed);
    } else if (this._monsterTimer >= monInterval) {
      // Cap reached — reset timer but don't spawn
      this._monsterTimer = 0;
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
  // Pause
  // ---------------------------------------------------------------------------

  _togglePause() {
    this._paused = !this._paused;

    if (this._paused) {
      this.physics.pause();
      this.sound.pauseAll();
      this._pauseOverlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0.7).setDepth(50);
      this._pauseText = this.add.text(WIDTH / 2, HEIGHT / 2 - 20, 'PAUSED', {
        fontSize: '36px',
        fontFamily: FONT_TITLE,
        color: '#FF9900',
      }).setOrigin(0.5).setDepth(51);
      this._pauseHint = this.add.text(WIDTH / 2, HEIGHT / 2 + 40, 'Press ESC to resume', {
        fontSize: '22px',
        fontFamily: FONT_BODY,
        color: '#CCCCCC',
      }).setOrigin(0.5).setDepth(51);
    } else {
      this.physics.resume();
      this.sound.resumeAll();
      this._pauseOverlay?.destroy();
      this._pauseText?.destroy();
      this._pauseHint?.destroy();
      this._pauseOverlay = null;
    }
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

    // Spawn chip in gap of columns
    if (type === 'column' && Math.random() < CHIP_GAP_CHANCE) {
      const chipMargin = 20;
      const halfGap = gap / 2 - chipMargin;
      const chipY = gapY + Phaser.Math.Between(-halfGap, halfGap);
      const col = new Collectible(this, WIDTH + 60, chipY, speed, theme);
      this._collectibles.push(col);
    }
  }

  _pickObstacleType() {
    const last = this._obstacles[this._obstacles.length - 1];
    if (last && last._type !== OBSTACLE_TYPE.COLUMN) return OBSTACLE_TYPE.COLUMN;
    const roll = Math.random();
    if (roll < 0.55) return OBSTACLE_TYPE.COLUMN;
    if (roll < 0.78) return OBSTACLE_TYPE.MOUNTAIN_TOP;
    return OBSTACLE_TYPE.MOUNTAIN_BOT;
  }

  _spawnMonster(speed) {
    const theme = this._themeManager.theme;

    // Collect ALL gap/safe zones from on-screen obstacles
    const avoidZones = [];
    for (const obs of this._obstacles) {
      if (obs._type === 'column' && obs._hitRects.length >= 2) {
        const topRect = obs._hitRects[0];
        const botRect = obs._hitRects[1];
        avoidZones.push({ minY: topRect.y + topRect.h - 30, maxY: botRect.y + 30 });
      }
      if (obs._type === 'mountain_top' && obs._hitRects.length >= 1) {
        const rect = obs._hitRects[0];
        avoidZones.push({ minY: rect.y + rect.h, maxY: rect.y + rect.h + 80 });
      }
      if (obs._type === 'mountain_bot' && obs._hitRects.length >= 1) {
        const rect = obs._hitRects[0];
        avoidZones.push({ minY: rect.y - 80, maxY: rect.y });
      }
    }

    let avoidZone = null;
    if (avoidZones.length > 0) {
      const minY = Math.min(...avoidZones.map(z => z.minY));
      const maxY = Math.max(...avoidZones.map(z => z.maxY));
      avoidZone = { minY, maxY };
    }

    // ~50% chance to use a face from the pool (if available)
    let faceUrl = null;
    if (this._facePool.length > 0 && Math.random() < 0.5) {
      faceUrl = this._facePool[Math.floor(Math.random() * this._facePool.length)];
    }

    const mon = new GlitchMonster(this, speed * 1.3, 'wavy', theme, avoidZone, faceUrl);
    this._monsters.push(mon);

    // Enemy appear sound
    try { if (this.cache.audio.exists('enemy')) this.sound.play('enemy', { volume: 0.4 }); }
    catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // FX
  // ---------------------------------------------------------------------------

  _spawnCollectFX(col) {
    // Pickup sound
    try { if (this.cache.audio.exists('pickup')) this.sound.play('pickup', { volume: 0.5 }); }
    catch (e) {}

    // Gold ring of particles expanding from the mascot
    const mx = this._mascot.x;
    const my = this._mascot.y;
    const numParticles = 12;

    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2;
      const dot = this.add.circle(mx, my, 5, 0xFFD700, 1).setDepth(20);

      this.tweens.add({
        targets: dot,
        x: mx + Math.cos(angle) * 60,
        y: my + Math.sin(angle) * 60,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 450,
        ease: 'Cubic.easeOut',
        onComplete: () => dot.destroy(),
      });
    }

    // Floating score text
    const txt = this.add.text(mx, my - 30, `+${DATABIT_SCORE}`, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#FFD700',
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
    if (newTheme === THEME.MATRIX) {
      this._bgImage1.setTexture('glitch-bg').setFlipX(false);
      this._bgImage2.setTexture('glitch-bg').setFlipX(true);
    } else {
      this._bgImage1.setTexture('ice-bg').setFlipX(false);
      this._bgImage2.setTexture('ice-bg').setFlipX(true);
    }
    this._particleObjects?.forEach(p => p.destroy());
    this._buildParticles(newTheme);

    // Audio: theme switch handling
    try {
      if (newTheme === THEME.MATRIX) {
        // Transition sound only on first switch
        if (!this._transitionPlayed) {
          this._transitionPlayed = true;
          if (this.cache.audio.exists('transition')) {
            this.sound.play('transition', { volume: 0.5 });
          }
        }

        // Pause snowy hill
        if (this._bgMusic && this._bgMusic.isPlaying) {
          this._bgMusic.pause();
        }

        // Play glitch audio
        this.time.delayedCall(400, () => {
          if (this.cache.audio.exists('glitch') && !this._gameOver) {
            this._glitchSound = this.sound.add('glitch', { volume: 0.3 });
            this._glitchSound.play();
          }
        });

      } else {
        // Back to ice — stop glitch, resume snowy hill
        if (this._glitchSound) {
          this._glitchSound.stop();
          this._glitchSound.destroy();
          this._glitchSound = null;
        }

        if (this._bgMusic && this._bgMusic.isPaused) {
          this._bgMusic.resume();
        }
      }
    } catch (e) {}
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
  // Audio
  // ---------------------------------------------------------------------------

  _setupEndlessAudio() {
    try {
      this._transitionPlayed = false;
      this._glitchSound = null;

      // Start with snowy hill looping
      if (this.cache.audio.exists('snowy-hill')) {
        this._bgMusic = this.sound.add('snowy-hill', { volume: 0.25, loop: true });
        this._bgMusic.play();
      }
    } catch (e) {}
  }

  _stopEndlessAudio() {
    try {
      if (this._bgMusic) { this._bgMusic.stop(); this._bgMusic.destroy(); this._bgMusic = null; }
      if (this._glitchSound) { this._glitchSound.stop(); this._glitchSound.destroy(); this._glitchSound = null; }
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // Game Over
  // ---------------------------------------------------------------------------

  _triggerGameOver() {
    if (this._gameOver) return;
    this._gameOver = true;
    this._mascot.die();
    this.cameras.main.shake(250, 0.01);
    this._stopEndlessAudio();

    this.time.delayedCall(1000, () => {
      this.scene.start('NameInput', { score: this._score });
    });
  }
}
