import Phaser from 'phaser';
import Mascot from '../entities/Mascot.js';
import Obstacle, { OBSTACLE_TYPE } from '../entities/Obstacle.js';
import Collectible from '../entities/Collectible.js';
import GlitchMonster from '../entities/GlitchMonster.js';
import ThemeManager from '../systems/ThemeManager.js';
import {
  WIDTH, HEIGHT, COLORS, THEME, THEME_CONFIG,
  OBSTACLE_INTERVAL, FONT_TITLE, FONT_BODY,
  CHIP_GAP_CHANCE, CHIP_FREE_CHANCE,
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
    // Scrolling background: ice-bg or glitch-bg depending on initial theme
    const bgKey = this.initialTheme === THEME.MATRIX ? 'glitch-bg' : 'ice-bg';
    this._bgImage1 = this.add.image(WIDTH / 2, HEIGHT / 2, bgKey)
      .setDisplaySize(WIDTH, HEIGHT).setAlpha(0.8);
    this._bgImage2 = this.add.image(WIDTH + WIDTH / 2, HEIGHT / 2, bgKey)
      .setDisplaySize(WIDTH, HEIGHT)
      .setFlipX(true).setAlpha(0.8);

    this._bg = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT,
      THEME_CONFIG[this.initialTheme].bgColor).setAlpha(0); // keep for theme switch overlay
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
    this._chipSpawnAfterObs = false; // flag: spawn a free chip between obstacles
    this._monsterTimer     = 0;
    this._monsterInterval  = Phaser.Math.Between(4000, 6000);

    // --- Mascot ---
    this._mascot = new Mascot(this);

    // --- HUD ---
    this._levelLabel = this.add.text(WIDTH / 2, 28, `LEVEL ${this.levelNumber}`, {
      fontSize: '14px',
      fontFamily: FONT_TITLE,
      color: '#FF9900',
    }).setOrigin(0.5, 0).setDepth(10);

    // Gem counter
    this._gemText = this.add.text(24, 28,
      `CHIPS: ${this._gemsCollected} / ${this.gemsRequired}`, {
      fontSize: '22px',
      fontFamily: FONT_BODY,
      color: '#FF9900',
    }).setOrigin(0, 0).setDepth(10);

    this._clearLabel = this.add.text(WIDTH / 2, HEIGHT / 2 - 40, '', {
      fontSize: '24px',
      fontFamily: FONT_TITLE,
      color: '#FF9900',
      align: 'center',
    }).setOrigin(0.5).setDepth(10);

    // --- Pause system ---
    this._paused = false;
    this._pauseOverlay = null;
    this._escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // --- Level audio ---
    this._setupLevelAudio();
  }

  _setupLevelAudio() {
    try {
      this._transitionPlayed = false;
      this._glitchSwitchCount = 0;

      // Start snowy hill for ice theme levels, glitch for matrix
      if (this.initialTheme === 'matrix') {
        // Level 2: just play glitch, no transition
        if (this.cache.audio.exists('glitch')) {
          this._bgMusic = this.sound.add('glitch', { volume: 0.3 });
          this._bgMusic.play();
        }
      } else {
        // Ice levels: play snowy hill looping
        if (this.cache.audio.exists('snowy-hill')) {
          this._bgMusic = this.sound.add('snowy-hill', { volume: 0.25, loop: true });
          this._bgMusic.play();
        }
      }
    } catch (e) {}
  }

  update(time, delta) {
    if (this._gameOver || this._levelCleared) return;

    // Pause toggle
    if (Phaser.Input.Keyboard.JustDown(this._escKey)) {
      this._togglePause();
      return;
    }
    if (this._paused) return;

    // Scroll background
    const bgSpeed = this.obstacleSpeed * 0.3; // bg scrolls slower than obstacles (parallax)
    const bgDx = bgSpeed / 60;
    this._bgImage1.x -= bgDx;
    this._bgImage2.x -= bgDx;
    // Reset positions for infinite loop
    if (this._bgImage1.x <= -WIDTH / 2) {
      this._bgImage1.x = this._bgImage2.x + WIDTH;
    }
    if (this._bgImage2.x <= -WIDTH / 2) {
      this._bgImage2.x = this._bgImage1.x + WIDTH;
    }

    // Theme tick
    this._themeManager.update(delta);

    // Mascot
    this._mascot.update(time, delta);

    // Screen-edge kill
    if (this._mascot.y < 0 || this._mascot.y > HEIGHT) {
      this._triggerGameOver();
      return;
    }

    const mascotBounds = this._mascot.getHitBounds();

    // --- Obstacle spawn timer ---
    this._spawnTimer += delta;
    const threshold = this._obstacles.length === 0
      ? this._firstSpawnDelay
      : OBSTACLE_INTERVAL;

    if (this._spawnTimer >= threshold) {
      this._spawnTimer = 0;
      this._spawnObstacle();
      this._chipSpawnAfterObs = true; // arm the mid-point chip spawn
    }

    // Spawn a free chip at the midpoint between two obstacles
    // This guarantees it's in open space (half an interval away from any obstacle)
    if (this._chipSpawnAfterObs && this._spawnTimer >= threshold * 0.5) {
      this._chipSpawnAfterObs = false;
      if (Math.random() < CHIP_FREE_CHANCE) {
        const margin = 80;
        const y = Phaser.Math.Between(margin, HEIGHT - margin);
        const theme = this._themeManager.theme;
        const col = new Collectible(this, WIDTH + 60, y, this.obstacleSpeed, theme);
        this._collectibles.push(col);
      }
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

    // Spawn a chip in the gap of column obstacles
    if (type === 'column' && Math.random() < CHIP_GAP_CHANCE) {
      const chipMargin = 20;
      const halfGap = this.gapSize / 2 - chipMargin;
      const chipY = gapY + Phaser.Math.Between(-halfGap, halfGap);
      const col = new Collectible(this, WIDTH + 60, chipY, this.obstacleSpeed, theme);
      this._collectibles.push(col);
    }
  }

  /**
   * Spawn an independent GlitchMonster — picks top or bottom lane randomly.
   * Completely separate from the obstacle spawn queue.
   */
  _spawnMonster() {
    const speed   = this.obstacleSpeed * 1.4;
    const pattern = this.monsterPattern ?? 'straight';
    const theme   = this._themeManager.theme;

    // Collect ALL gap zones from on-screen column obstacles
    // Monster must avoid ALL of them so the player always has a clear path
    const avoidZones = [];
    for (const obs of this._obstacles) {
      if (obs._type === 'column' && obs._hitRects.length >= 2) {
        const topRect = obs._hitRects[0];
        const botRect = obs._hitRects[1];
        avoidZones.push({
          minY: topRect.y + topRect.h - 30,
          maxY: botRect.y + 30,
        });
      }
    }

    // Also avoid mountains — their passable zone is the opposite half
    for (const obs of this._obstacles) {
      if (obs._type === 'mountain_top' && obs._hitRects.length >= 1) {
        const rect = obs._hitRects[0];
        // Safe zone is below the mountain — avoid that too
        avoidZones.push({ minY: rect.y + rect.h, maxY: rect.y + rect.h + 80 });
      }
      if (obs._type === 'mountain_bot' && obs._hitRects.length >= 1) {
        const rect = obs._hitRects[0];
        // Safe zone is above the mountain
        avoidZones.push({ minY: rect.y - 80, maxY: rect.y });
      }
    }

    // Merge avoid zones into one combined range (take the widest span)
    let avoidZone = null;
    if (avoidZones.length > 0) {
      const minY = Math.min(...avoidZones.map(z => z.minY));
      const maxY = Math.max(...avoidZones.map(z => z.maxY));
      avoidZone = { minY, maxY };
    }

    const mon = new GlitchMonster(this, speed, pattern, theme, avoidZone);
    this._monsters.push(mon);

    // Enemy appear sound
    try { if (this.cache.audio.exists('enemy')) this.sound.play('enemy', { volume: 0.4 }); }
    catch (e) {}
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

    // Pickup sound
    try { if (this.cache.audio.exists('pickup')) this.sound.play('pickup', { volume: 0.5 }); }
    catch (e) {}

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
    // Swap background textures
    if (newTheme === THEME.MATRIX) {
      this._bgImage1.setTexture('glitch-bg').setFlipX(false);
      this._bgImage2.setTexture('glitch-bg').setFlipX(true);
    } else {
      this._bgImage1.setTexture('ice-bg').setFlipX(false);
      this._bgImage2.setTexture('ice-bg').setFlipX(true);
    }
    this._particleObjects?.forEach(p => p.destroy());
    this._buildParticles(newTheme);

    // Audio: handle theme switch
    try {
      this._glitchSwitchCount++;

      if (newTheme === THEME.MATRIX) {
        // Switching TO glitch/matrix
        // Transition sound plays only on the first glitch switch
        if (!this._transitionPlayed) {
          this._transitionPlayed = true;
          if (this.cache.audio.exists('transition')) {
            this.sound.play('transition', { volume: 0.5 });
          }
        }

        // Pause snowy hill (don't destroy — we'll resume it)
        if (this._bgMusic && this._bgMusic.key === 'snowy-hill') {
          this._bgMusic.pause();
        }

        // Play glitch audio after a brief delay
        this.time.delayedCall(400, () => {
          if (this.cache.audio.exists('glitch') && !this._gameOver && !this._levelCleared) {
            this._glitchSound = this.sound.add('glitch', { volume: 0.3 });
            this._glitchSound.play();
          }
        });

      } else {
        // Switching BACK to ice/snow
        // Stop glitch audio
        if (this._glitchSound) {
          this._glitchSound.stop();
          this._glitchSound.destroy();
          this._glitchSound = null;
        }

        // Resume snowy hill from where it was paused
        if (this._bgMusic && this._bgMusic.key === 'snowy-hill' && this._bgMusic.isPaused) {
          this._bgMusic.resume();
        } else if (!this._bgMusic || this._bgMusic.key !== 'snowy-hill') {
          // If snowy hill was never created (shouldn't happen), create it
          if (this.cache.audio.exists('snowy-hill')) {
            this._bgMusic = this.sound.add('snowy-hill', { volume: 0.25, loop: true });
            this._bgMusic.play();
          }
        }
      }
    } catch (e) {}
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

  _stopBgMusic() {
    try {
      if (this._bgMusic) {
        this._bgMusic.stop();
        this._bgMusic.destroy();
        this._bgMusic = null;
      }
      if (this._glitchSound) {
        this._glitchSound.stop();
        this._glitchSound.destroy();
        this._glitchSound = null;
      }
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // Game flow
  // ---------------------------------------------------------------------------

  _triggerGameOver() {
    if (this._gameOver || this._levelCleared) return;
    this._gameOver = true;
    this._mascot.die();
    this.cameras.main.shake(200, 0.008);
    this._stopBgMusic();

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
    this._stopBgMusic();

    // Win sound
    try { if (this.cache.audio.exists('win')) this.sound.play('win', { volume: 0.6 }); }
    catch (e) {}

    // Freeze everything
    this._obstacles.forEach(o => { o._speed = 0; });
    this._collectibles.forEach(c => { c._speed = 0; });
    this._monsters.forEach(m => { m._speed = 0; });

    this._clearLabel.setText(`LEVEL ${this.levelNumber} CLEAR!`);
    this.cameras.main.flash(500, 255, 153, 0);

    this.time.delayedCall(3200, () => {
      // If there's a transition scene to show (levels 1→2, 2→3), route through it
      if (this.nextSceneKey !== 'LevelClear3' && this.nextSceneKey !== 'Endless') {
        this.scene.start('LevelTransition', {
          nextLevel:   this.nextSceneKey,
          levelNumber: this.levelNumber + 1,
          theme:       this.nextTheme ?? THEME.ICE,
        });
      } else {
        this.scene.start(this.nextSceneKey);
      }
    });
  }
}
