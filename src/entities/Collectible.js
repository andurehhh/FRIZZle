import Phaser from 'phaser';
import { COLORS, THEME } from '../config/constants.js';

/**
 * Collectible — the SBG chip token the player flies through to win a level.
 *
 * Visual (placeholder until real logo PNG is swapped in on Day 7):
 *   A classic IC chip shape drawn with Phaser Graphics:
 *   - Square body in AWS orange
 *   - 3 pin legs on left and right sides
 *   - Small "AWS smile" arc on the face
 *   - Color tinted by theme (orange/ice for ice mode, orange/green for matrix)
 *
 * Collision: manual AABB, same pattern as Obstacle.
 */
export default class Collectible {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x       - spawn x (right edge, will scroll left)
   * @param {number} y       - vertical center of the gap
   * @param {number} speed   - scroll speed px/s (matches current obstacle speed)
   * @param {string} theme   - THEME.ICE or THEME.MATRIX
   */
  constructor(scene, x, y, speed, theme = THEME.ICE) {
    this._scene    = scene;
    this._x        = x;
    this._y        = y;
    this._speed    = speed;
    this._theme    = theme;
    this._collected = false;

    this._size = 36; // chip body side length

    this._gfx = scene.add.graphics();
    this._draw();

    // Gentle bob tween
    this._tween = scene.tweens.add({
      targets: this._gfx,
      y: '+=10',
      duration: 700,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Pulse scale tween
    this._pulseTween = scene.tweens.add({
      targets: this._gfx,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  // ---------------------------------------------------------------------------

  _draw() {
    const g    = this._gfx;
    const s    = this._size;
    const hs   = s / 2;
    const x    = this._x;
    const y    = this._y;
    const isMatrix = this._theme === THEME.MATRIX;

    const bodyColor  = COLORS.awsOrange;
    const pinColor   = isMatrix ? 0x00FF41 : COLORS.iceBlue;
    const faceColor  = isMatrix ? 0x000000 : 0x232F3E;
    const glowColor  = isMatrix ? 0x00FF41 : COLORS.iceBlue;

    g.clear();

    // Glow halo
    g.fillStyle(glowColor, 0.18);
    g.fillCircle(x, y, hs + 14);

    // Pin legs — left side (3 pins)
    g.fillStyle(pinColor, 1);
    const pinW = 10, pinH = 5;
    g.fillRect(x - hs - pinW, y - 10,  pinW, pinH);
    g.fillRect(x - hs - pinW, y - 1,   pinW, pinH);
    g.fillRect(x - hs - pinW, y + 8,   pinW, pinH);

    // Pin legs — right side (3 pins)
    g.fillRect(x + hs,        y - 10,  pinW, pinH);
    g.fillRect(x + hs,        y - 1,   pinW, pinH);
    g.fillRect(x + hs,        y + 8,   pinW, pinH);

    // Chip body
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(x - hs, y - hs, s, s, 6);

    // Chip face — dark square inset
    g.fillStyle(faceColor, 0.85);
    g.fillRoundedRect(x - hs + 6, y - hs + 6, s - 12, s - 12, 4);

    // AWS-style smile / arc (simplified as two lines)
    g.lineStyle(2, COLORS.awsOrange, 1);
    g.beginPath();
    g.arc(x, y + 2, 8, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false);
    g.strokePath();

    // Two small dots for "eyes"
    g.fillStyle(COLORS.awsOrange, 1);
    g.fillCircle(x - 5, y - 4, 2.5);
    g.fillCircle(x + 5, y - 4, 2.5);

    // "SBG" tiny label — rendered as 3 small pixel blocks (no font needed)
    g.fillStyle(COLORS.awsOrange, 0.7);
    g.fillRect(x - 8, y + 12, 4, 3);
    g.fillRect(x - 2, y + 12, 4, 3);
    g.fillRect(x + 4, y + 12, 4, 3);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  update() {
    const dx = this._speed / 60;
    this._x  -= dx;
    this._gfx.x -= dx;
  }

  /**
   * Check if the mascot's bounds overlap this collectible's pickup zone.
   * @param {Phaser.Geom.Rectangle} mascotBounds
   * @returns {boolean}
   */
  overlaps(mascotBounds) {
    if (this._collected) return false;
    const r = this._size / 2 + 8; // pickup radius — slightly larger than visual
    const cx = this._x;
    const cy = this._y + (this._gfx.y - 0); // account for bob tween offset
    return (
      mascotBounds.x < cx + r &&
      mascotBounds.x + mascotBounds.width > cx - r &&
      mascotBounds.y < cy + r &&
      mascotBounds.y + mascotBounds.height > cy - r
    );
  }

  /** Call when collected — plays a pop animation then removes itself. */
  collect() {
    if (this._collected) return;
    this._collected = true;

    this._tween?.stop();
    this._pulseTween?.stop();

    // Pop + fade out
    this._scene.tweens.add({
      targets: this._gfx,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      duration: 280,
      ease: 'Cubic.easeOut',
      onComplete: () => this.destroy(),
    });
  }

  isOffscreen() {
    return this._x < -60;
  }

  get collected() { return this._collected; }

  destroy() {
    this._tween?.stop();
    this._pulseTween?.stop();
    this._gfx.destroy();
  }
}
