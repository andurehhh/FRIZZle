import Phaser from 'phaser';
import { WIDTH, HEIGHT, COLORS, FONT_TITLE, FONT_BODY } from '../config/constants.js';

/**
 * NameInput — free-type name entry after Endless mode.
 *
 * Player types their name on keyboard (any characters).
 * No character limit — but leaderboard display truncates at 15 chars.
 * Backspace to delete. Enter to confirm (must have 1+ chars).
 * Auto-advances after 20s if idle.
 *
 * Receives: { score: number }
 * Passes to EndlessGameOver: { score, name }
 */
export default class NameInput extends Phaser.Scene {
  constructor() {
    super({ key: 'NameInput' });
  }

  init(data) {
    this._score = data.score ?? 0;
  }

  create() {
    this._name = '';
    this._submitted = false;

    // Background
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0A0A14);

    // Title
    this.add.text(WIDTH / 2, 120, 'ENTER YOUR NAME', {
      fontSize: '28px',
      fontFamily: FONT_TITLE,
      color: '#FF9900',
      padding: { top: 4 },
    }).setOrigin(0.5);

    // Score
    this.add.text(WIDTH / 2, 190, `SCORE: ${this._score}`, {
      fontSize: '28px',
      fontFamily: FONT_BODY,
      color: '#B3E5FC',
    }).setOrigin(0.5);

    // Name display — rendered as typed text with a blinking cursor
    this._nameText = this.add.text(WIDTH / 2, HEIGHT / 2, '', {
      fontSize: '36px',
      fontFamily: FONT_BODY,
      color: '#FFFFFF',
      padding: { top: 4 },
    }).setOrigin(0.5);

    // Blinking cursor character
    this._cursor = this.add.text(WIDTH / 2, HEIGHT / 2, '|', {
      fontSize: '36px',
      fontFamily: FONT_BODY,
      color: '#00FF41',
    }).setOrigin(0, 0.5);

    this.tweens.add({
      targets: this._cursor,
      alpha: 0,
      duration: 450,
      yoyo: true,
      repeat: -1,
    });

    // Input line underline
    this._underline = this.add.rectangle(WIDTH / 2, HEIGHT / 2 + 28, 400, 3, 0x666666);

    // Instructions
    this.add.text(WIDTH / 2, HEIGHT / 2 + 65, 'TYPE YOUR NAME AND PRESS ENTER', {
      fontSize: '22px',
      fontFamily: FONT_BODY,
      color: '#888888',
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, HEIGHT / 2 + 100, 'Use your real name or social handle so we can find you!', {
      fontSize: '20px',
      fontFamily: FONT_BODY,
      color: '#555555',
    }).setOrigin(0.5);

    // Keyboard listener
    this.input.keyboard.on('keydown', this._onKey, this);

    // Auto-advance timeout (20s)
    this._timeout = this.time.delayedCall(20000, () => {
      if (!this._submitted) this._submit();
    });
  }

  _onKey(event) {
    if (this._submitted) return;

    // Enter — confirm
    if (event.keyCode === 13) {
      if (this._name.length > 0) this._submit();
      return;
    }

    // Backspace — delete last char
    if (event.keyCode === 8) {
      if (this._name.length > 0) {
        this._name = this._name.slice(0, -1);
        this._updateDisplay();
      }
      return;
    }

    // Ignore control keys, function keys, etc.
    if (event.key.length !== 1) return;

    // Add character (no hard limit — leaderboard display handles truncation)
    this._name += event.key;
    this._updateDisplay();
  }

  _updateDisplay() {
    this._nameText.setText(this._name);

    // Position cursor at end of text
    const textWidth = this._nameText.width;
    this._cursor.x = WIDTH / 2 + textWidth / 2 + 2;
  }

  _submit() {
    if (this._submitted) return;
    this._submitted = true;
    this._timeout?.remove();

    const name = this._name.length > 0 ? this._name : 'Anonymous';

    // Confirm flash
    this._nameText.setColor('#00FF41');
    this._cursor.setAlpha(0);
    this._underline.setFillStyle(0x00FF41);
    this.cameras.main.flash(200, 0, 255, 65);

    this.time.delayedCall(600, () => {
      this.scene.start('EndlessGameOver', { score: this._score, name });
    });
  }
}
