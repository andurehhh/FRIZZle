import Phaser from 'phaser';
import { WIDTH, HEIGHT, COLORS, THEME, THEME_CONFIG, FONT_TITLE, FONT_BODY } from '../config/constants.js';

/**
 * Attract — idle/attract screen shown when no one is playing.
 */
export default class Attract extends Phaser.Scene {
  constructor() {
    super({ key: 'Attract' });
  }

  create() {
    // Background
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, COLORS.awsNavy);
    this.add.rectangle(WIDTH / 2, HEIGHT - 80, WIDTH, 160, 0x1A2530);

    // --- Title ---
    const title = this.add.text(WIDTH / 2, 90, 'FRIZZLE', {
      fontSize: '64px',
      fontFamily: FONT_TITLE,
      color: '#FF9900',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: title,
      scaleX: { from: 1, to: 1.03 },
      scaleY: { from: 1, to: 1.03 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(WIDTH / 2, 160, 'FLAPPY GAME', {
      fontSize: '32px',
      fontFamily: FONT_BODY,
      color: '#B3E5FC',
    }).setOrigin(0.5);

    // --- How it works ---
    this.add.text(WIDTH / 2, 220, 'HOW TO PLAY', {
      fontSize: '16px',
      fontFamily: FONT_TITLE,
      color: '#FF9900',
    }).setOrigin(0.5);

    const instructions = [
      'Tap or press SPACE to flap',
      'Dodge obstacles & collect SBG chips',
      'Clear 3 levels - earn candy each level!',
      'Beat Endless Mode - Top 10 wins SWAG',
    ];

    instructions.forEach((line, i) => {
      this.add.text(WIDTH / 2, 260 + i * 34, line, {
        fontSize: '22px',
        fontFamily: FONT_BODY,
        color: '#CCCCCC',
      }).setOrigin(0.5);
    });

    // --- Prize info ---
    this.add.rectangle(WIDTH / 2, 415, 500, 2, COLORS.awsOrange, 0.4);

    this.add.text(WIDTH / 2, 440, 'PRIZES', {
      fontSize: '16px',
      fontFamily: FONT_TITLE,
      color: '#FF9900',
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, 480, 'Each Level Clear = Candy', {
      fontSize: '24px',
      fontFamily: FONT_BODY,
      color: '#B3E5FC',
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, 510, 'Endless Mode Top 10 = Swag!', {
      fontSize: '24px',
      fontFamily: FONT_BODY,
      color: '#00FF41',
    }).setOrigin(0.5);

    // --- Social media ---
    this.add.text(WIDTH / 2, HEIGHT - 105, 'Like & Follow our page to claim prizes!', {
      fontSize: '20px',
      fontFamily: FONT_BODY,
      color: '#888888',
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, HEIGHT - 75, '@AWS_SBG', {
      fontSize: '14px',
      fontFamily: FONT_TITLE,
      color: '#FF9900',
    }).setOrigin(0.5);

    // --- Start prompt ---
    const prompt = this.add.text(WIDTH / 2, HEIGHT - 35, 'TAP ANYWHERE TO START', {
      fontSize: '12px',
      fontFamily: FONT_TITLE,
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

    // --- Background particles ---
    for (let i = 0; i < 12; i++) {
      const flake = this.add.circle(
        Phaser.Math.Between(0, WIDTH / 2), Phaser.Math.Between(0, HEIGHT),
        Phaser.Math.Between(2, 4), COLORS.iceBlue, 0.4
      );
      this.tweens.add({
        targets: flake, y: HEIGHT + 10, x: `+=${Phaser.Math.Between(-30, 30)}`,
        duration: Phaser.Math.Between(4000, 8000), repeat: -1,
        delay: Phaser.Math.Between(0, 4000),
        onRepeat: (_, t) => { t.x = Phaser.Math.Between(0, WIDTH / 2); t.y = -10; },
      });
    }

    for (let i = 0; i < 12; i++) {
      const dot = this.add.rectangle(
        Phaser.Math.Between(WIDTH / 2, WIDTH), Phaser.Math.Between(0, HEIGHT),
        3, 14, COLORS.matrixGreen, 0.45
      );
      this.tweens.add({
        targets: dot, y: HEIGHT + 20,
        duration: Phaser.Math.Between(1800, 4000), repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
        onRepeat: (_, t) => { t.x = Phaser.Math.Between(WIDTH / 2, WIDTH); t.y = -20; },
      });
    }

    // --- Input ---
    this.input.once('pointerdown', () => this._startGame());
    this.input.keyboard.once('keydown-SPACE', () => this._startGame());

    // Dev level select
    this.input.keyboard.on('keydown-ONE',   () => this.scene.start('Level1'));
    this.input.keyboard.on('keydown-TWO',   () => this.scene.start('Level2'));
    this.input.keyboard.on('keydown-THREE', () => this.scene.start('Level3'));
    this.input.keyboard.on('keydown-E',     () => this.scene.start('Endless'));

    this.add.text(12, HEIGHT - 18, 'DEV: 1/2/3 = level  E = endless', {
      fontSize: '16px',
      fontFamily: FONT_BODY,
      color: '#333333',
    });
  }

  _startGame() {
    this.scene.start('CaptureScene');
  }
}
