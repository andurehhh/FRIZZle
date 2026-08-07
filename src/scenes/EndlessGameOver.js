import Phaser from 'phaser';
import { WIDTH, HEIGHT, COLORS, FONT_TITLE, FONT_BODY } from '../config/constants.js';
import Leaderboard from '../state/leaderboard.js';

/**
 * EndlessGameOver — shown after dying in Endless mode.
 *
 * Displays score, leaderboard rank, top 10 table (with date+time),
 * social media prompt, play again / main menu buttons.
 *
 * Receives: { score: number, name: string }
 */
export default class EndlessGameOver extends Phaser.Scene {
  constructor() {
    super({ key: 'EndlessGameOver' });
  }

  init(data) {
    this._score = data.score ?? 0;
    this._name  = data.name  ?? '?????';
  }

  async create() {
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0A0A14);

    let rank = null;
    let scores = [];

    try {
      rank   = await Leaderboard.addScore(this._name, this._score);
      scores = await Leaderboard.getScores();
    } catch (e) {
      console.warn('Leaderboard unavailable:', e);
    }

    // --- Title ---
    this.add.text(WIDTH / 2, 45, 'GAME OVER', {
      fontSize: '32px',
      fontFamily: FONT_TITLE,
      color: '#FF3333',
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, 100, `SCORE: ${this._score}`, {
      fontSize: '22px',
      fontFamily: FONT_TITLE,
      color: '#FF9900',
    }).setOrigin(0.5);

    // Rank
    if (rank !== null) {
      this.add.text(WIDTH / 2, 140, `HIGH SCORE! RANK #${rank}`, {
        fontSize: '14px',
        fontFamily: FONT_TITLE,
        color: '#00FF41',
      }).setOrigin(0.5);
    } else {
      this.add.text(WIDTH / 2, 140, 'Keep trying for Top 10!', {
        fontSize: '22px',
        fontFamily: FONT_BODY,
        color: '#888888',
      }).setOrigin(0.5);
    }

    // --- Leaderboard ---
    this.add.rectangle(WIDTH / 2, 170, 500, 2, COLORS.awsOrange, 0.5);

    this.add.text(WIDTH / 2, 190, 'LEADERBOARD', {
      fontSize: '14px',
      fontFamily: FONT_TITLE,
      color: '#FF9900',
    }).setOrigin(0.5);

    // Table header
    const tableX  = WIDTH / 2 - 240;
    const headerY = 220;
    this.add.text(tableX,       headerY, '#',     { fontSize: '20px', fontFamily: FONT_BODY, color: '#666666' });
    this.add.text(tableX + 35,  headerY, 'NAME',  { fontSize: '20px', fontFamily: FONT_BODY, color: '#666666' });
    this.add.text(tableX + 180, headerY, 'SCORE', { fontSize: '20px', fontFamily: FONT_BODY, color: '#666666' });
    this.add.text(tableX + 300, headerY, 'DATE & TIME', { fontSize: '20px', fontFamily: FONT_BODY, color: '#666666' });

    // Table rows
    scores.forEach((entry, i) => {
      const rowY  = 248 + i * 30;
      const isMe  = (rank !== null && i === rank - 1);
      const color = isMe ? '#00FF41' : '#CCCCCC';

      this.add.text(tableX,       rowY, `${i + 1}.`, { fontSize: '22px', fontFamily: FONT_BODY, color });
      this.add.text(tableX + 35,  rowY, entry.name.length > 15 ? entry.name.slice(0, 14) + '.' : entry.name, { fontSize: '22px', fontFamily: FONT_BODY, color });
      this.add.text(tableX + 180, rowY, `${entry.score}`, { fontSize: '22px', fontFamily: FONT_BODY, color });

      const d = new Date(entry.date);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const dateStr = `${months[d.getMonth()]} ${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
      this.add.text(tableX + 300, rowY, dateStr, { fontSize: '22px', fontFamily: FONT_BODY, color: '#666666' });
    });

    // --- Social media ---
    const socialY = Math.max(570, 260 + scores.length * 30 + 20);
    this.add.text(WIDTH / 2, socialY, 'Top 10 wins SWAG!', {
      fontSize: '11px',
      fontFamily: FONT_TITLE,
      color: '#FF9900',
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, socialY + 30, 'Follow @AWS_SBG to claim!', {
      fontSize: '22px',
      fontFamily: FONT_BODY,
      color: '#888888',
    }).setOrigin(0.5);

    // --- Buttons ---
    const btnY = socialY + 70;

    const retryBtn = this._makeButton(WIDTH / 2 - 150, btnY, 'PLAY AGAIN', COLORS.awsOrange);
    retryBtn.on('pointerdown', () => this.scene.start('Endless'));

    const menuBtn = this._makeButton(WIDTH / 2 + 150, btnY, 'MAIN MENU', COLORS.iceBlue);
    menuBtn.on('pointerdown', () => this.scene.start('Attract'));

    this.input.keyboard.once('keydown-R', () => this.scene.start('Endless'));
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('Attract'));

    this.add.text(WIDTH / 2, btnY + 40, 'R = retry  |  ESC = menu', {
      fontSize: '18px',
      fontFamily: FONT_BODY,
      color: '#444444',
    }).setOrigin(0.5);
  }

  _makeButton(x, y, label, color) {
    const bg = this.add.rectangle(x, y, 220, 48, color, 1)
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
