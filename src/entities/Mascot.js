import Phaser from 'phaser';
import { GRAVITY, FLAP_VELOCITY, COLORS, MASCOT_BODY_SIZE, MASCOT_FACE_SIZE, MASCOT_FACE_X, MASCOT_FACE_Y } from '../config/constants.js';

/**
 * Mascot — the player character using real penguin sprites.
 *
 * Structure (matching mockup):
 *   - Penguin body sprite (idle/up/down based on velocity)
 *   - Circular face photo on top of the head (if captured)
 *   - Face is slightly overlapping the top of the body — like a hat/head
 *
 * The face photo is already cropped to a circle by the camera overlay,
 * so no mask is needed. It's a child of the container so it rotates
 * and moves perfectly with the body.
 */
export default class Mascot extends Phaser.GameObjects.Container {
  constructor(scene) {
    const startX = 220;
    const startY = 360;
    super(scene, startX, startY);

    // --- Penguin body sprite ---
    this._bodySprite = scene.add.image(0, 12, 'penguin-idle');
    this._bodySprite.setDisplaySize(MASCOT_BODY_SIZE, MASCOT_BODY_SIZE);
    this.add(this._bodySprite);

    // --- Face photo (circular, sits on top of the penguin head) ---
    const hasPhoto = scene.textures.exists('player-face');
    this._hasPhoto = hasPhoto;

    if (hasPhoto) {
      this._faceImage = scene.add.image(MASCOT_FACE_X, MASCOT_FACE_Y, 'player-face');
      this._faceImage.setDisplaySize(MASCOT_FACE_SIZE, MASCOT_FACE_SIZE);
      this.add(this._faceImage);
    }

    scene.add.existing(this);

    // --- Physics ---
    // Hitbox covers only the penguin body, NOT the face photo above
    // Body sprite is at y=12, so offset the hitbox to start at the penguin's head
    scene.physics.world.enable(this);
    this.body.setCollideWorldBounds(false);
    this.body.setGravityY(GRAVITY);
    const hitW = MASCOT_BODY_SIZE * 0.5;
    const hitH = MASCOT_BODY_SIZE * 0.6;
    this.body.setSize(hitW, hitH);
    // Offset so hitbox is centered on the penguin body (which sits at y+12)
    this.body.setOffset(-hitW / 2, -hitH / 2 + 12);

    // --- Input ---
    this._cursors  = scene.input.keyboard.createCursorKeys();
    this._spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    scene.input.on('pointerdown', this._flap, this);

    this._isDead = false;
    this._flapCooldown = 0;

    // --- Audio ---
    // Weighted pool: flap1 and flap2 are common, flap3 is rare
    this._flapSounds = ['flap1', 'flap1', 'flap1', 'flap1','flap1','flap1','flap1', 'flap2', 'flap2', 'flap2', 'flap2', 'flap2', 'flap2', 'flap2', 'flap2', 'flap3'];
    this._deathSounds = ['death1', 'death2'];
    this._flapSoundChance = 0.20; // 1 in 4 flaps plays a sound
  }

  update(time, delta) {
    if (this._isDead) return;

    this._flapCooldown -= delta;

    const flapPressed =
      Phaser.Input.Keyboard.JustDown(this._spaceKey) ||
      Phaser.Input.Keyboard.JustDown(this._cursors.up);

    if (flapPressed) this._flap();

    // Swap sprite frame based on velocity
    const vy = this.body.velocity.y;
    if (vy < -50) {
      this._bodySprite.setTexture('penguin-up');
    } else if (vy > 80) {
      this._bodySprite.setTexture('penguin-down');
    } else {
      this._bodySprite.setTexture('penguin-idle');
    }

    // Rotate slightly to match velocity
    const angle = Phaser.Math.Clamp(vy * 0.04, -20, 45);
    this.setAngle(angle);
  }

  _flap() {
    if (this._isDead) return;
    if (this._flapCooldown > 0) return;
    this.body.setVelocityY(FLAP_VELOCITY);
    this._flapCooldown = 120;

    // Random flap sound — only plays ~25% of the time so it's not annoying
    if (Math.random() < this._flapSoundChance) {
      const key = Phaser.Utils.Array.GetRandom(this._flapSounds);
      try { if (this.scene.cache.audio.exists(key)) this.scene.sound.play(key, { volume: 0.5 }); }
      catch (e) {}
    }
  }

  die() {
    if (this._isDead) return;
    this._isDead = true;
    this.body.setVelocityX(0);
    this._bodySprite.setTint(0xFF3333);

    // Random death sound — always plays
    const key = Phaser.Utils.Array.GetRandom(this._deathSounds);
    try { if (this.scene.cache.audio.exists(key)) this.scene.sound.play(key, { volume: 0.7 }); }
    catch (e) {}
  }

  get isDead() { return this._isDead; }

  /**
   * Returns the hitbox bounds (just the penguin body, not the face photo).
   * Used by obstacle/monster/chip collision checks.
   */
  getHitBounds() {
    return {
      x: this.x + this.body.offset.x,
      y: this.y + this.body.offset.y,
      width: this.body.width,
      height: this.body.height,
    };
  }

  reset() {
    this._isDead = false;
    this.setPosition(220, 360);
    this.setAngle(0);
    this.body.setVelocity(0, 0);
    this._bodySprite.clearTint();
  }
}
