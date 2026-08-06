import Phaser from 'phaser';
import { OBSTACLE_WIDTH, HEIGHT, COLORS, THEME, DEBUG_HITBOXES, DEBUG_COLORS } from '../config/constants.js';

/**
 * Obstacle types:
 *   'column'        — top + bottom pair with a gap (stalactites / code brackets)
 *   'mountain_top'  — solid mass from the top, player must fly below
 *   'mountain_bot'  — solid mass from the bottom, player must fly above
 *
 * Physics approach: manual AABB rectangle intersection instead of Phaser
 * arcade bodies. This is reliable because we control the rect positions
 * directly — no static-body refresh issues.
 */

export const OBSTACLE_TYPE = {
  COLUMN:       'column',
  MOUNTAIN_TOP: 'mountain_top',
  MOUNTAIN_BOT: 'mountain_bot',
};

export default class Obstacle {
  constructor(scene, x, gapY, gapSize, speed, type = OBSTACLE_TYPE.COLUMN, theme = THEME.ICE, themeConfig = {}) {
    this._scene  = scene;
    this._speed  = speed;
    this._passed = false;
    this._type   = type;
    this._theme  = theme;
    this._x      = x;   // tracks center-x of the obstacle as it scrolls

    this._graphics = []; // visual Graphics objects
    this._hitRects = []; // plain { x, y, w, h } objects — updated each frame

    this._build(x, gapY, gapSize, themeConfig);
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  _build(x, gapY, gapSize, cfg) {
    switch (this._type) {
      case OBSTACLE_TYPE.COLUMN:       this._buildColumn(x, gapY, gapSize, cfg); break;
      case OBSTACLE_TYPE.MOUNTAIN_TOP: this._buildMountainTop(x, cfg);           break;
      case OBSTACLE_TYPE.MOUNTAIN_BOT: this._buildMountainBot(x, cfg);           break;
    }
  }

  // --- Column (stalactites / brackets) ---

  _buildColumn(x, gapY, gapSize, cfg) {
    const halfGap  = gapSize / 2;
    const topH     = gapY - halfGap;           // height of top pipe
    const botY     = gapY + halfGap;           // y where bottom pipe starts
    const botH     = HEIGHT - botY;            // height of bottom pipe
    const color    = cfg.obstacleColor  ?? COLORS.iceBlue;
    const accent   = cfg.obstacleAccent ?? COLORS.awsOrange;

    if (this._theme === THEME.MATRIX) {
      this._drawBracketColumn(x, topH, botY, botH, color, accent);
    } else {
      this._drawIcicleColumn(x, topH, botY, botH, color, accent);
    }

    // Hitboxes:
    // - Width narrower than visual (forgiving on sides)
    // - For icicles: height stops 14px SHORT of the tip so the visible
    //   pointy triangle is purely cosmetic — only the solid block kills you
    // - For brackets: full height since they are rectangular
    const hw      = OBSTACLE_WIDTH * 0.55;
    const tipSafe = this._theme === THEME.MATRIX ? 0 : 14; // px to subtract from tip

    this._hitRects.push({ x: x - hw, y: 0,         w: hw * 2, h: topH - tipSafe });
    this._hitRects.push({ x: x - hw, y: botY + tipSafe, w: hw * 2, h: botH - tipSafe });
  }

  _drawIcicleColumn(x, topH, botY, botH, color, accent) {
    const g  = this._scene.add.graphics();
    const hw = OBSTACLE_WIDTH / 2;

    g.fillStyle(color, 1);
    // Top block
    g.fillRect(x - hw, 0, OBSTACLE_WIDTH, topH - 14);
    // Tip triangle — points down to exactly topH (matches hitbox bottom edge)
    g.fillTriangle(x - hw, topH - 14,  x + hw, topH - 14,  x, topH);

    // Bottom block
    g.fillRect(x - hw, botY + 14, OBSTACLE_WIDTH, botH - 14);
    // Tip triangle — points up to exactly botY (matches hitbox top edge)
    g.fillTriangle(x - hw, botY + 14,  x + hw, botY + 14,  x, botY);

    // Accent stripe
    g.fillStyle(accent, 0.55);
    g.fillRect(x - hw + 5, 0,        7, topH - 14);
    g.fillRect(x - hw + 5, botY + 14, 7, botH - 14);

    this._graphics.push(g);
  }

  _drawBracketColumn(x, topH, botY, botH, color, accent) {
    const g  = this._scene.add.graphics();
    const hw = OBSTACLE_WIDTH / 2;

    // Top bracket
    g.fillStyle(color, 1);
    g.fillRect(x - hw, 0, OBSTACLE_WIDTH, topH);
    // Notch cut giving { shape on the open face
    g.fillStyle(0x000000, 1);
    g.fillRect(x - hw + 8, topH - 20, OBSTACLE_WIDTH - 8, 12);

    // Bottom bracket
    g.fillStyle(color, 1);
    g.fillRect(x - hw, botY, OBSTACLE_WIDTH, botH);
    g.fillStyle(0x000000, 1);
    g.fillRect(x - hw + 8, botY + 8, OBSTACLE_WIDTH - 8, 12);

    // Scanlines
    g.fillStyle(accent, 0.45);
    for (let y = 6; y < topH; y += 16)      g.fillRect(x - hw + 2, y, OBSTACLE_WIDTH - 4, 2);
    for (let y = botY + 6; y < botY + botH; y += 16) g.fillRect(x - hw + 2, y, OBSTACLE_WIDTH - 4, 2);

    this._graphics.push(g);
  }

  // --- Mountains ---

  _buildMountainTop(x, cfg) {
    const color    = cfg.obstacleColor  ?? COLORS.iceBlue;
    const accent   = cfg.obstacleAccent ?? COLORS.awsOrange;
    // Height: 28–50% of screen so there's always reachable space below
    const mountainH = Phaser.Math.Between(HEIGHT * 0.28, HEIGHT * 0.50);
    const g = this._scene.add.graphics();

    if (this._theme === THEME.MATRIX) {
      this._drawDataBlock(g, x, 0, mountainH, color, accent, 'top');
    } else {
      this._drawIcePeak(g, x, 0, mountainH, color, accent, 'top');
    }
    this._graphics.push(g);

    // Hitbox: full-width rectangle, exact height
    const hw = OBSTACLE_WIDTH * 0.7;
    this._hitRects.push({ x: x - hw, y: 0, w: hw * 2, h: mountainH });
  }

  _buildMountainBot(x, cfg) {
    const color    = cfg.obstacleColor  ?? COLORS.iceBlue;
    const accent   = cfg.obstacleAccent ?? COLORS.awsOrange;
    const mountainH = Phaser.Math.Between(HEIGHT * 0.28, HEIGHT * 0.50);
    const startY    = HEIGHT - mountainH;
    const g = this._scene.add.graphics();

    if (this._theme === THEME.MATRIX) {
      this._drawDataBlock(g, x, startY, mountainH, color, accent, 'bot');
    } else {
      this._drawIcePeak(g, x, startY, mountainH, color, accent, 'bot');
    }
    this._graphics.push(g);

    const hw = OBSTACLE_WIDTH * 0.7;
    this._hitRects.push({ x: x - hw, y: startY, w: hw * 2, h: mountainH });
  }

  _drawIcePeak(g, x, startY, height, color, accent, side) {
    const hw = OBSTACLE_WIDTH * 0.65;
    g.fillStyle(color, 1);

    if (side === 'top') {
      g.fillTriangle(x - hw * 1.4, startY,  x + hw * 1.4, startY,  x, startY + height);
      // Sub-peaks for jagged look
      g.fillTriangle(x - hw, startY,  x - hw * 0.3, startY,  x - hw * 0.65, startY + height * 0.6);
      g.fillTriangle(x + hw * 0.3, startY,  x + hw, startY,  x + hw * 0.65, startY + height * 0.65);
    } else {
      g.fillTriangle(x - hw * 1.4, startY + height,  x + hw * 1.4, startY + height,  x, startY);
      g.fillTriangle(x - hw, startY + height,  x - hw * 0.3, startY + height,  x - hw * 0.65, startY + height * 0.4);
      g.fillTriangle(x + hw * 0.3, startY + height,  x + hw, startY + height,  x + hw * 0.65, startY + height * 0.35);
    }

    g.fillStyle(accent, 0.45);
    g.fillRect(x - 3, side === 'top' ? startY : startY + height * 0.7, 6, height * 0.25);
  }

  _drawDataBlock(g, x, startY, height, color, accent, side) {
    const hw = OBSTACLE_WIDTH * 0.65;
    g.fillStyle(color, 1);

    if (side === 'top') {
      g.fillRect(x - hw * 1.2, startY,               hw * 2.4, height * 0.55);
      g.fillRect(x - hw * 0.85, startY + height * 0.55, hw * 1.7, height * 0.28);
      g.fillRect(x - hw * 0.45, startY + height * 0.83, hw * 0.9, height * 0.17);
    } else {
      g.fillRect(x - hw * 1.2, startY + height * 0.45, hw * 2.4, height * 0.55);
      g.fillRect(x - hw * 0.85, startY + height * 0.17, hw * 1.7, height * 0.28);
      g.fillRect(x - hw * 0.45, startY,                 hw * 0.9, height * 0.17);
    }

    g.fillStyle(accent, 0.35);
    for (let y = startY + 3; y < startY + height; y += 12) {
      g.fillRect(x - hw * 1.2 + 2, y, hw * 2.4 - 4, 2);
    }
  }

  // ---------------------------------------------------------------------------
  // Glitch Monster obstacle
  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Move left by one frame's worth of distance.
   * Also shifts all hitRects so collision stays in sync with visuals.
   */
  update() {
    const dx = this._speed / 60;
    this._x -= dx;
    this._graphics.forEach(g => { g.x -= dx; });
    this._hitRects.forEach(r  => { r.x  -= dx; });

    // Debug hitboxes — red for all obstacle types
    if (DEBUG_HITBOXES) {
      if (!this._debugGfx) this._debugGfx = this._scene.add.graphics();
      this._debugGfx.clear();
      this._debugGfx.lineStyle(2, DEBUG_COLORS.OBSTACLE, 0.9);
      this._hitRects.forEach(r => this._debugGfx.strokeRect(r.x, r.y, r.w, r.h));
    }
  }

  /**
   * Manual AABB overlap check against the mascot's bounding rectangle.
   * @param {{ x, y, width, height }} mascotBounds — call mascot.getBounds()
   * @returns {boolean}
   */
  overlaps(mascotBounds) {
    // Shrink mascot bounds slightly for extra forgiveness
    const margin = 6;
    const mx = mascotBounds.x      + margin;
    const my = mascotBounds.y      + margin;
    const mw = mascotBounds.width  - margin * 2;
    const mh = mascotBounds.height - margin * 2;

    return this._hitRects.some(r =>
      mx < r.x + r.w &&
      mx + mw > r.x  &&
      my < r.y + r.h &&
      my + mh > r.y
    );
  }

  isOffscreen() {
    return this._x < -(OBSTACLE_WIDTH + 80);
  }

  checkPassed(mascotX) {
    if (!this._passed && mascotX > this._x + OBSTACLE_WIDTH / 2) {
      this._passed = true;
      return true;
    }
    return false;
  }

  destroy() {
    this._graphics.forEach(g => g.destroy());
    this._debugGfx?.destroy();
  }
}
