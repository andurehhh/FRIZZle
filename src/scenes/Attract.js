import Phaser from 'phaser';
import { WIDTH, HEIGHT, COLORS, FONT_TITLE, FONT_BODY } from '../config/constants.js';

/**
 * Attract — idle screen.
 * "Press any key" → title slides up, mode selector box animates in from below.
 */
export default class Attract extends Phaser.Scene {
  constructor() {
    super({ key: 'Attract' });
  }

  create() {
    this._modeBoxOpen = false;

    // --- Background ---
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, COLORS.awsNavy);
    this._buildParticles();
    this._spawnRoamingCharacters();

    // --- Title (white, snowy) ---
    this._title = this.add.text(WIDTH / 2, HEIGHT / 2 - 100, 'FRIZZLE', {
      fontSize: '72px',
      fontFamily: FONT_TITLE,
      color: '#FFFFFF',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: this._title,
      scaleX: { from: 1, to: 1.02 },
      scaleY: { from: 1, to: 1.02 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // --- Tagline ---
    this._tagline = this.add.text(WIDTH / 2, HEIGHT / 2 - 20, 'Play the game and win prizes!', {
      fontSize: '26px',
      fontFamily: FONT_BODY,
      color: '#B3E5FC',
    }).setOrigin(0.5);

    // --- "Press any key" prompt ---
    this._startPrompt = this.add.text(WIDTH / 2, HEIGHT / 2 + 50, 'PRESS ANY KEY TO START', {
      fontSize: '14px',
      fontFamily: FONT_TITLE,
      color: '#FF9900',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: this._startPrompt,
      alpha: 0.3,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    // --- Footer (full width) ---
    this.add.rectangle(WIDTH / 2, HEIGHT - 30, WIDTH, 60, 0x111820);
    this.add.text(WIDTH / 2, HEIGHT - 38, 'Like & Follow to claim prizes!  |  @AWS_SBG', {
      fontSize: '18px',
      fontFamily: FONT_BODY,
      color: '#666666',
    }).setOrigin(0.5);
    this.add.text(WIDTH / 2, HEIGHT - 14, 'SPACE/TAP = flap  |  ESC = pause', {
      fontSize: '16px',
      fontFamily: FONT_BODY,
      color: '#444444',
    }).setOrigin(0.5);

    // --- Mode selector box (hidden, animates in) ---
    this._modeBox = this.add.container(WIDTH / 2, HEIGHT / 2 + 60).setAlpha(0).setDepth(20);
    this._buildModeBox();

    // --- Input: any key/tap opens mode selector ---
    this.input.keyboard.on('keydown', this._onFirstKey, this);
    this.input.once('pointerdown', () => this._showModeBox());

    // --- Dev shortcuts ---
    this.input.keyboard.on('keydown-ONE',   () => this.scene.start('Level1'));
    this.input.keyboard.on('keydown-TWO',   () => this.scene.start('Level2'));
    this.input.keyboard.on('keydown-THREE', () => this.scene.start('Level3'));

    this.add.text(12, 8, 'DEV: 1/2/3', {
      fontSize: '14px',
      fontFamily: FONT_BODY,
      color: '#222222',
    });
  }

  // ---------------------------------------------------------------------------
  // Mode box show animation
  // ---------------------------------------------------------------------------

  _onFirstKey(event) {
    if (['1','2','3'].includes(event.key)) return;
    if (event.ctrlKey || event.shiftKey) return;
    this._showModeBox();
  }

  _showModeBox() {
    if (this._modeBoxOpen) return;
    this._modeBoxOpen = true;

    // Fade out prompt
    this.tweens.add({ targets: this._startPrompt, alpha: 0, duration: 200 });

    // Slide title + tagline up
    this.tweens.add({
      targets: this._title,
      y: this._title.y - 70,
      duration: 450,
      ease: 'Cubic.easeOut',
    });
    this.tweens.add({
      targets: this._tagline,
      y: this._tagline.y - 70,
      duration: 450,
      ease: 'Cubic.easeOut',
    });

    // Mode box slides up from below and fades in
    this._modeBox.y = HEIGHT / 2 + 100;
    this.tweens.add({
      targets: this._modeBox,
      alpha: 1,
      y: HEIGHT / 2 + 20,
      duration: 500,
      ease: 'Back.easeOut',
      delay: 200,
      onComplete: () => {
        // Start the default blink on Level Mode button
        this._startBlinkOn(this._levelsBtnBg);
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Mode box content
  // ---------------------------------------------------------------------------

  _buildModeBox() {
    const box = this._modeBox;

    // Backdrop — subtle white/grey border, not orange
    const bg = this.add.rectangle(0, 0, 460, 260, 0x0A0F18, 0.95)
      .setStrokeStyle(2, 0x444444);
    box.add(bg);

    // Title
    const modeTitle = this.add.text(0, -100, 'SELECT MODE', {
      fontSize: '14px',
      fontFamily: FONT_TITLE,
      color: '#FFFFFF',
    }).setOrigin(0.5);
    box.add(modeTitle);

    // --- LEVEL MODE button ---
    this._levelsBtnBg = this.add.rectangle(0, -35, 320, 50, COLORS.awsOrange)
      .setInteractive({ useHandCursor: true });
    const levelsTxt = this.add.text(0, -35, 'LEVEL MODE', {
      fontSize: '12px',
      fontFamily: FONT_TITLE,
      color: '#FFFFFF',
    }).setOrigin(0.5);
    box.add([this._levelsBtnBg, levelsTxt]);

    // Subtext — more spacing below button
    const levelsSub = this.add.text(0, 4, 'Clear 3 levels - earn candy!', {
      fontSize: '18px',
      fontFamily: FONT_BODY,
      color: '#AAAAAA',
    }).setOrigin(0.5);
    box.add(levelsSub);

    this._levelsBtnBg.on('pointerdown', () => this.scene.start('CaptureScene', { destination: 'Level1' }));
    this._levelsBtnBg.on('pointerover', () => this._startBlinkOn(this._levelsBtnBg));
    this._levelsBtnBg.on('pointerout',  () => this._stopBlink(this._levelsBtnBg));

    // --- ENDLESS MODE button ---
    this._endlessBtnBg = this.add.rectangle(0, 65, 320, 50, 0x00AA44)
      .setInteractive({ useHandCursor: true });
    const endlessTxt = this.add.text(0, 65, 'ENDLESS MODE', {
      fontSize: '12px',
      fontFamily: FONT_TITLE,
      color: '#FFFFFF',
    }).setOrigin(0.5);
    box.add([this._endlessBtnBg, endlessTxt]);

    // Subtext
    const endlessSub = this.add.text(0, 104, 'Top 10 wins SWAG!', {
      fontSize: '18px',
      fontFamily: FONT_BODY,
      color: '#AAAAAA',
    }).setOrigin(0.5);
    box.add(endlessSub);

    this._endlessBtnBg.on('pointerdown', () => this.scene.start('CaptureScene', { destination: 'Endless' }));
    this._endlessBtnBg.on('pointerover', () => this._startBlinkOn(this._endlessBtnBg));
    this._endlessBtnBg.on('pointerout',  () => this._stopBlink(this._endlessBtnBg));

    // Keyboard shortcuts
    this.input.keyboard.on('keydown-L', () => {
      if (this._modeBoxOpen) this.scene.start('CaptureScene', { destination: 'Level1' });
    });
    this.input.keyboard.on('keydown-E', () => {
      if (this._modeBoxOpen) this.scene.start('CaptureScene', { destination: 'Endless' });
    });
  }

  // ---------------------------------------------------------------------------
  // Button blink effect
  // ---------------------------------------------------------------------------

  _startBlinkOn(btn) {
    // Stop any existing blink on both buttons
    this._stopBlink(this._levelsBtnBg);
    this._stopBlink(this._endlessBtnBg);

    // Start blink tween on this button
    btn._blinkTween = this.tweens.add({
      targets: btn,
      alpha: 0.4,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  _stopBlink(btn) {
    if (btn && btn._blinkTween) {
      btn._blinkTween.stop();
      btn._blinkTween = null;
      btn.setAlpha(1);
    }
  }

  // ---------------------------------------------------------------------------
  // Background characters
  // ---------------------------------------------------------------------------

  _spawnRoamingCharacters() {
    for (let i = 0; i < 3; i++) {
      const mascot = this.add.circle(
        Phaser.Math.Between(0, WIDTH), Phaser.Math.Between(100, HEIGHT - 100),
        18, COLORS.awsOrange, 0.12
      );
      this.tweens.add({
        targets: mascot,
        x: Phaser.Math.Between(0, WIDTH),
        y: Phaser.Math.Between(100, HEIGHT - 100),
        duration: Phaser.Math.Between(6000, 12000),
        repeat: -1, yoyo: true, ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 4000),
      });
    }

    for (let i = 0; i < 2; i++) {
      const enemy = this.add.rectangle(
        Phaser.Math.Between(0, WIDTH), Phaser.Math.Between(100, HEIGHT - 100),
        28, 22, 0x111111, 0.15
      );
      const eye1 = this.add.rectangle(enemy.x - 5, enemy.y - 2, 4, 6, COLORS.matrixGreen, 0.15);
      const eye2 = this.add.rectangle(enemy.x + 5, enemy.y - 2, 4, 6, COLORS.matrixGreen, 0.15);

      this.tweens.add({
        targets: enemy,
        x: Phaser.Math.Between(0, WIDTH),
        y: Phaser.Math.Between(100, HEIGHT - 100),
        duration: Phaser.Math.Between(8000, 15000),
        repeat: -1, yoyo: true, ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(2000, 6000),
        onUpdate: () => {
          eye1.x = enemy.x - 5; eye1.y = enemy.y - 2;
          eye2.x = enemy.x + 5; eye2.y = enemy.y - 2;
        },
      });
    }
  }

  _buildParticles() {
    for (let i = 0; i < 10; i++) {
      const flake = this.add.circle(
        Phaser.Math.Between(0, WIDTH), Phaser.Math.Between(0, HEIGHT),
        Phaser.Math.Between(2, 4), COLORS.iceBlue, 0.3
      );
      this.tweens.add({
        targets: flake, y: HEIGHT + 10, x: `+=${Phaser.Math.Between(-30, 30)}`,
        duration: Phaser.Math.Between(4000, 8000), repeat: -1,
        delay: Phaser.Math.Between(0, 4000),
        onRepeat: (_, t) => { t.x = Phaser.Math.Between(0, WIDTH); t.y = -10; },
      });
    }
    for (let i = 0; i < 8; i++) {
      const dot = this.add.rectangle(
        Phaser.Math.Between(0, WIDTH), Phaser.Math.Between(0, HEIGHT),
        3, 12, COLORS.matrixGreen, 0.3
      );
      this.tweens.add({
        targets: dot, y: HEIGHT + 20,
        duration: Phaser.Math.Between(2000, 4500), repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
        onRepeat: (_, t) => { t.x = Phaser.Math.Between(0, WIDTH); t.y = -20; },
      });
    }
  }
}
