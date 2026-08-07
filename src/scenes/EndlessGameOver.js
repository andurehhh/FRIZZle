import Phaser from 'phaser';
import { WIDTH, HEIGHT, COLORS } from '../config/constants.js';
import Leaderboard from '../state/leaderboard.js';

/**
 * EndlessGameOver — shown after dying in Endless mode.
 *
 * Displays:
 *   - Player's score
 *   - Leaderboard rank (if they made top 10)
 *   - Top 10 scores table
 *   - Social media follow reminder
 *   - Play Again / Main Menu buttons
 *
 * Receives data: { score: number }
 */
export default class EndlessGameOver extends Phaser.Scene {
  constructor() {
    super({ key: 'EndlessGameOver' });
  }

  init(data) {
    this._score = data.score ?? 0;
  }

  async create() {
    // Background
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0A0A14);

    // --- Save score and get leaderboard ---
    let rank = null;
    let scores = [];

    try {
      rank   = await Leaderboard.addScore('Player', this._score);
      scores = await Leaderboard.getScores();
    } catch (e) {
      console.warn('Leaderboard unavailable:', e);
    }

    // --- Your Score ---
    this.add.text(WIDTH / 2, 50, 'GAME OVER', {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: '#FF3333',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, 115, `YOUR SCORE: ${this._score}`, {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#FF9900',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Rank message
    if (rank !== null) {
      this.add.text(WIDTH / 2, 160, `NEW HIGH SCORE! RANK #${rank}`, {
        fontSize: '22px',
        fontFamily: 'monospace',
        color: '#00FF41',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    } else {
      this.add.text(WIDTH / 2, 160, 'Keep trying for the Top 10!', {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#888888',
      }).setOrigin(0.5);
    }

    // --- Leaderboard Table ---
    this.add.rectangle(WIDTH / 2, 195, 420, 2, COLORS.awsOrange, 0.5);

    this.add.text(WIDTH / 2, 215, 'LEADERBOARD', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#FF9900',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Table header
    const tableX    = WIDTH / 2 - 180;
    const headerY   = 245;
    this.add.text(tableX,       headerY, '#',     { fontSize: '14px', fontFamily: 'monospace', color: '#666666' });
    this.add.text(tableX + 30,  headerY, 'NAME',  { fontSize: '14px', fontFamily: 'monospace', color: '#666666' });
    this.add.text(tableX + 200, headerY, 'SCORE', { fontSize: '14px', fontFamily: 'monospace', color: '#666666' });
    this.add.text(tableX + 290, headerY, 'DATE',  { fontSize: '14px', fontFamily: 'monospace', color: '#666666' });

    // Table rows
    scores.forEach((entry, i) => {
      const rowY   = 270 + i * 28;
      const isMe   = (rank !== null && i === rank - 1);
      const color  = isMe ? '#00FF41' : '#CCCCCC';

      this.add.text(tableX,       rowY, `${i + 1}.`, { fontSize: '15px', fontFamily: 'monospace', color });
      this.add.text(tableX + 30,  rowY, entry.name,   { fontSize: '15px', fontFamily: 'monospace', color });
      this.add.text(tableX + 200, rowY, `${entry.score}`, { fontSize: '15px', fontFamily: 'monospace', color });

      // Format date as HH:MM
      const d = new Date(entry.date);
      const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      this.add.text(tableX + 290, rowY, timeStr, { fontSize: '15px', fontFamily: 'monospace', color: '#666666' });
    });

    // --- Social media prompt ---
    const socialY = Math.max(560, 280 + scores.length * 28 + 30);
    this.add.text(WIDTH / 2, socialY, 'Top 10 wins SWAG! Follow @AWS_SBG to claim!', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#888888',
    }).setOrigin(0.5);

    // --- Buttons ---
    const btnY = socialY + 50;

    const retryBtn = this._makeButton(WIDTH / 2 - 140, btnY, 'PLAY AGAIN', COLORS.awsOrange);
    retryBtn.on('pointerdown', () => this.scene.start('Endless'));

    const menuBtn = this._makeButton(WIDTH / 2 + 140, btnY, 'MAIN MENU', COLORS.iceBlue);
    menuBtn.on('pointerdown', () => this.scene.start('Attract'));

    // Keyboard shortcuts
    this.input.keyboard.once('keydown-R', () => this.scene.start('Endless'));
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('Attract'));

    this.add.text(WIDTH / 2, btnY + 42, 'R — retry  |  ESC — menu', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#444444',
    }).setOrigin(0.5);
  }

  _makeButton(x, y, label, color) {
    const bg = this.add.rectangle(x, y, 200, 50, color, 1)
      .setInteractive({ useHandCursor: true });

    this.add.text(x, y, label, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#232F3E',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    bg.on('pointerover', () => bg.setAlpha(0.85));
    bg.on('pointerout',  () => bg.setAlpha(1));
    bg.on('pointerdown', () => bg.setAlpha(0.65));
    bg.on('pointerup',   () => bg.setAlpha(1));

    return bg;
  }
}
