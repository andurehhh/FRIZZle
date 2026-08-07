import Phaser from 'phaser';
import { WIDTH, HEIGHT, COLORS, FONT_TITLE, FONT_BODY } from '../config/constants.js';
import CameraCaptureOverlay from '../ui/camera-capture-overlay.js';
import PhotoPool from '../state/photoPool.js';

/**
 * CaptureScene — shown before Level 1.
 *
 * Flow:
 *   1. Displays a brief "Let's take your photo!" prompt
 *   2. Opens the HTML camera overlay on top of the canvas
 *   3. Player captures or skips
 *   4. If captured: stores in PhotoPool, registers as a Phaser texture ('player-face')
 *   5. Transitions to LevelTransition → Level1
 *
 * The 'player-face' texture key is used by Mascot to draw the face on the sprite.
 * If skipped, no texture is created — Mascot falls back to the placeholder circle.
 */
export default class CaptureScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CaptureScene' });
  }

  create() {
    // Background
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, COLORS.awsNavy);

    // Brief text before opening camera
    this.add.text(WIDTH / 2, HEIGHT / 2 - 40, 'GET READY!', {
      fontSize: '32px',
      fontFamily: FONT_TITLE,
      color: '#FF9900',
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, HEIGHT / 2 + 20, 'Taking your photo for the game...', {
      fontSize: '24px',
      fontFamily: FONT_BODY,
      color: '#CCCCCC',
    }).setOrigin(0.5);

    // Small delay so the scene renders before the overlay blocks it
    this.time.delayedCall(600, () => this._openCamera());
  }

  async _openCamera() {
    const overlay = new CameraCaptureOverlay();
    let dataUrl = null;

    try {
      dataUrl = await overlay.show();
    } catch (e) {
      console.warn('Camera capture error:', e);
    }

    overlay.destroy();

    if (dataUrl) {
      // Store in the photo pool for enemy faces
      try {
        await PhotoPool.addPhoto(dataUrl);
      } catch (e) {
        console.warn('PhotoPool store failed:', e);
      }

      // Register as a Phaser texture so Mascot can use it
      // Load the data URL as an image into the texture manager
      if (this.textures.exists('player-face')) {
        this.textures.remove('player-face');
      }

      // Create an Image element, wait for it to load, then add to Phaser
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve; // continue even if it fails
      });

      if (img.complete && img.naturalWidth > 0) {
        this.textures.addImage('player-face', img);
      }
    }

    // Store a flag so other scenes know if we have a face
    this.registry.set('hasPlayerFace', !!dataUrl);

    // Proceed to Level 1
    this.scene.start('LevelTransition', {
      nextLevel: 'Level1',
      levelNumber: 1,
      theme: 'ice',
    });
  }
}
