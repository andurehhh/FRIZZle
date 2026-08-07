import Phaser from 'phaser';
import { WIDTH, HEIGHT, COLORS, THEME, THEME_CONFIG, FONT_TITLE, FONT_BODY } from '../config/constants.js';

/**
 * Attract — idle/attract screen with mode selector.
 * Two clear buttons: PLAY LEVELS (1-3 + candy) or ENDLESS MODE (leaderboard + swag).
 */
export default class Attract extends Phaser.Scene {
  constructor() {
    super({ key: 'Attract' });
  }

  create() {
    // Background
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, COLORS.awsNavy);
    this.add.rectangle(WIDTH / 2, HEIGHT - 60, WIDTH, 120, 0x1A2530);

    // --- Title ---
    const title = this.add.text(WIDTH / 2, 80, 'FRIZZLE', {
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

    this.add.text(WIDTH / 2, 148, 'FLAPPY GAME', {
      fontSize: '28px',
      fontFamily: FONT_BODY,
      color: '#B3E5FC',
    }).setOrigin(0.5);

    // --- Mode selector ---
    this.add.text(WIDTH / 2, 210, 'SELECT MODE', {
      fontSize: '16px',
      fontFamily: FONT_TITLE,
      color: '#FFFFFF',
    }).setOrigin(0.5);

    // PLAY LEVELS button
    const levelsBtn = this._makeButton(WIDTH / 2, 280, 'PLAY LEVELS', COLORS.awsOrange, 340);
    this.add.text(WIDTH / 2, 318, 'Clear 3 levels - earn candy each one!', {
      fontSize: '20px',
      fontFamily: FONT_BODY,
      color: '#CCCCCC',
    }).setOrigin(0.5);

    levelsBtn.on('pointerdown', () => {
      this.scene.start('CaptureScene', { destination: 'Level1' });
    });

    // ENDLESS MODE button
    const endlessBtn = this._makeButton(WIDTH / 2, 390, 'ENDLESS MODE', 0x00AA44, 340);
    this.add.text(WIDTH / 2, 428, 'Survive as long as you can! Top 10 wins SWAG!', {
      fontSize: '20px',
      fontFamily: FONT_BODY,
      color: '#CCCCCC',
    }).setOrigin(0.5);

    endlessBtn.on('pointerdown', () => {
      this.scene.start('CaptureScene', { destination: 'Endless' });
    });

    // --- Prize info ---
    this.add.rectangle(WIDTH / 2, 480, 500, 2, COLORS.awsOrange, 0.3);

    this.add.text(WIDTH / 2, 510, 'PRIZES', {
      fontSize: '12px',
      fontFamily: FONT_TITLE,
      color: '#FF9900',
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, 545, 'Levels: Candy per clear  |  Endless: Top 10 = Swag!', {
      fontSize: '20px',
      fontFamily: FONT_BODY,
      color: '#888888',
    }).setOrigin(0.5);

    // --- Social media ---
    this.add.text(WIDTH / 2, HEIGHT - 90, 'Like & Follow to claim prizes!', {
      fontSize: '20px',
      fontFamily: FONT_BODY,
      color: '#666666',
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, HEIGHT - 62, '@AWS_SBG', {
      fontSize: '12px',
      fontFamily: FONT_TITLE,
      color: '#FF9900',
    }).setOrigin(0.5);

    // --- Controls hint ---
    this.add.text(WIDTH / 2, HEIGHT - 30, 'SPACE/TAP = flap  |  ESC = pause', {
      fontSize: '18px',
      fontFamily: FONT_BODY,
      color: '#444444',
    }).setOrigin(0.5);

    // --- Background particles ---
    for (let i = 0; i < 10; i++) {
      const flake = this.add.circle(
        Phaser.Math.Between(0, WIDTH / 2), Phaser.Math.Between(0, HEIGHT),
        Phaser.Math.Between(2, 4), COLORS.iceBlue, 0.35
      );
      this.tweens.add({
        targets: flake, y: HEIGHT + 10, x: `+=${Phaser.Math.Between(-30, 30)}`,
        duration: Phaser.Math.Between(4000, 8000), repeat: -1,
        delay: Phaser.Math.Between(0, 4000),
        onRepeat: (_, t) => { t.x = Phaser.Math.Between(0, WIDTH / 2); t.y = -10; },
      });
    }

    for (let i = 0; i < 10; i++) {
      const dot = this.add.rectangle(
        Phaser.Math.Between(WIDTH / 2, WIDTH), Phaser.Math.Between(0, HEIGHT),
        3, 14, COLORS.matrixGreen, 0.4
      );
      this.tweens.add({
        targets: dot, y: HEIGHT + 20,
        duration: Phaser.Math.Between(1800, 4000), repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
        onRepeat: (_, t) => { t.x = Phaser.Math.Between(WIDTH / 2, WIDTH); t.y = -20; },
      });
    }

    // --- Dev shortcuts ---
    this.input.keyboard.on('keydown-ONE',   () => this.scene.start('Level1'));
    this.input.keyboard.on('keydown-TWO',   () => this.scene.start('Level2'));
    this.input.keyboard.on('keydown-THREE', () => this.scene.start('Level3'));
    this.input.keyboard.on('keydown-E',     () => this.scene.start('Endless'));

    this.add.text(12, HEIGHT - 14, 'DEV: 1/2/3 = level  E = endless', {
      fontSize: '14px',
      fontFamily: FONT_BODY,
      color: '#2a2a2a',
    });
  }

  _makeButton(x, y, label, color, width = 260) {
    const bg = this.add.rectangle(x, y, width, 54, color, 1)
      .setInteractive({ useHandCursor: true });

    this.add.text(x, y, label, {
      fontSize: '14px',
      fontFamily: FONT_TITLE,
      color: '#FFFFFF',
    }).setOrigin(0.5);

    bg.on('pointerover', () => bg.setAlpha(0.85));
    bg.on('pointerout',  () => bg.setAlpha(1));
    bg.on('pointerdown', () => bg.setAlpha(0.65));
    bg.on('pointerup',   () => bg.setAlpha(1));

    return bg;
  }
}
