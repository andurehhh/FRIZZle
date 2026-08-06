import Phaser from 'phaser';
import { WIDTH, HEIGHT, COLORS, THEME, DEBUG_HITBOXES, DEBUG_COLORS } from '../config/constants.js';

/**
 * GlitchMonster — an independent enemy entity, completely separate from obstacles.
 *
 * Spawns off the right edge, moves left on its own timer.
 * Occupies either the TOP lane or BOTTOM lane of the screen.
 * Player must be in the opposite half to avoid it.
 *
 * Lane definitions:
 *   'top' — monster fills y: 0 to laneH. Player must stay BELOW laneH.
 *   'bot' — monster fills y: HEIGHT-laneH to HEIGHT. Player must stay ABOVE.
 *
 * Visuals: Ocho-inspired blocky body, 2 rows of 4 eyes, zigzag mouth,
 *          chromatic ghost offset, alpha flicker glitch effect.
 *
 * pattern:
 *   'straight' — constant left movement (Level 3)
 *   'wavy'     — left movement + gentle vertical oscillation (Endless)
 */
export default class GlitchMonster {
  /**
   * @param {Phaser.Scene} scene
   * @param {'top'|'bot'} lane
   * @param {number} speed   px/s horizontal
   * @param {'straight'|'wavy'} pattern
   * @param {string} theme   THEME.ICE | THEME.MATRIX
   */
  constructor(scene, lane, speed, pattern = 'straight', theme = THEME.MATRIX) {
    this._scene   = scene;
    this._lane    = lane;
    this._speed   = speed;
    this._pattern = pattern;
    this._theme   = theme;
    this._dead    = false;

    // Lane height — 35-45% of screen
    this._laneH = Phaser.Math.Between(HEIGHT * 0.35, HEIGHT * 0.45);

    // World position — gfx.x / gfx.y are the live coords
    const spawnX = WIDTH + 80;
    const spawnY = lane === 'top' ? 0 : HEIGHT - this._laneH;

    // Wavy motion state
    this._time     = Math.random() * Math.PI * 2; // random phase
    this._baseY    = spawnY;
    this._waveAmp  = 18;   // px — subtle, not too aggressive
    this._waveFreq = 0.0018; // radians/ms

    // Build graphics — drawn at (0,0) relative to gfx, gfx.x/y = world pos
    this._gfx = scene.add.graphics();
    this._gfx.x = spawnX;
    this._gfx.y = spawnY;
    this._draw();

    // Glitch flicker timer
    this._flickerTimer = scene.time.addEvent({
      delay: Phaser.Math.Between(250, 600),
      loop: true,
      callback: () => {
        if (this._dead || this._speed === 0) return;
        this._gfx.setAlpha(Phaser.Math.FloatBetween(0.65, 1.0));
        scene.time.delayedCall(65, () => {
          if (!this._dead) this._gfx.setAlpha(1);
        });
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Drawing — all coords relative to (0,0), gfx.x/y = world position
  // ---------------------------------------------------------------------------

  _draw() {
    const g           = this._gfx;
    const isMatrix    = this._theme === THEME.MATRIX;
    const laneH       = this._laneH;
    const bodyW       = 90;   // fixed width — distinct from obstacle widths
    const hw          = bodyW / 2;

    const bodyColor   = isMatrix ? 0x0D0D1A : 0x0A1628;
    const borderColor = isMatrix ? 0x00FF41 : COLORS.iceBlue;
    const eyeColor    = isMatrix ? 0x00FF41 : COLORS.awsOrange;
    const glitchColor = isMatrix ? 0xFF0040 : 0x00FFFF;

    g.clear();

    // Chromatic ghost (offset 4px right and down)
    g.fillStyle(glitchColor, 0.28);
    g.fillRect(-hw + 4, 4, bodyW, laneH);

    // Main body
    g.fillStyle(bodyColor, 1);
    g.fillRect(-hw, 0, bodyW, laneH);

    // Border
    g.lineStyle(3, borderColor, 1);
    g.strokeRect(-hw, 0, bodyW, laneH);

    // Noise texture lines
    g.fillStyle(borderColor, 0.18);
    for (let i = 0; i < 5; i++) {
      const ly = 10 + i * Math.floor(laneH / 6);
      const lw = Phaser.Math.Between(16, bodyW - 10);
      g.fillRect(-hw + 5, ly, lw, 2);
    }

    // Eyes — 2 rows of 4, centered in the body
    const eyeSize   = 7;
    const eyeGapX   = 14;
    const eyeGapY   = 14;
    const eyeStartX = -(eyeGapX * 1.5);
    const eyeStartY = laneH * 0.35;

    g.fillStyle(eyeColor, 1);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        g.fillRect(
          eyeStartX + col * eyeGapX - eyeSize / 2,
          eyeStartY + row * eyeGapY,
          eyeSize, eyeSize
        );
      }
    }

    // Pupils
    g.fillStyle(bodyColor, 0.85);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        g.fillRect(
          eyeStartX + col * eyeGapX - 1,
          eyeStartY + row * eyeGapY + 2,
          2, 2
        );
      }
    }

    // Zigzag mouth — on the leading edge (left side, facing the player)
    const mouthY = laneH * 0.72;
    g.fillStyle(eyeColor, 0.9);
    const zigzag = [0, 3, -2, 4, -1, 2, 0, -2, 3];
    for (let i = 0; i < zigzag.length; i++) {
      g.fillRect(-18 + i * 5, mouthY + zigzag[i], 4, 4);
    }

    // Scanlines
    g.fillStyle(borderColor, 0.1);
    for (let ly = 4; ly < laneH; ly += 10) {
      g.fillRect(-hw + 2, ly, bodyW - 4, 2);
    }

    // Store body dimensions for hitbox
    this._bodyW = bodyW;
    this._bodyH = laneH;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * @param {number} delta ms since last frame
   */
  update(delta) {
    if (this._dead) return;

    this._time += delta;

    // Horizontal movement
    this._gfx.x -= (this._speed / 1000) * delta;

    // Vertical oscillation for wavy pattern
    if (this._pattern === 'wavy') {
      const offset = Math.sin(this._time * this._waveFreq) * this._waveAmp;
      this._gfx.y  = this._baseY + offset;
    }

    // Debug hitbox — magenta
    if (DEBUG_HITBOXES) {
      if (!this._debugGfx) this._debugGfx = this._scene.add.graphics();
      this._debugGfx.clear();
      this._debugGfx.lineStyle(2, DEBUG_COLORS.MONSTER, 0.9);
      const b = this._getBounds();
      this._debugGfx.strokeRect(b.x, b.y, b.w, b.h);
    }
  }

  /** Live world bounds — always accurate because we read gfx.x/y directly. */
  _getBounds() {
    const inset = 8;
    return {
      x: this._gfx.x - this._bodyW / 2 + inset,
      y: this._gfx.y,
      w: this._bodyW - inset * 2,
      h: this._bodyH,
    };
  }

  /**
   * AABB overlap against mascot bounds.
   * @param {Phaser.Geom.Rectangle} mascotBounds
   */
  overlaps(mascotBounds) {
    if (this._dead) return false;
    const b      = this._getBounds();
    const margin = 5; // slight forgiveness
    return (
      mascotBounds.x + margin                    < b.x + b.w &&
      mascotBounds.x + mascotBounds.width - margin > b.x     &&
      mascotBounds.y + margin                    < b.y + b.h &&
      mascotBounds.y + mascotBounds.height - margin > b.y
    );
  }

  isOffscreen() {
    return this._gfx.x < -(this._bodyW / 2 + 20);
  }

  destroy() {
    this._dead = true;
    this._flickerTimer?.remove();
    this._debugGfx?.destroy();
    this._gfx.destroy();
  }
}
