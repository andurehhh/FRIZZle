import Phaser from 'phaser';
import { WIDTH, HEIGHT, THEME, THEME_CONFIG } from '../config/constants.js';

/**
 * LevelTransition — brief interstitial screen between levels.
 *
 * Shows "LEVEL X" with the upcoming theme colors as a preview,
 * holds for 2 seconds, then auto-advances to the next level scene.
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

    // Background — incoming theme color
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, cfg.bgColor);

    // Big level number
    const title = this.add.text(WIDTH / 2, HEIGHT / 2 - 40, `LEVEL ${this._levelNumber}`, {
      fontSize: '96px',
      fontFamily: 'monospace',
      color: '#FF9900',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    // Theme hint text
    const themeLabel = this._theme === THEME.ICE ? 'ICE MODE' : 'MATRIX MODE';
    const hint = this.add.text(WIDTH / 2, HEIGHT / 2 + 50, themeLabel, {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: `#${cfg.accentColor.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5).setAlpha(0);

    // Subtext
    const sub = this.add.text(WIDTH / 2, HEIGHT / 2 + 110, 'GET READY...', {
      fontSize: '20px',
      fontFamily: 'monospace',
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
      targets: hint,
      alpha: 1,
      y: hint.y - 10,
      duration: 350,
      delay: 300,
      ease: 'Cubic.easeOut',
    });

    this.tweens.add({
      targets: sub,
      alpha: { from: 0, to: 0.7 },
      duration: 400,
      delay: 600,
      yoyo: true,
      repeat: 1,
    });

    // Accent particles — quick taste of incoming theme
    for (let i = 0; i < 15; i++) {
      const dot = this.add.rectangle(
        Phaser.Math.Between(0, WIDTH),
        Phaser.Math.Between(0, HEIGHT),
        this._theme === THEME.MATRIX ? 3 : Phaser.Math.Between(3, 6),
        this._theme === THEME.MATRIX ? 14 : Phaser.Math.Between(3, 6),
        cfg.particleColor,
        0.5
      );
      this.tweens.add({
        targets: dot,
        y: HEIGHT + 20,
        duration: Phaser.Math.Between(1500, 3500),
        delay: Phaser.Math.Between(0, 800),
        ease: 'Linear',
      });
    }

    // Auto-advance after 2.2 seconds
    this.time.delayedCall(2200, () => {
      this.scene.start(this._nextLevel);
    });
  }
}
