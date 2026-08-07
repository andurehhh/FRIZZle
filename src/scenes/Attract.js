import Phaser from 'phaser';
import { WIDTH, HEIGHT, COLORS, THEME, THEME_CONFIG } from '../config/constants.js';

/**
 * Attract — idle/attract screen shown when no one is playing.
 * Shows game info, prizes, and social media prompt.
 * Tap/click or press SPACE to start.
 */
export default class Attract extends Phaser.Scene {
  constructor() {
    super({ key: 'Attract' });
  }

  create() {
    // Background — split gradient feel: navy top, slightly lighter bottom
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, COLORS.awsNavy);
    this.add.rectangle(WIDTH / 2, HEIGHT - 80, WIDTH, 160, 0x1A2530);

    // --- Title ---
    const title = this.add.text(WIDTH / 2, 100, 'FRIZZLE', {
      fontSize: '88px',
      fontFamily: 'monospace',
      color: '#FF9900',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtle pulse on title
    this.tweens.add({
      targets: title,
      scaleX: { from: 1, to: 1.03 },
      scaleY: { from: 1, to: 1.03 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(WIDTH / 2, 170, 'FLAPPY GAME', {
      fontSize: '30px',
      fontFamily: 'monospace',
      color: '#B3E5FC',
    }).setOrigin(0.5);

    // --- How it works ---
    this.add.text(WIDTH / 2, 240, 'HOW TO PLAY', {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#FF9900',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const instructions = [
      'Tap or press SPACE to flap',
      'Dodge obstacles & collect SBG chips',
      'Clear 3 levels → earn candy each level!',
      'Beat Endless Mode → Top 10 wins SWAG',
    ];

    instructions.forEach((line, i) => {
      this.add.text(WIDTH / 2, 280 + i * 32, line, {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#CCCCCC',
      }).setOrigin(0.5);
    });

    // --- Prize info ---
    this.add.rectangle(WIDTH / 2, 440, 500, 2, COLORS.awsOrange, 0.4);

    this.add.text(WIDTH / 2, 470, 'PRIZES', {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#FF9900',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, 505, 'Each Level Clear = Candy', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#B3E5FC',
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, 535, 'Endless Mode Top 10 = Swag!', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#00FF41',
    }).setOrigin(0.5);

    // --- Social media prompt ---
    this.add.text(WIDTH / 2, HEIGHT - 100, 'Like & Follow our page to claim prizes!', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#888888',
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, HEIGHT - 72, '@AWS_SBG', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#FF9900',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // --- Start prompt ---
    const prompt = this.add.text(WIDTH / 2, HEIGHT - 30, 'TAP ANYWHERE TO START', {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0.3,
      duration: 600,
      ease: 'Linear',
      yoyo: true,
      repeat: -1,
    });

    // --- Background particles — alternating snow + matrix rain ---
    for (let i = 0; i < 15; i++) {
      // Snow flakes (left half)
      const flake = this.add.circle(
        Phaser.Math.Between(0, WIDTH / 2),
        Phaser.Math.Between(0, HEIGHT),
        Phaser.Math.Between(2, 4),
        COLORS.iceBlue, 0.4
      );
      this.tweens.add({
        targets: flake,
        y: HEIGHT + 10,
        x: `+=${Phaser.Math.Between(-30, 30)}`,
        duration: Phaser.Math.Between(4000, 8000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 4000),
        onRepeat: (_, t) => { t.x = Phaser.Math.Between(0, WIDTH / 2); t.y = -10; },
      });
    }

    for (let i = 0; i < 15; i++) {
      // Matrix rain (right half)
      const dot = this.add.rectangle(
        Phaser.Math.Between(WIDTH / 2, WIDTH),
        Phaser.Math.Between(0, HEIGHT),
        3, 14, COLORS.matrixGreen, 0.45
      );
      this.tweens.add({
        targets: dot,
        y: HEIGHT + 20,
        duration: Phaser.Math.Between(1800, 4000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
        onRepeat: (_, t) => { t.x = Phaser.Math.Between(WIDTH / 2, WIDTH); t.y = -20; },
      });
    }

    // --- Input ---
    this.input.once('pointerdown', () => this._startGame());
    this.input.keyboard.once('keydown-SPACE', () => this._startGame());
  }

  _startGame() {
    // Go to Level 1 transition
    this.scene.start('LevelTransition', {
      nextLevel:   'Level1',
      levelNumber: 1,
      theme:       'ice',
    });
  }
}
