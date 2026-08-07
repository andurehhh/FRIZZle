import Phaser from 'phaser';
import { WIDTH, HEIGHT, COLORS } from '../config/constants.js';

/**
 * NameInput — retro arcade-style 3-letter name entry after Endless mode.
 *
 * Player types 3 characters on the keyboard (A–Z, 0–9).
 * Backspace to delete. Enter to confirm early (if 1+ chars entered).
 * Auto-submits after 3 characters are typed.
 * Auto-advances after 15 seconds if idle (saves whatever they have, or "???").
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
    this._chars = [];
    this._submitted = false;

    // Background
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0A0A14);

    // Title
    this.add.text(WIDTH / 2, 140, 'ENTER YOUR NAME', {
      fontSize: '42px',
      fontFamily: 'monospace',
      color: '#FF9900',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Score reminder
    this.add.text(WIDTH / 2, 200, `SCORE: ${this._score}`, {
      fontSize: '26px',
      fontFamily: 'monospace',
      color: '#B3E5FC',
    }).setOrigin(0.5);

    // Character slots display
    this._slotText = this.add.text(WIDTH / 2, HEIGHT / 2, '_ _ _', {
      fontSize: '80px',
      fontFamily: 'monospace',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Blinking cursor effect
    this.tweens.add({
      targets: this._slotText,
      alpha: 0.7,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Instructions
    this.add.text(WIDTH / 2, HEIGHT / 2 + 80, 'TYPE 3 LETTERS', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#888888',
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, HEIGHT / 2 + 115, 'BACKSPACE to delete  |  ENTER to confirm', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#555555',
    }).setOrigin(0.5);

    // Keyboard listener — A-Z, 0-9, Backspace, Enter
    this.input.keyboard.on('keydown', this._onKey, this);

    // Auto-advance timeout (15 seconds)
    this._timeout = this.time.delayedCall(15000, () => {
      if (!this._submitted) this._submit();
    });
  }

  _onKey(event) {
    if (this._submitted) return;

    const key = event.key.toUpperCase();

    // Backspace — delete last char
    if (event.keyCode === 8) {
      if (this._chars.length > 0) {
        this._chars.pop();
        this._updateDisplay();
      }
      return;
    }

    // Enter — confirm early if at least 1 char
    if (event.keyCode === 13) {
      if (this._chars.length > 0) {
        this._submit();
      }
      return;
    }

    // Only accept A-Z and 0-9
    if (/^[A-Z0-9]$/.test(key) && this._chars.length < 3) {
      this._chars.push(key);
      this._updateDisplay();

      // Auto-submit on 3rd character
      if (this._chars.length === 3) {
        this.time.delayedCall(300, () => this._submit());
      }
    }
  }

  _updateDisplay() {
    const display = [];
    for (let i = 0; i < 3; i++) {
      display.push(this._chars[i] ?? '_');
    }
    this._slotText.setText(display.join(' '));
  }

  _submit() {
    if (this._submitted) return;
    this._submitted = true;
    this._timeout?.remove();

    const name = this._chars.length > 0 ? this._chars.join('') : '???';

    // Flash confirmation
    this._slotText.setColor('#00FF41');
    this.tweens.killTweensOf(this._slotText);
    this._slotText.setAlpha(1);

    this.cameras.main.flash(200, 0, 255, 65);

    this.time.delayedCall(600, () => {
      this.scene.start('EndlessGameOver', {
        score: this._score,
        name:  name,
      });
    });
  }
}
