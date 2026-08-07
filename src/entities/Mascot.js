import Phaser from 'phaser';
import { GRAVITY, FLAP_VELOCITY, COLORS } from '../config/constants.js';

/**
 * Mascot — the player character.
 *
 * Visuals:
 *   - Orange circle body
 *   - Face slot: either the player's captured photo (circular texture)
 *     or a white placeholder circle if no photo was taken
 *   - Eye dot for orientation
 */
export default class Mascot extends Phaser.GameObjects.Container {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    const startX = 220;
    const startY = 360;
    super(scene, startX, startY);

    // --- Visuals ---
    this.body_circle = scene.add.circle(0, 0, 28, COLORS.awsOrange);
    this.add(this.body_circle);

    // Face slot — use captured photo if available, else white placeholder
    const hasPhoto = scene.textures.exists('player-face');

    if (hasPhoto) {
      // Face fills the entire mascot body — photo is already circular from capture
      // No mask needed since the source image is pre-cropped to a circle
      this._faceImage = scene.add.image(0, 0, 'player-face');
      this._faceImage.setDisplaySize(56, 56);
      this.add(this._faceImage);
    } else {
      // Placeholder white circle
      this.face_slot = scene.add.circle(6, -4, 12, COLORS.white);
      this.eye_dot   = scene.add.circle(10, -6, 4, 0x333333);
      this.add([this.face_slot, this.eye_dot]);
    }

    this._hasPhoto = hasPhoto;
    scene.add.existing(this);

    // --- Physics ---
    scene.physics.world.enable(this);
    this.body.setCollideWorldBounds(false);
    this.body.setGravityY(GRAVITY);
    this.body.setSize(44, 44);
    this.body.setOffset(-22, -22);

    // --- Input ---
    this._cursors  = scene.input.keyboard.createCursorKeys();
    this._spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    scene.input.on('pointerdown', this._flap, this);

    this._isDead = false;
    this._flapCooldown = 0;
  }

  /** Called each frame by the active scene. */
  update(time, delta) {
    if (this._isDead) return;

    this._flapCooldown -= delta;

    const flapPressed =
      Phaser.Input.Keyboard.JustDown(this._spaceKey) ||
      Phaser.Input.Keyboard.JustDown(this._cursors.up);

    if (flapPressed) this._flap();

    // Rotate to match velocity
    const angle = Phaser.Math.Clamp(this.body.velocity.y * 0.06, -25, 60);
    this.setAngle(angle);
  }

  _flap() {
    if (this._isDead) return;
    if (this._flapCooldown > 0) return;
    this.body.setVelocityY(FLAP_VELOCITY);
    this._flapCooldown = 120;
  }

  die() {
    if (this._isDead) return;
    this._isDead = true;
    this.body.setVelocityX(0);
    this.body_circle.setFillStyle(0xFF3333);
  }

  get isDead() { return this._isDead; }

  reset() {
    this._isDead = false;
    this.setPosition(220, 360);
    this.setAngle(0);
    this.body.setVelocity(0, 0);
    this.body_circle.setFillStyle(COLORS.awsOrange);
  }
}
