import Phaser from 'phaser';
import { COLORS, THEME, DEBUG_HITBOXES } from '../config/constants.js';

/**
 * Collectible — the SBG chip token the player flies through to win a level.
 *
 * Position approach:
 *   The graphics object IS the position — drawn at (0,0) relative to itself,
 *   moved by updating gfx.x / gfx.y directly every frame.
 *   overlaps() reads gfx.x / gfx.y so hitbox always matches the visual.
 */
export default class Collectible {
  constructor(scene, x, y, speed, theme = THEME.ICE) {
    this._scene     = scene;
    this._speed     = speed;
    this._theme     = theme;
    this._collected = false;
    this._size      = 36;

    this._gfx = scene.add.graphics();
    // Position the graphics object at world coords
    this._gfx.x = x;
    this._gfx.y = y;
    // Draw chip centered on (0,0) — gfx.x/y is the world position
    this._draw();

    // Bob tween moves gfx.y up and down — still world Y, just oscillating
    this._bobOffset = 0;
    this._tween = scene.tweens.add({
      targets: this._gfx,
      y: y + 10,
      duration: 700,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Pulse scale
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
    const g        = this._gfx;
    const s        = this._size;
    const hs       = s / 2;
    const isMatrix = this._theme === THEME.MATRIX;

    // Draw centered on (0,0) — gfx.x/y handles world position
    const x = 0;
    const y = 0;

    const bodyColor = COLORS.awsOrange;
    const pinColor  = isMatrix ? 0x00FF41 : COLORS.iceBlue;
    const faceColor = isMatrix ? 0x000000 : 0x232F3E;
    const glowColor = isMatrix ? 0x00FF41 : COLORS.iceBlue;

    g.clear();

    // Glow halo
    g.fillStyle(glowColor, 0.18);
    g.fillCircle(x, y, hs + 14);

    // Pin legs — left
    g.fillStyle(pinColor, 1);
    const pinW = 10, pinH = 5;
    g.fillRect(x - hs - pinW, y - 10, pinW, pinH);
    g.fillRect(x - hs - pinW, y - 1,  pinW, pinH);
    g.fillRect(x - hs - pinW, y + 8,  pinW, pinH);

    // Pin legs — right
    g.fillRect(x + hs, y - 10, pinW, pinH);
    g.fillRect(x + hs, y - 1,  pinW, pinH);
    g.fillRect(x + hs, y + 8,  pinW, pinH);

    // Chip body
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(x - hs, y - hs, s, s, 6);

    // Face inset
    g.fillStyle(faceColor, 0.85);
    g.fillRoundedRect(x - hs + 6, y - hs + 6, s - 12, s - 12, 4);

    // AWS smile arc
    g.lineStyle(2, COLORS.awsOrange, 1);
    g.beginPath();
    g.arc(x, y + 2, 8, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false);
    g.strokePath();

    // Eyes
    g.fillStyle(COLORS.awsOrange, 1);
    g.fillCircle(x - 5, y - 4, 2.5);
    g.fillCircle(x + 5, y - 4, 2.5);

    // SBG pixel label
    g.fillStyle(COLORS.awsOrange, 0.7);
    g.fillRect(x - 8, y + 12, 4, 3);
    g.fillRect(x - 2, y + 12, 4, 3);
    g.fillRect(x + 4, y + 12, 4, 3);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  update() {
    // Move the graphics object itself — gfx.x is always the true world X
    this._gfx.x -= this._speed / 60;
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
   * Check if this chip would visually overlap any obstacle hitRects at spawn time.
   * Uses initial gfx.x / gfx.y since this is called right after construction.
   */
  overlapsObstacles(obstacles) {
    const r  = this._size / 2 + 50; // large buffer — chip must be visually well clear of any obstacle
    const cx = this._gfx.x;
    const cy = this._gfx.y;
    return obstacles.some(obs =>
      obs._hitRects.some(rect =>
        cx - r < rect.x + rect.w &&
        cx + r > rect.x          &&
        cy - r < rect.y + rect.h &&
        cy + r > rect.y
      )
    );
  }

  /** Pop animation + self-removal when collected. */
  collect() {
    if (this._collected) return;
    this._collected = true;
    this._tween?.stop();
    this._pulseTween?.stop();

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

  // Offscreen check uses gfx.x — always current world X
  isOffscreen() { return this._gfx.x < -60; }

  get collected() { return this._collected; }

  destroy() {
    this._tween?.stop();
    this._pulseTween?.stop();
    this._debugGfx?.destroy();
    this._gfx.destroy();
  }
}
