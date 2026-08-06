import Phaser from 'phaser';
import { THEME, THEME_CONFIG, THEME_SWITCH_INTERVAL } from '../config/constants.js';

/**
 * ThemeManager — tracks the current visual theme (ice vs matrix) and
 * handles the glitch transition effect between switches.
 *
 * Usage in a scene:
 *   this._themeManager = new ThemeManager(this, THEME.ICE, { alternates: true });
 *   // in update():
 *   this._themeManager.update(delta);
 *   // listen for theme changes:
 *   this._themeManager.on('themechange', (newTheme) => { ... });
 */
export default class ThemeManager extends Phaser.Events.EventEmitter {
  /**
   * @param {Phaser.Scene} scene
   * @param {string} initialTheme  - THEME.ICE or THEME.MATRIX
   * @param {{ alternates: boolean }} options
   */
  constructor(scene, initialTheme = THEME.ICE, options = {}) {
    super();
    this._scene      = scene;
    this._theme      = initialTheme;
    this._alternates = options.alternates ?? false;
    this._timer      = 0;
    this._switching  = false;

    // Glitch overlay — a full-screen rect we flash during transitions
    this._glitchOverlay = scene.add.rectangle(
      scene.scale.width / 2,
      scene.scale.height / 2,
      scene.scale.width,
      scene.scale.height,
      0x00FF41,
      0
    ).setDepth(100);

    // Secondary glitch bar — horizontal slice that shifts for effect
    this._glitchBar = scene.add.rectangle(
      scene.scale.width / 2,
      scene.scale.height / 2,
      scene.scale.width,
      40,
      0xFFFFFF,
      0
    ).setDepth(101);
  }

  get theme() { return this._theme; }
  get config() { return THEME_CONFIG[this._theme]; }

  /**
   * Call every frame from the scene's update().
   * @param {number} delta - ms since last frame
   */
  update(delta) {
    if (!this._alternates || this._switching) return;

    this._timer += delta;
    if (this._timer >= THEME_SWITCH_INTERVAL) {
      this._timer = 0;
      this._triggerSwitch();
    }
  }

  /** Force an immediate theme switch (used by Level 3 on enter). */
  forceSwitch() {
    this._timer = 0;
    this._triggerSwitch();
  }

  // ---------------------------------------------------------------------------

  _triggerSwitch() {
    if (this._switching) return;
    this._switching = true;

    const next = this._theme === THEME.ICE ? THEME.MATRIX : THEME.ICE;
    const cfg  = THEME_CONFIG[next];

    // Glitch sequence:
    // 1. Flash green/white overlay
    // 2. Shake camera slightly
    // 3. Swap theme colors
    // 4. Fade overlay out

    const scene = this._scene;

    // Camera shake
    scene.cameras.main.shake(180, 0.006);

    // Flash overlay color based on incoming theme
    this._glitchOverlay.setFillStyle(cfg.accentColor, 0.55);
    this._glitchBar.setFillStyle(0xFFFFFF, 0.7);
    this._glitchBar.y = Phaser.Math.Between(100, scene.scale.height - 100);

    // Strobe effect: 3 quick flickers
    let flickers = 0;
    const flicker = scene.time.addEvent({
      delay: 55,
      repeat: 5,
      callback: () => {
        flickers++;
        const visible = flickers % 2 === 0;
        this._glitchOverlay.setAlpha(visible ? 0.55 : 0);
        this._glitchBar.setAlpha(visible ? 0.7 : 0);

        // On the 4th flicker, commit the theme swap
        if (flickers === 4) {
          this._theme = next;
          this.emit('themechange', this._theme, THEME_CONFIG[this._theme]);
        }
      },
    });

    // Clean up after animation
    scene.time.delayedCall(400, () => {
      this._glitchOverlay.setAlpha(0);
      this._glitchBar.setAlpha(0);
      this._switching = false;
    });
  }
}
