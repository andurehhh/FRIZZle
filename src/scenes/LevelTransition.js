import Phaser from 'phaser';
import { WIDTH, HEIGHT, THEME, THEME_CONFIG, COLORS, FONT_TITLE, FONT_BODY } from '../config/constants.js';

/**
 * LevelTransition — brief interstitial between levels.
 *
 * Shows "LEVEL X" with a brief intro animation.
 * Level 2+ gets a glitch-out effect before the title appears.
 *
 * Receives data:
 *   { nextLevel: 'Level2', levelNumber: 2, theme: THEME.MATRIX }
 */
export default class LevelTransition extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelTransition' });
  }

  init(data) {
    this._nextLevel   = data.nextLevel   ?? 'Level1';
    this._levelNumber = data.levelNumber ?? 1;
    this._theme       = data.theme       ?? THEME.ICE;
  }

  create() {
    const cfg = THEME_CONFIG[this._theme];

    // Background
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, cfg.bgColor);

    // Accent particles
    for (let i = 0; i < 12; i++) {
      const dot = this.add.rectangle(
        Phaser.Math.Between(0, WIDTH),
        Phaser.Math.Between(0, HEIGHT),
        this._theme === THEME.MATRIX ? 3 : Phaser.Math.Between(3, 5),
        this._theme === THEME.MATRIX ? 14 : Phaser.Math.Between(3, 5),
        cfg.particleColor, 0.4
      );
      this.tweens.add({
        targets: dot,
        y: HEIGHT + 20,
        duration: Phaser.Math.Between(1500, 3500),
        delay: Phaser.Math.Between(0, 800),
        ease: 'Linear',
      });
    }

    // Level 2+ gets a glitch-out effect before showing the title
    if (this._levelNumber >= 2) {
      this._playGlitchIntro(cfg);
    } else {
      this._showTitle();
    }
  }

  /**
   * Glitch-out effect: screen flickers, jitters, then reveals the level title.
   */
  _playGlitchIntro(cfg) {
    const cam = this.cameras.main;

    // Create glitch overlay bars that flash
    const bars = [];
    for (let i = 0; i < 6; i++) {
      const bar = this.add.rectangle(
        WIDTH / 2,
        Phaser.Math.Between(0, HEIGHT),
        WIDTH,
        Phaser.Math.Between(20, 60),
        cfg.accentColor,
        0
      ).setDepth(50);
      bars.push(bar);
    }

    // Static noise rectangles
    const noise = [];
    for (let i = 0; i < 30; i++) {
      const n = this.add.rectangle(
        Phaser.Math.Between(0, WIDTH),
        Phaser.Math.Between(0, HEIGHT),
        Phaser.Math.Between(40, 200),
        Phaser.Math.Between(2, 8),
        Math.random() > 0.5 ? 0xFFFFFF : cfg.accentColor,
        0
      ).setDepth(51);
      noise.push(n);
    }

    // Flicker sequence — 5 rapid flashes over 800ms
    let flickerCount = 0;
    const flickerEvent = this.time.addEvent({
      delay: 130,
      repeat: 5,
      callback: () => {
        flickerCount++;
        const on = flickerCount % 2 === 1;

        // Flash bars
        bars.forEach(bar => {
          bar.setAlpha(on ? Phaser.Math.FloatBetween(0.3, 0.7) : 0);
          bar.y = Phaser.Math.Between(0, HEIGHT);
        });

        // Flash noise
        noise.forEach(n => {
          n.setAlpha(on ? Phaser.Math.FloatBetween(0.2, 0.6) : 0);
          n.x = Phaser.Math.Between(0, WIDTH);
          n.y = Phaser.Math.Between(0, HEIGHT);
        });

        // Camera shake
        if (on) cam.shake(80, 0.008);
      },
    });

    // After glitch sequence, clean up and show title
    this.time.delayedCall(900, () => {
      bars.forEach(b => b.destroy());
      noise.forEach(n => n.destroy());
      this._showTitle();
    });
  }

  _showTitle() {
    // Big level number
    const title = this.add.text(WIDTH / 2, HEIGHT / 2 - 20, `LEVEL ${this._levelNumber}`, {
      fontSize: '64px',
      fontFamily: FONT_TITLE,
      color: '#FF9900',
    }).setOrigin(0.5).setAlpha(0);

    const sub = this.add.text(WIDTH / 2, HEIGHT / 2 + 60, 'GET READY', {
      fontSize: '28px',
      fontFamily: FONT_BODY,
      color: '#FFFFFF',
    }).setOrigin(0.5).setAlpha(0);

    // Animate in
    this.tweens.add({
      targets: title,
      alpha: 1,
      scaleX: { from: 0.5, to: 1 },
      scaleY: { from: 0.5, to: 1 },
      duration: 400,
      ease: 'Back.easeOut',
    });

    this.tweens.add({
      targets: sub,
      alpha: 0.7,
      duration: 400,
      delay: 300,
    });

    // Auto-advance after showing title for 1.8s
    this.time.delayedCall(1800, () => {
      this.scene.start(this._nextLevel);
    });
  }
}
