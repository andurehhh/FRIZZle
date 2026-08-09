import Phaser from 'phaser';
import { WIDTH, HEIGHT, COLORS, FONT_TITLE, FONT_BODY } from '../config/constants.js';
import Leaderboard from '../state/leaderboard.js';

/**
 * Attract — title screen.
 * Layout: top 1/3 = title, middle 1/3 = big penguin, bottom 1/3 = text + footer.
 * Share button (left) and Leaderboard button (right) in footer area.
 */
export default class Attract extends Phaser.Scene {
  constructor() {
    super({ key: 'Attract' });
  }

  create() {
    this._modeBoxOpen = false;
    this._leaderboardOpen = false;

    // --- Background ---
    const bg = this.add.image(WIDTH / 2, HEIGHT / 2, 'ice-bg')
      .setDisplaySize(WIDTH, HEIGHT);

    // --- Title BGM ---
    try {
      if (this.cache.audio.exists('title-bgm')) {
        this._titleBgm = this.sound.add('title-bgm', { volume: 0.35, loop: true });
        this._titleBgm.play();
      }
    } catch (e) {}

    // --- Title logo (top 1/3) ---
    this._title = this.add.image(WIDTH / 2, HEIGHT * 0.17, 'title-logo')
      .setDisplaySize(550, 130);

    // --- AWS SBG badge (top-right) ---
    const awsBadge = this.add.image(WIDTH - 80, 30, 'awssbg-logo1').setDisplaySize(36, 36).setTintFill(0xffad5ccf)
      .setInteractive({ useHandCursor: true });
    awsBadge.on('pointerdown', () => window.open('https://www.facebook.com/profile.php?id=61584279257151', '_blank'));
    this.add.text(WIDTH - 80, 55, 'Powered by\nAWS SBG PUP-BC', {
      fontSize: '15px',
      fontFamily: FONT_BODY,
      color: '#555555',
      align: 'center',
    }).setOrigin(0.5, 0);

    // --- Big penguin mascot (middle 1/3) ---
    this._penguin = this.add.image(WIDTH / 2, HEIGHT * 0.47, 'penguin-idle')
      .setDisplaySize(200, 200);

    // Flap animation
    this._flapTimer = this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        const isIdle = this._penguin.texture.key === 'penguin-idle';
        this._penguin.setTexture(isIdle ? 'penguin-up' : 'penguin-idle');
      },
    });

    // Gentle bob
    this.tweens.add({
      targets: this._penguin,
      y: HEIGHT * 0.47 - 10,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // --- Bottom 1/3: tagline + prompt ---
    this._tagline = this.add.text(WIDTH / 2, HEIGHT * 0.70, 'play the game and win prizes', {
      fontSize: '26px',
      fontFamily: FONT_BODY,
      color: '#333333',
    }).setOrigin(0.5);

    this._startPrompt = this.add.text(WIDTH / 2, HEIGHT * 0.77, 'PRESS ANY KEY TO START', {
      fontSize: '14px',
      fontFamily: FONT_TITLE,
      color: '#222222',
    }).setOrigin(0.5);

    this._startPromptBlink = this.tweens.add({
      targets: this._startPrompt,
      alpha: 0.2,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    // --- Footer area ---
    this.add.rectangle(WIDTH / 2, HEIGHT - 35, WIDTH, 70, 0x111820, 0.8);

    // Share button (bottom-left)
    const shareBtn = this.add.image(70, HEIGHT - 35, 'icon-share')
      .setDisplaySize(44, 44)
      .setInteractive({ useHandCursor: true });
    shareBtn.on('pointerdown', () => this._onShare());
    shareBtn.on('pointerover', () => shareBtn.setAlpha(0.7));
    shareBtn.on('pointerout',  () => shareBtn.setAlpha(1));

    // Leaderboard button (bottom-right)
    const lbBtn = this.add.image(WIDTH - 70, HEIGHT - 35, 'icon-leaderboard')
      .setDisplaySize(44, 44)
      .setInteractive({ useHandCursor: true });
    lbBtn.on('pointerdown', () => this._showLeaderboard());
    lbBtn.on('pointerover', () => lbBtn.setAlpha(0.7));
    lbBtn.on('pointerout',  () => lbBtn.setAlpha(1));

    // Footer text
    this.add.text(WIDTH / 2, HEIGHT - 45, 'Like & Follow to claim prizes!  |  @AWS Student Builder Group - PUP Binan', {
      fontSize: '16px',
      fontFamily: FONT_BODY,
      color: '#999999',
    }).setOrigin(0.5);
    this.add.text(WIDTH / 2, HEIGHT - 22, 'SPACE/TAP = flap  |  ESC = pause', {
      fontSize: '14px',
      fontFamily: FONT_BODY,
      color: '#666666',
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, HEIGHT - 5, 'Developed by Andurehhh | Assets by Riyle Lhane Mapanoo', {
      fontSize: '12px',
      fontFamily: FONT_BODY,
      color: '#999999',
    }).setOrigin(0.5);

    // --- Mode selector box (hidden until key press) ---
    this._modeBox = this.add.container(WIDTH / 2, HEIGHT * 0.55).setAlpha(0).setDepth(20);
    this._buildModeBox();

    // --- Leaderboard overlay (hidden) ---
    this._lbContainer = this.add.container(WIDTH / 2, HEIGHT / 2).setAlpha(0).setDepth(30).setVisible(false);

    // --- Input ---
    this.input.keyboard.on('keydown', this._onFirstKey, this);
    this.input.once('pointerdown', () => { if (!this._leaderboardOpen) this._showModeBox(); });

    // Dev shortcuts
    this.input.keyboard.on('keydown-ONE',   () => { this._stopTitleBgm(); this.scene.start('Level1'); });
    this.input.keyboard.on('keydown-TWO',   () => { this._stopTitleBgm(); this.scene.start('Level2'); });
    this.input.keyboard.on('keydown-THREE', () => { this._stopTitleBgm(); this.scene.start('Level3'); });
  }

  // ---------------------------------------------------------------------------
  // Share
  // ---------------------------------------------------------------------------

  _onShare() {
    // Try native Web Share API (works on mobile/kiosk with HTTPS)
    if (navigator.share) {
      navigator.share({
        title: 'Frizzle - Flappy Game',
        text: 'I played Frizzle at the AWS SBG event! Can you beat my score?',
        url: window.location.href,
      }).catch(() => {});
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard?.writeText(window.location.href);
      // Brief visual feedback
      const msg = this.add.text(WIDTH / 2, HEIGHT - 80, 'Link copied!', {
        fontSize: '16px', fontFamily: FONT_BODY, color: '#00FF41',
      }).setOrigin(0.5).setDepth(50);
      this.tweens.add({ targets: msg, alpha: 0, delay: 1500, duration: 500, onComplete: () => msg.destroy() });
    }
  }

  // ---------------------------------------------------------------------------
  // Leaderboard overlay
  // ---------------------------------------------------------------------------

  async _showLeaderboard() {
    if (this._leaderboardOpen) {
      this._hideLeaderboard();
      return;
    }
    this._leaderboardOpen = true;

    const c = this._lbContainer;
    c.removeAll(true);
    c.setVisible(true);

    // Backdrop
    const bg = this.add.rectangle(0, 0, 500, 450, 0x0A0F18, 0.95).setStrokeStyle(2, 0x555555);
    c.add(bg);

    // Title
    c.add(this.add.text(0, -190, 'LEADERBOARD', { fontSize: '16px', fontFamily: FONT_TITLE, color: '#FF9900' }).setOrigin(0.5));

    // Load scores
    let scores = [];
    try { scores = await Leaderboard.getScores(); } catch (e) {}

    if (scores.length === 0) {
      c.add(this.add.text(0, 0, 'No scores yet!', { fontSize: '22px', fontFamily: FONT_BODY, color: '#666666' }).setOrigin(0.5));
    } else {
      // Header
      const hY = -155;
      c.add(this.add.text(-200, hY, '#', { fontSize: '16px', fontFamily: FONT_BODY, color: '#888888' }));
      c.add(this.add.text(-170, hY, 'NAME', { fontSize: '16px', fontFamily: FONT_BODY, color: '#888888' }));
      c.add(this.add.text(50,   hY, 'SCORE', { fontSize: '16px', fontFamily: FONT_BODY, color: '#888888' }));
      c.add(this.add.text(140,  hY, 'DATE', { fontSize: '16px', fontFamily: FONT_BODY, color: '#888888' }));

      scores.forEach((entry, i) => {
        const rowY = -125 + i * 30;
        const color = i < 3 ? '#00FF41' : '#CCCCCC';
        c.add(this.add.text(-200, rowY, `${i + 1}.`, { fontSize: '18px', fontFamily: FONT_BODY, color }));
        const name = entry.name.length > 12 ? entry.name.slice(0, 11) + '.' : entry.name;
        c.add(this.add.text(-170, rowY, name, { fontSize: '18px', fontFamily: FONT_BODY, color }));
        c.add(this.add.text(50,   rowY, `${entry.score}`, { fontSize: '18px', fontFamily: FONT_BODY, color }));
        const d = new Date(entry.date);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const dateStr = `${months[d.getMonth()]} ${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
        c.add(this.add.text(140, rowY, dateStr, { fontSize: '16px', fontFamily: FONT_BODY, color: '#666666' }));
      });
    }

    // Close button
    const closeBtn = this.add.text(0, 195, 'CLOSE', { fontSize: '12px', fontFamily: FONT_TITLE, color: '#FF9900' })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this._hideLeaderboard());
    c.add(closeBtn);

    // Animate in
    this.tweens.add({ targets: c, alpha: 1, duration: 300, ease: 'Cubic.easeOut' });
  }

  _hideLeaderboard() {
    this._leaderboardOpen = false;
    this.tweens.add({
      targets: this._lbContainer,
      alpha: 0,
      duration: 200,
      onComplete: () => this._lbContainer.setVisible(false),
    });
  }

  // ---------------------------------------------------------------------------
  // Mode selector
  // ---------------------------------------------------------------------------

  _onFirstKey(event) {
    if (['1','2','3'].includes(event.key)) return;
    if (event.ctrlKey || event.shiftKey) return;
    if (this._leaderboardOpen) { this._hideLeaderboard(); return; }
    this._showModeBox();
  }

  _showModeBox() {
    if (this._modeBoxOpen) return;
    this._modeBoxOpen = true;

    // Fade out and kill prompt permanently
    this._startPromptBlink?.stop();
    this._startPrompt.setAlpha(0).setVisible(false);
    this._startPrompt.setDepth(0);

    // Slide title up, shrink penguin slightly
    this.tweens.add({ targets: this._title, y: this._title.y - 40, duration: 400, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: this._penguin, y: this._penguin.y - 30, scaleX: 0.8, scaleY: 0.8, duration: 400, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: this._tagline, alpha: 0, duration: 300 });

    // Mode box slides in
    this._modeBox.y = HEIGHT * 0.6 + 30;
    this.tweens.add({
      targets: this._modeBox,
      alpha: 1,
      y: HEIGHT * 0.6 - 10,
      duration: 500,
      ease: 'Back.easeOut',
      delay: 200,
      onComplete: () => this._startBlinkOn(this._levelsBtnBg),
    });
  }

  _buildModeBox() {
    const box = this._modeBox;

    const bg = this.add.rectangle(0, 0, 440, 275, 0x1A2A3A, 0.92).setStrokeStyle(2, 0x555555);
    box.add(bg);

    const modeTitle = this.add.text(0, -82, 'SELECT MODE', { fontSize: '14px', fontFamily: FONT_TITLE, color: '#FFFFFF' }).setOrigin(0.5);
    box.add(modeTitle);

    // LEVEL MODE
    this._levelsBtnBg = this.add.rectangle(0, -25, 300, 48, COLORS.awsOrange).setInteractive({ useHandCursor: true });
    const levelsTxt = this.add.text(0, -25, 'LEVEL MODE', { fontSize: '12px', fontFamily: FONT_TITLE, color: '#FFFFFF' }).setOrigin(0.5);
    const levelsSub = this.add.text(0, 12, 'Clear 3 levels - earn candy!', { fontSize: '18px', fontFamily: FONT_BODY, color: '#AAAAAA' }).setOrigin(0.5);
    box.add([this._levelsBtnBg, levelsTxt, levelsSub]);

    this._levelsBtnBg.on('pointerdown', () => { this._stopTitleBgm(); this.scene.start('CaptureScene', { destination: 'Level1' }); });
    this._levelsBtnBg.on('pointerover', () => this._startBlinkOn(this._levelsBtnBg));
    this._levelsBtnBg.on('pointerout',  () => this._stopBlink(this._levelsBtnBg));

    // ENDLESS MODE
    this._endlessBtnBg = this.add.rectangle(0, 60, 300, 48, 0x00AA44).setInteractive({ useHandCursor: true });
    const endlessTxt = this.add.text(0, 60, 'ENDLESS MODE', { fontSize: '12px', fontFamily: FONT_TITLE, color: '#FFFFFF' }).setOrigin(0.5);
    const endlessSub = this.add.text(0, 97, 'Top 10 wins SWAG!', { fontSize: '18px', fontFamily: FONT_BODY, color: '#AAAAAA' }).setOrigin(0.5);
    box.add([this._endlessBtnBg, endlessTxt, endlessSub]);

    this._endlessBtnBg.on('pointerdown', () => { this._stopTitleBgm(); this.scene.start('CaptureScene', { destination: 'Endless' }); });
    this._endlessBtnBg.on('pointerover', () => this._startBlinkOn(this._endlessBtnBg));
    this._endlessBtnBg.on('pointerout',  () => this._stopBlink(this._endlessBtnBg));

    this.input.keyboard.on('keydown-L', () => { if (this._modeBoxOpen) { this._stopTitleBgm(); this.scene.start('CaptureScene', { destination: 'Level1' }); } });
    this.input.keyboard.on('keydown-E', () => { if (this._modeBoxOpen) { this._stopTitleBgm(); this.scene.start('CaptureScene', { destination: 'Endless' }); } });
  }

  // ---------------------------------------------------------------------------
  // Audio
  // ---------------------------------------------------------------------------

  _stopTitleBgm() {
    try { this._titleBgm?.stop(); this._titleBgm?.destroy(); this._titleBgm = null; } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // Button blink
  // ---------------------------------------------------------------------------

  _startBlinkOn(btn) {
    this._stopBlink(this._levelsBtnBg);
    this._stopBlink(this._endlessBtnBg);
    btn._blinkTween = this.tweens.add({
      targets: btn, alpha: 0.4, duration: 500,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  _stopBlink(btn) {
    if (btn && btn._blinkTween) {
      btn._blinkTween.stop();
      btn._blinkTween = null;
      btn.setAlpha(1);
    }
  }

  shutdown() {
    // Stop title BGM when leaving this scene
    try { this._titleBgm?.stop(); this._titleBgm?.destroy(); } catch (e) {}
    // Also stop all sounds in case anything is lingering
    try { this.sound.stopAll(); } catch (e) {}
  }
}
