import Phaser from 'phaser';
import { WIDTH, HEIGHT, COLORS, THEME, DEBUG_HITBOXES, DEBUG_COLORS } from '../config/constants.js';

/**
 * GlitchMonster — small pixel-art space invader-style enemy.
 *
 * Visual: blocky invader shape (~40×32):
 *   - Dark rectangular body
 *   - Two tall vertical slit "eyes"
 *   - 4 stubby legs on the bottom
 *   - Chromatic ghost offset for glitch feel
 *
 * Movement: moves LEFT toward the player at a steady pace.
 *   'straight' — constant left (Level 3)
 *   'wavy'     — left + gentle vertical sine wave (Endless)
 *
 * Spawns at random Y, moves independently of obstacles.
 */
export default class GlitchMonster {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} speed
   * @param {'straight'|'wavy'} pattern
   * @param {string} theme
   * @param {object|null} avoidZone
   * @param {string|null} faceDataUrl — if provided, renders a player face on the monster body
   */
  constructor(scene, speed, pattern = 'straight', theme = THEME.MATRIX, avoidZone = null, faceDataUrl = null) {
    this._scene   = scene;
    this._speed   = speed;
    this._pattern = pattern;
    this._theme   = theme;
    this._dead    = false;
    this._faceDataUrl = faceDataUrl;

    // Size — small invader
    this._bodyW = 40;
    this._bodyH = 32;

    // Spawn position — right edge, random Y avoiding the pipe gap zone
    const margin = 60;
    let spawnY;

    if (avoidZone) {
      // avoidZone = { minY, maxY } — the gap area to stay out of
      // Pick either above or below the gap
      const above = Phaser.Math.Between(margin, Math.max(margin, avoidZone.minY - 40));
      const below = Phaser.Math.Between(Math.min(HEIGHT - margin, avoidZone.maxY + 40), HEIGHT - margin);
      spawnY = Math.random() < 0.5 ? above : below;
    } else {
      spawnY = Phaser.Math.Between(margin, HEIGHT - margin);
    }

    this._gfx = scene.add.graphics();
    this._gfx.x = WIDTH + 50;
    this._gfx.y = spawnY;

    // Wavy motion state
    this._time     = Math.random() * Math.PI * 2;
    this._baseY    = spawnY;
    this._waveAmp  = 30;
    this._waveFreq = 0.002;

    this._draw();

    // If a face photo was provided, overlay it on the monster body
    this._faceImage = null;
    if (faceDataUrl) {
      this._loadFace(faceDataUrl);
    }

    // Glitch flicker
    this._flickerTimer = scene.time.addEvent({
      delay: Phaser.Math.Between(400, 900),
      loop: true,
      callback: () => {
        if (this._dead || this._speed === 0) return;
        this._gfx.setAlpha(Phaser.Math.FloatBetween(0.6, 1.0));
        scene.time.delayedCall(70, () => {
          if (!this._dead) this._gfx.setAlpha(1);
        });
      },
    });
  }

  _draw() {
    const g  = this._gfx;
    const bw = this._bodyW;
    const bh = this._bodyH;
    const hw = bw / 2;
    const hh = bh / 2;
    const isMatrix = this._theme === THEME.MATRIX;

    const bodyColor   = 0x111111;
    const ghostColor  = isMatrix ? 0xFF0040 : 0x00FFFF;
    const eyeColor    = isMatrix ? 0x00FF41 : COLORS.awsOrange;
    const legColor    = 0x111111;

    g.clear();

    // Chromatic ghost offset (3px right, 2px down)
    g.fillStyle(ghostColor, 0.3);
    g.fillRect(-hw + 3, -hh + 2, bw, bh - 6);

    // Main body — invader shape (stepped rectangle)
    g.fillStyle(bodyColor, 1);
    // Top narrow section
    g.fillRect(-hw + 6, -hh, bw - 12, 6);
    // Middle wide section (main body)
    g.fillRect(-hw, -hh + 6, bw, bh - 14);
    // Bottom step-in before legs
    g.fillRect(-hw + 4, -hh + bh - 14, bw - 8, 6);

    // Eyes — two tall vertical white/green slits
    g.fillStyle(eyeColor, 1);
    const eyeW = 6;
    const eyeH = 12;
    const eyeY = -hh + 10;
    g.fillRect(-8, eyeY, eyeW, eyeH);  // left eye
    g.fillRect(2,  eyeY, eyeW, eyeH);  // right eye

    // Pupils — dark inner rectangles
    g.fillStyle(bodyColor, 0.9);
    g.fillRect(-6, eyeY + 4, 3, 5);
    g.fillRect(4,  eyeY + 4, 3, 5);

    // Legs — 4 stubby rectangles hanging from bottom
    g.fillStyle(legColor, 1);
    const legW = 5;
    const legH = 8;
    const legY = hh - 8;
    g.fillRect(-hw + 4,       legY, legW, legH);
    g.fillRect(-hw + 12,      legY, legW, legH);
    g.fillRect(hw - 12 - legW, legY, legW, legH);
    g.fillRect(hw - 4 - legW,  legY, legW, legH);

    // Small antenna nubs on top
    g.fillRect(-hw + 8, -hh - 4, 3, 5);
    g.fillRect(hw - 11, -hh - 4, 3, 5);
  }

  // ---------------------------------------------------------------------------
  // Face overlay
  // ---------------------------------------------------------------------------

  /**
   * Load a face data URL and display it on the monster body with a dark glitch tint.
   * Face fills the body area (above the legs) with an inverted/zombie look.
   */
  _loadFace(dataUrl) {
    const key = `monster-face-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const img = new Image();
    img.src = dataUrl;

    img.onload = () => {
      if (this._dead) return;
      try {
        this._scene.textures.addImage(key, img);

        // Face fills the body area (above the legs)
        // Body is 40×32, legs are bottom 8px, so face area = 40×24
        const faceSize = 28; // px — fills most of the body width
        this._faceImage = this._scene.add.image(this._gfx.x, this._gfx.y - 4, key);
        this._faceImage.setDisplaySize(faceSize, faceSize);

        // Dark glitch tint — greenish/inverted zombie robot look
        this._faceImage.setTint(0x44FF66); // green-shifted
        this._faceImage.setAlpha(0.75);    // semi-transparent so body shows through
        // Blend mode for that creepy inverted feel
        this._faceImage.setBlendMode(Phaser.BlendModes.MULTIPLY);

        // Add a dark overlay on top for extra zombie darkness
        this._faceDarkOverlay = this._scene.add.rectangle(
          this._gfx.x, this._gfx.y - 4,
          faceSize, faceSize,
          0x000000, 0.3
        );

        this._faceKey = key;
      } catch (e) {
        // Texture add can fail if scene was destroyed
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  update(delta) {
    if (this._dead) return;

    this._time += delta;

    // Move left toward player
    this._gfx.x -= (this._speed / 1000) * delta;

    // Wavy vertical oscillation
    if (this._pattern === 'wavy') {
      this._gfx.y = this._baseY + Math.sin(this._time * this._waveFreq) * this._waveAmp;
    }

    // Move face image + dark overlay to match monster position
    if (this._faceImage) {
      this._faceImage.x = this._gfx.x;
      this._faceImage.y = this._gfx.y - 4;
    }
    if (this._faceDarkOverlay) {
      this._faceDarkOverlay.x = this._gfx.x;
      this._faceDarkOverlay.y = this._gfx.y - 4;
    }

    // Debug hitbox
    if (DEBUG_HITBOXES) {
      if (!this._debugGfx) this._debugGfx = this._scene.add.graphics();
      this._debugGfx.clear();
      this._debugGfx.lineStyle(2, DEBUG_COLORS.MONSTER, 0.9);
      const b = this._getBounds();
      this._debugGfx.strokeRect(b.x, b.y, b.w, b.h);
    }
  }

  _getBounds() {
    const inset = 4;
    return {
      x: this._gfx.x - this._bodyW / 2 + inset,
      y: this._gfx.y - this._bodyH / 2 + inset,
      w: this._bodyW - inset * 2,
      h: this._bodyH - inset * 2,
    };
  }

  overlaps(mascotBounds) {
    if (this._dead) return false;
    const b      = this._getBounds();
    const margin = 4;
    return (
      mascotBounds.x + margin                     < b.x + b.w &&
      mascotBounds.x + mascotBounds.width - margin > b.x      &&
      mascotBounds.y + margin                     < b.y + b.h &&
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
    this._faceImage?.destroy();
    this._faceDarkOverlay?.destroy();
    this._faceMaskGfx?.destroy();
    if (this._faceKey && this._scene.textures.exists(this._faceKey)) {
      this._scene.textures.remove(this._faceKey);
    }
    this._gfx.destroy();
  }
}
