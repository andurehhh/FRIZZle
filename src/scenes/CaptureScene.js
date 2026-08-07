import Phaser from 'phaser';
import { WIDTH, HEIGHT, COLORS, FONT_TITLE, FONT_BODY } from '../config/constants.js';
import CameraCaptureOverlay from '../ui/camera-capture-overlay.js';
import PhotoPool from '../state/photoPool.js';

/**
 * CaptureScene — camera capture before gameplay.
 *
 * Flow:
 *   1. If a 'player-face' texture already exists (repeat play), offer:
 *      "Use current photo" / "Take new photo" / "No photo"
 *   2. If no existing photo, go straight to camera overlay
 *   3. Stores captured photo in PhotoPool + registers Phaser texture
 *   4. Routes to destination scene (Level1 or Endless)
 *
 * Receives data (optional):
 *   { destination: 'Level1' | 'Endless' }  — where to go after capture
 */
export default class CaptureScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CaptureScene' });
  }

  init(data) {
    this._destination = data?.destination ?? 'Level1';
  }

  create() {
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, COLORS.awsNavy);

    const hasExisting = this.textures.exists('player-face');

    if (hasExisting) {
      this._showChoiceMenu();
    } else {
      this._showPreCameraPrompt();
    }
  }

  // ---------------------------------------------------------------------------
  // Choice menu (when they already have a photo from this session)
  // ---------------------------------------------------------------------------

  _showChoiceMenu() {
    this.add.text(WIDTH / 2, 160, 'YOU ALREADY HAVE A PHOTO', {
      fontSize: '18px',
      fontFamily: FONT_TITLE,
      color: '#FF9900',
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, 220, 'What would you like to do?', {
      fontSize: '24px',
      fontFamily: FONT_BODY,
      color: '#CCCCCC',
    }).setOrigin(0.5);

    // Use current photo
    const useBtn = this._makeButton(WIDTH / 2, 310, 'USE CURRENT PHOTO', COLORS.awsOrange, 320);
    useBtn.on('pointerdown', () => this._proceed());

    // Take new photo
    const newBtn = this._makeButton(WIDTH / 2, 380, 'TAKE NEW PHOTO', 0x00AA44, 320);
    newBtn.on('pointerdown', () => this._openCamera());

    // No photo
    const noBtn = this._makeButton(WIDTH / 2, 450, 'NO PHOTO', 0x444444, 320);
    noBtn.on('pointerdown', () => {
      // Remove existing texture
      if (this.textures.exists('player-face')) {
        this.textures.remove('player-face');
      }
      this.registry.set('hasPlayerFace', false);
      this._proceed();
    });
  }

  // ---------------------------------------------------------------------------
  // Pre-camera prompt (first time)
  // ---------------------------------------------------------------------------

  _showPreCameraPrompt() {
    this.add.text(WIDTH / 2, HEIGHT / 2 - 60, 'GET READY!', {
      fontSize: '32px',
      fontFamily: FONT_TITLE,
      color: '#FF9900',
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, HEIGHT / 2, "Let's take your photo for the game!", {
      fontSize: '24px',
      fontFamily: FONT_BODY,
      color: '#CCCCCC',
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, HEIGHT / 2 + 50, '(or choose NO THANKS on the next screen)', {
      fontSize: '20px',
      fontFamily: FONT_BODY,
      color: '#666666',
    }).setOrigin(0.5);

    // Brief delay then open camera
    this.time.delayedCall(800, () => this._openCamera());
  }

  // ---------------------------------------------------------------------------
  // Camera
  // ---------------------------------------------------------------------------

  async _openCamera() {
    // Check if there's an existing photo in the pool for "use last" option
    let lastPhotoUrl = null;
    try {
      const photos = await PhotoPool.getPhotos();
      if (photos.length > 0) lastPhotoUrl = photos[0].dataUrl;
    } catch (e) {}

    const overlay = new CameraCaptureOverlay({
      hasLastPhoto: !!lastPhotoUrl,
      lastPhotoUrl: lastPhotoUrl,
    });
    let dataUrl = null;

    try {
      dataUrl = await overlay.show();
    } catch (e) {
      console.warn('Camera capture error:', e);
    }

    overlay.destroy();

    // Handle "use last photo" marker
    if (dataUrl === '__USE_LAST__') {
      // Reuse the most recent photo from the pool
      if (lastPhotoUrl) {
        if (this.textures.exists('player-face')) this.textures.remove('player-face');
        const img = new Image();
        img.src = lastPhotoUrl;
        await new Promise(r => { img.onload = r; img.onerror = r; });
        if (img.complete && img.naturalWidth > 0) {
          this.textures.addImage('player-face', img);
        }
        this.registry.set('hasPlayerFace', true);
      }
      this._proceed();
      return;
    }

    if (dataUrl) {
      try {
        await PhotoPool.addPhoto(dataUrl);
      } catch (e) {
        console.warn('PhotoPool store failed:', e);
      }

      if (this.textures.exists('player-face')) this.textures.remove('player-face');
      const img = new Image();
      img.src = dataUrl;
      await new Promise(r => { img.onload = r; img.onerror = r; });
      if (img.complete && img.naturalWidth > 0) {
        this.textures.addImage('player-face', img);
      }
      this.registry.set('hasPlayerFace', true);
    } else {
      this.registry.set('hasPlayerFace', false);
    }

    this._proceed();
  }

  // ---------------------------------------------------------------------------
  // Proceed to gameplay
  // ---------------------------------------------------------------------------

  _proceed() {
    if (this._destination === 'Endless') {
      this.scene.start('Endless');
    } else {
      this.scene.start('LevelTransition', {
        nextLevel: 'Level1',
        levelNumber: 1,
        theme: 'ice',
      });
    }
  }

  // ---------------------------------------------------------------------------

  _makeButton(x, y, label, color, width = 260) {
    const bg = this.add.rectangle(x, y, width, 50, color, 1)
      .setInteractive({ useHandCursor: true });

    this.add.text(x, y, label, {
      fontSize: '12px',
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
