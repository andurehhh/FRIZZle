import Phaser from 'phaser';
import { WIDTH, HEIGHT, COLORS, FONT_TITLE, FONT_BODY } from '../config/constants.js';

/**
 * LevelClear3 — congratulations screen after beating Level 3.
 *
 * Shows:
 *   - "ALL LEVELS COMPLETE!" title
 *   - Candy prize reminder
 *   - Option to continue to Endless Mode (for the leaderboard/swag)
 *   - Option to return to main menu
 */
export default class LevelClear3 extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelClear3' });
  }

  create() {
    // Background — celebratory dark with orange tint
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x1A0F00);

    // Confetti-like particles
    for (let i = 0; i < 40; i++) {
      const colors = [COLORS.awsOrange, COLORS.iceBlue, COLORS.matrixGreen, COLORS.white];
      const color = Phaser.Utils.Array.GetRandom(colors);
      const x = Phaser.Math.Between(0, WIDTH);
      const confetti = this.add.rectangle(
        x, -20,
        Phaser.Math.Between(6, 12),
        Phaser.Math.Between(6, 12),
        color, 0.8
      );
      this.tweens.add({
        targets: confetti,
        y: HEIGHT + 30,
        x: x + Phaser.Math.Between(-80, 80),
        angle: Phaser.Math.Between(0, 360),
        duration: Phaser.Math.Between(2000, 4500),
        delay: Phaser.Math.Between(0, 1500),
        ease: 'Cubic.easeIn',
      });
    }

    const title = this.add.text(WIDTH / 2, 140, 'ALL LEVELS COMPLETE!', {
      fontSize: '28px',
      fontFamily: FONT_TITLE,
      color: '#FF9900',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: title,
      scaleX: { from: 0.8, to: 1 },
      scaleY: { from: 0.8, to: 1 },
      duration: 500,
      ease: 'Back.easeOut',
    });

    this.add.text(WIDTH / 2, 230, 'Collect your candy at the booth!', {
      fontSize: '22px',
      fontFamily: FONT_BODY,
      color: '#B3E5FC',
    }).setOrigin(0.5);

    // Divider
    this.add.rectangle(WIDTH / 2, 280, 400, 2, COLORS.awsOrange, 0.5);

    this.add.text(WIDTH / 2, 330, 'Want to compete for SWAG?', {
      fontSize: '12px',
      fontFamily: FONT_TITLE,
      color: '#FFFFFF',
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, 370, 'Top 10 scores on the leaderboard win prizes!', {
      fontSize: '20px',
      fontFamily: FONT_BODY,
      color: '#AAAAAA',
    }).setOrigin(0.5);

    // --- Endless Mode button ---
    const endlessBtn = this._makeButton(WIDTH / 2, 450, 'PLAY ENDLESS MODE', COLORS.awsOrange, 300);
    endlessBtn.on('pointerdown', () => {
      this.scene.start('Endless'); // Endless scene — built on Day 4
    });

    // --- Main Menu button ---
    const menuBtn = this._makeButton(WIDTH / 2, 540, 'MAIN MENU', COLORS.iceBlue, 220);
    menuBtn.on('pointerdown', () => {
      this.scene.start('Attract');
    });

    this.add.text(WIDTH / 2, HEIGHT - 50, 'Follow us to check if you won!', {
      fontSize: '18px',
      fontFamily: FONT_BODY,
      color: '#666666',
    }).setOrigin(0.5);

    // Keyboard shortcuts
    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('Endless'));
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('Attract'));
  }

  _makeButton(x, y, label, color, width = 260) {
    const bg = this.add.rectangle(x, y, width, 56, color, 1)
      .setInteractive({ useHandCursor: true });

    this.add.text(x, y, label, {
      fontSize: '12px',
      fontFamily: FONT_TITLE,
      color: '#232F3E',
    }).setOrigin(0.5);

    bg.on('pointerover', () => bg.setAlpha(0.85));
    bg.on('pointerout',  () => bg.setAlpha(1));
    bg.on('pointerdown', () => bg.setAlpha(0.65));
    bg.on('pointerup',   () => bg.setAlpha(1));

    return bg;
  }
}
