import Phaser from 'phaser';
import { DEBUG_HITBOXES, CHIP_COLORS, CHIP_LOGO_SIZE, CHIP_BUBBLE_SIZE } from '../config/constants.js';

/**
 * Collectible — the SBG chip token the player flies through to win a level.
 *
 * Position approach:
 *   The graphics object IS the position — drawn at (0,0) relative to itself,
 *   moved by updating gfx.x / gfx.y directly every frame.
 *   overlaps() reads gfx.x / gfx.y so hitbox always matches the visual.
 */
export default class Collectible {
  constructor(scene, x, y, speed, theme = 'ice') {
    this._scene     = scene;
    this._speed     = speed;
    this._collected = false;
    this._size      = 36;

    // Pick a random color from the chip palette
    this._chipColor = Phaser.Utils.Array.GetRandom(CHIP_COLORS);

    // Use the AWS SBG logo image with color tint instead of drawn graphics
    this._logoImage = scene.add.image(x, y, 'awssbg-logo');
    // Set scale explicitly so tweens operate relative to this base scale
    const baseScale = CHIP_LOGO_SIZE / this._logoImage.width;
    this._logoImage.setScale(baseScale);
    this._logoImage.setTint(this._chipColor);

    // Glow bubble behind the logo for visibility
    this._bubble = scene.add.circle(x, y, CHIP_BUBBLE_SIZE, this._chipColor, 0.25);

    // Keep a gfx reference for position tracking (overlaps check uses _gfx.x/y)
    this._gfx = this._logoImage;

    // Bob tween
    this._tween = scene.tweens.add({
      targets: [this._logoImage, this._bubble],
      y: y + 10,
      duration: 700,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Spin tween — continuous slow rotation
    this._spinTween = scene.tweens.add({
      targets: this._logoImage,
      angle: 360,
      duration: 3000,
      repeat: -1,
      ease: 'Linear',
    });

    // Pulse scale — relative to base scale
    const pulseMax = baseScale * 1.15;
    this._pulseTween = scene.tweens.add({
      targets: [this._logoImage, this._bubble],
      scaleX: { from: baseScale, to: pulseMax },
      scaleY: { from: baseScale, to: pulseMax },
      duration: 500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  update() {
    // Move the logo + bubble
    this._logoImage.x -= this._speed / 60;
    this._bubble.x = this._logoImage.x;
    this._bubble.y = this._logoImage.y;
  }

  /**
   * Overlap check — reads gfx.x / gfx.y which are live world coordinates.
   * Always in sync with the visual regardless of tweens.
   */
  overlaps(mascotBounds) {
    if (this._collected) return false;
    const r  = this._size / 2 - 4; // tight hitbox — must actually fly through it
    const cx = this._gfx.x;
    const cy = this._gfx.y; // includes bob tween offset automatically
    return (
      mascotBounds.x                       < cx + r &&
      mascotBounds.x + mascotBounds.width  > cx - r &&
      mascotBounds.y                       < cy + r &&
      mascotBounds.y + mascotBounds.height > cy - r
    );
  }

  /**
   * Check if this chip would overlap the SOLID parts of any obstacle.
   * For column obstacles: the gap between top and bottom pipe is SAFE (chips can go there).
   * For mountains: the entire rect is solid.
   * Uses a moderate buffer so chips don't visually touch pipe edges.
   */
  overlapsObstacles(obstacles) {
    const buffer = CHIP_BUBBLE_SIZE + 20; // bubble radius + extra clearance
    const cx = this._gfx.x;
    const cy = this._gfx.y;

    return obstacles.some(obs => {
      // Only check obstacles within 200px horizontally
      const obsX = obs._x ?? cx;
      if (Math.abs(cx - obsX) > 200) return false;

      if (obs._type === 'column' && obs._hitRects.length >= 2) {
        // Column: two rects (top pipe and bottom pipe) with a gap between them
        // Chip is ONLY overlapping if it's inside the top or bottom solid rect
        const topRect = obs._hitRects[0];
        const botRect = obs._hitRects[1];

        const inTop = (
          cx < topRect.x + topRect.w + buffer &&
          cx > topRect.x - buffer &&
          cy < topRect.y + topRect.h + buffer &&
          cy > topRect.y - buffer
        );
        const inBot = (
          cx < botRect.x + botRect.w + buffer &&
          cx > botRect.x - buffer &&
          cy < botRect.y + botRect.h + buffer && 
          cy > botRect.y - buffer
        );

        return inTop || inBot;
      } else {
        // Mountains or other: entire rect is solid
        return obs._hitRects.some(rect =>
          cx < rect.x + rect.w + buffer &&
          cx > rect.x - buffer &&
          cy < rect.y + rect.h + buffer &&
          cy > rect.y - buffer
        );
      }
    });
  }

  /** Pop animation + self-removal when collected. */
  collect() {
    if (this._collected) return;
    this._collected = true;
    this._tween?.stop();
    this._pulseTween?.stop();
    this._spinTween?.stop();

    this._scene.tweens.add({
      targets: [this._logoImage, this._bubble],
      scaleX: this._logoImage.scaleX * 2.2,
      scaleY: this._logoImage.scaleY * 2.2,
      alpha: 0,
      duration: 280,
      ease: 'Cubic.easeOut',
      onComplete: () => this.destroy(),
    });
  }

  // Offscreen check uses gfx.x — always current world X
  isOffscreen() { return this._gfx.x < -60; }

  get collected() { return this._collected; }

  destroy() {
    this._tween?.stop();
    this._pulseTween?.stop();
    this._spinTween?.stop();
    this._debugGfx?.destroy();
    this._logoImage?.destroy();
    this._bubble?.destroy();
  }
}
