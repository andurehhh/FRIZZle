/**
 * AssetKeys — single source of truth for all sprite/audio asset keys.
 *
 * HOW TO SWAP IN YOUR OWN SVG/PNG ASSETS (Day 7):
 *   1. Drop your files into /public/assets/sprites/ or /public/assets/audio/
 *   2. Update the path strings below
 *   3. In Boot.js, add: this.load.image(AssetKeys.MASCOT, AssetKeys.MASCOT_PATH)
 *      for each key you want to use as a real sprite
 *   4. In the entity, replace the graphics.draw() call with:
 *      this.add.image(x, y, AssetKeys.MASCOT)
 *
 * Until real assets exist, entities fall back to drawing with Phaser Graphics.
 * The HAS_REAL_ASSETS flag controls which path each entity takes.
 */

export const HAS_REAL_ASSETS = false; // flip to true once PNGs/SVGs are loaded

export const AssetKeys = {
  // Characters
  MASCOT:           'mascot',
  MASCOT_FLAP:      'mascot_flap',
  MASCOT_FALL:      'mascot_fall',
  MASCOT_DEAD:      'mascot_dead',

  // Obstacles — Ice theme
  ICE_PIPE_TOP:     'ice_pipe_top',
  ICE_PIPE_BOT:     'ice_pipe_bot',
  ICE_MOUNTAIN:     'ice_mountain',

  // Obstacles — Matrix theme
  MATRIX_PIPE_TOP:  'matrix_pipe_top',
  MATRIX_PIPE_BOT:  'matrix_pipe_bot',
  MATRIX_MOUNTAIN:  'matrix_mountain',

  // Collectible
  SBG_CHIP:         'sbg_chip',

  // Enemy
  GLITCH_MONSTER:   'glitch_monster',

  // Backgrounds
  BG_ICE:           'bg_ice',
  BG_MATRIX:        'bg_matrix',

  // UI
  BTN_PLAY:         'btn_play',
  BTN_RETRY:        'btn_retry',

  // Audio
  SFX_FLAP:         'sfx_flap',
  SFX_HIT:          'sfx_hit',
  SFX_COLLECT:      'sfx_collect',
  SFX_LEVEL_CLEAR:  'sfx_level_clear',
  SFX_FANFARE:      'sfx_fanfare',
};

// Asset file paths — update these when dropping in real files
export const AssetPaths = {
  mascot:           '/assets/sprites/mascot_idle.png',
  mascot_flap:      '/assets/sprites/mascot_flap.png',
  mascot_fall:      '/assets/sprites/mascot_fall.png',
  mascot_dead:      '/assets/sprites/mascot_dead.png',

  ice_pipe_top:     '/assets/sprites/ice_pipe_top.png',
  ice_pipe_bot:     '/assets/sprites/ice_pipe_bot.png',
  ice_mountain:     '/assets/sprites/ice_mountain.png',

  matrix_pipe_top:  '/assets/sprites/matrix_pipe_top.png',
  matrix_pipe_bot:  '/assets/sprites/matrix_pipe_bot.png',
  matrix_mountain:  '/assets/sprites/matrix_mountain.png',

  sbg_chip:         '/assets/sprites/sbg_chip.png',
  glitch_monster:   '/assets/sprites/glitch_monster.png',

  bg_ice:           '/assets/sprites/bg_ice.png',
  bg_matrix:        '/assets/sprites/bg_matrix.png',

  sfx_flap:         '/assets/audio/flap.wav',
  sfx_hit:          '/assets/audio/hit.wav',
  sfx_collect:      '/assets/audio/collect.wav',
  sfx_level_clear:  '/assets/audio/level_clear.wav',
  sfx_fanfare:      '/assets/audio/fanfare.wav',
};
