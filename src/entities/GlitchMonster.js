import Phaser from 'phaser';
import { WIDTH, HEIGHT, COLORS, THEME } from '../config/constants.js';

/**
 * GlitchMonster — Ocho-inspired blocky glitch enemy.
 *
 * Visual (placeholder, Day 7 art pass will replace):
 *   - Square pixelated body, slightly offset/glitched
 *   - 4–6 blocky "eyes" arranged in a grid (Ocho style)
 *   - Chromatic-offset duplicate body for glitch effect
 *   - Color scheme matches current theme
 *
 * Movement:
 *   'straight' — moves left at constant speed (Level 3)
 *   'wavy'     — moves left while oscillating vertically (Endless)
 *
 * Spawns at x = WIDTH + 60, random y within safe vertical band.
 * Does NOT spawn at the same time as a pipe/mountain — enforced by the spawner.
 */
export default class GlitchMonster {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} y       - vertical center spawn position
   * @param {number} speed   - horizontal scroll speed px/s
   * @param {'straight'|'wavy'} pattern
   * @param {string} theme   - THEME.ICE or THEME.MATRIX
   */
  constructor(scene, y, speed, pattern = 'straight', theme = THEME.MATRIX) {
    this._scene   = scene;
    this._x       = WIDTH + 60;
    this._y       = y;
    this._speed   = speed;
    this._pattern = pattern;
    this._theme   = theme;
    this._time    = Math.random() * Math.PI * 2; // phase offset so not all in sync
    this._dead    = false;

    // Wavy parameters
    this._waveAmp   = 55;  // px amplitude
    this._waveFreq  = 0.0022; // radians per ms — ~0.9 full cycles per second
    this._baseY     = y;

    this._size = 44; // body side length

    this._gfx = scene.add.graphics();
    this._spawnX = this._x;
    this._spawnY = this._y;
    this._draw();

    // Idle glitch flicker — randomly offsets the ghost layer
    this._glitchTimer = scene.time.addEvent({
      delay: Phaser.Math.Between(300, 700),
      loop: true,
      callback: this._glitchFlicker,
      callbackScope: this,
    });
  }

  // ---------------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------------

  _draw() {
    const g    = this._gfx;
    const s    = this._size;
    const hs   = s / 2;
    const x    = this._x;
    const y    = this._y;
    const isMatrix = this._theme === THEME.MATRIX;

    const bodyColor  = isMatrix ? 0x1A1A2E : 0x1A2744;
    const borderColor = isMatrix ? COLORS.matrixGreen : COLORS.iceBlue;
    const eyeColor   = isMatrix ? COLORS.matrixGreen : COLORS.awsOrange;
    const glitchColor = isMatrix ? 0xFF0040 : 0x00FFFF;

    g.clear();

    // Glitch ghost — chromatic offset duplicate (slightly behind + tinted)
    g.fillStyle(glitchColor, 0.35);
    g.fillRect(x - hs + 4, y - hs - 2, s, s);

    // Main body
    g.fillStyle(bodyColor, 1);
    g.fillRect(x - hs, y - hs, s, s);

    // Border
    g.lineStyle(3, borderColor, 1);
    g.strokeRect(x - hs, y - hs, s, s);

    // Pixel noise lines on body (glitch texture)
    g.fillStyle(borderColor, 0.2);
    for (let i = 0; i < 4; i++) {
      const ly = y - hs + 8 + i * 10;
      const lw = Phaser.Math.Between(10, s - 8);
      g.fillRect(x - hs + 4, ly, lw, 2);
    }

    // Eyes — 2 rows of 3 (Ocho style grid)
    g.fillStyle(eyeColor, 1);
    const eyeSize  = 6;
    const eyeGapX  = 12;
    const eyeGapY  = 11;
    const eyeStartX = x - eyeGapX;
    const eyeStartY = y - eyeGapY / 2 - 4;

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        g.fillRect(
          eyeStartX + col * eyeGapX - eyeSize / 2,
          eyeStartY + row * eyeGapY,
          eyeSize,
          eyeSize
        );
      }
    }

    // Pupil dots (darker center in each eye)
    g.fillStyle(bodyColor, 0.8);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        g.fillRect(
          eyeStartX + col * eyeGapX - 1,
          eyeStartY + row * eyeGapY + 2,
          2,
          2
        );
      }
    }

    // Mouth — jagged pixel line
    g.fillStyle(eyeColor, 0.8);
    const mouthY = y + hs - 12;
    const mouthPx = [0, 2, -1, 3, -2, 1, 0]; // zigzag offsets
    for (let i = 0; i < mouthPx.length; i++) {
      g.fillRect(x - 12 + i * 4, mouthY + mouthPx[i], 3, 3);
    }
  }

  _glitchFlicker() {
    if (this._dead) return;
    // Briefly flash alpha for a glitch jitter feel
    this._gfx.setAlpha(Phaser.Math.FloatBetween(0.6, 1.0));
    this._scene.time.delayedCall(80, () => {
      if (!this._dead) this._gfx.setAlpha(1);
    });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * @param {number} delta - ms since last frame
   */
  update(delta) {
    if (this._dead) return;

    this._time += delta;
    const dx = (this._speed / 1000) * delta;
    this._x -= dx;

    let displayY = this._y;
    if (this._pattern === 'wavy') {
      displayY = this._baseY + Math.sin(this._time * this._waveFreq) * this._waveAmp;
      this._y = displayY;
    }

    // Translate the graphics object — drawn once at spawn position,
    // we shift it by the delta from spawn using x/y offsets
    this._gfx.x = this._x - this._spawnX;
    this._gfx.y = this._y - this._spawnY;
  }

  /**
   * AABB overlap check against mascot bounds.
   * @param {Phaser.Geom.Rectangle} mascotBounds
   */
  overlaps(mascotBounds) {
    if (this._dead) return false;
    const hs = this._size / 2 - 4; // slight forgiveness
    const mx = mascotBounds.x, my = mascotBounds.y;
    const mw = mascotBounds.width, mh = mascotBounds.height;
    return (
      mx < this._x + hs &&
      mx + mw > this._x - hs &&
      my < this._y + hs &&
      my + mh > this._y - hs
    );
  }

  isOffscreen() {
    return this._x < -80;
  }

  destroy() {
    this._dead = true;
    this._glitchTimer?.remove();
    this._gfx.destroy();
  }
}
