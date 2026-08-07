import Phaser from 'phaser';
import { WIDTH, HEIGHT, COLORS, FONT_TITLE, FONT_BODY } from '../config/constants.js';

/**
 * GameOver — shown when the mascot dies.
 * Receives data from the level scene:
 *   { fromLevel: 'Level1', levelNumber: 1 }
 *
 * Options:
 *   - Try Again → restart the same level
 *   - Main Menu → back to Attract screen
 */
export default class GameOver extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOver' });
  }

  init(data) {
    this._fromLevel   = data.fromLevel   ?? 'Level1';
    this._levelNumber = data.levelNumber ?? 1;
  }

  create() {
    // Dim overlay
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, COLORS.awsNavy, 0.92);

    this.add.text(WIDTH / 2, HEIGHT / 2 - 160, 'GAME OVER', {
      fontSize: '42px',
      fontFamily: FONT_TITLE,
      color: '#FF3333',
    }).setOrigin(0.5);

    // Sub-line
    this.add.text(WIDTH / 2, HEIGHT / 2 - 80, `You crashed on Level ${this._levelNumber}`, {
      fontSize: '24px',
      fontFamily: FONT_BODY,
      color: '#B3E5FC',
    }).setOrigin(0.5);

    // --- Try Again button ---
    const tryAgainBtn = this._makeButton(WIDTH / 2 - 160, HEIGHT / 2 + 40, 'TRY AGAIN', COLORS.awsOrange);
    tryAgainBtn.on('pointerdown', () => {
      this.scene.start(this._fromLevel);
    });

    // --- Main Menu button ---
    const menuBtn = this._makeButton(WIDTH / 2 + 160, HEIGHT / 2 + 40, 'MAIN MENU', COLORS.iceBlue);
    menuBtn.on('pointerdown', () => {
      this.scene.start('Attract');
    });

    // Keyboard shortcut: R = retry, Esc = menu
    this.input.keyboard.once('keydown-R', () => this.scene.start(this._fromLevel));
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('Attract'));

    this.add.text(WIDTH / 2, HEIGHT / 2 + 120, 'R - retry   |   ESC - main menu', {
      fontSize: '20px',
      fontFamily: FONT_BODY,
      color: '#666666',
    }).setOrigin(0.5);
  }

  // ---------------------------------------------------------------------------

  /**
   * Creates a simple clickable text button with a rounded rect background.
   * @param {number} x
   * @param {number} y
   * @param {string} label
   * @param {number} color  - Phaser hex color int
   * @returns {Phaser.GameObjects.Text}
   */
  _makeButton(x, y, label, color) {
    const bg = this.add.rectangle(x, y, 220, 56, color, 1).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontSize: '14px',
      fontFamily: FONT_TITLE,
      color: '#232F3E',
    }).setOrigin(0.5);

    // Hover tint
    bg.on('pointerover',  () => bg.setAlpha(0.8));
    bg.on('pointerout',   () => bg.setAlpha(1));
    bg.on('pointerdown',  () => bg.setAlpha(0.6));
    bg.on('pointerup',    () => bg.setAlpha(1));

    // Forward clicks from the bg object — text just sits on top
    return bg;
  }
}
