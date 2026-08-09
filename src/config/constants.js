// Game dimensions (landscape, standard laptop)
export const WIDTH = 1280;
export const HEIGHT = 720;

// Fonts — 8-bit pixel style (loaded via Google Fonts in index.html)
// FONT_TITLE: blocky pixel font for headings, scores, big text
// FONT_BODY: taller pixel font for instructions, body text, tables
export const FONT_TITLE = '"Press Start 2P", monospace';
export const FONT_BODY  = '"VT323", monospace';

// Palette
export const COLORS = {
  awsOrange:   0xFF9900,
  awsNavy:     0x232F3E,
  iceBlue:     0xB3E5FC,
  matrixGreen: 0x00FF41,
  white:       0xFFFFFF,
  black:       0x000000,
};

// Themes
export const THEME = {
  ICE:    'ice',
  MATRIX: 'matrix',
};

export const THEME_CONFIG = {
  ice: {
    bgColor:        0xDDE8F0,  // muted snow-blue/white — feels cold and icy
    accentColor:    0x5BA4CF,  // deeper ice blue for accents
    particleColor:  0xFFFFFF,  // white snowflakes
    obstacleColor:  0x8EC8E8,
    obstacleAccent: 0xC8E6F5,
  },
  matrix: {
    bgColor:        0x000000,  // pure black
    accentColor:    0x00FF41,  // matrix green
    particleColor:  0x00FF41,
    obstacleColor:  0x00C853,
    obstacleAccent: 0x69FF47,
  },
};

// Theme switch interval in endless/level 3 (ms)
export const THEME_SWITCH_INTERVAL = 22000;

// Physics
export const GRAVITY = 800;       // px/s²
export const FLAP_VELOCITY = -380; // px/s (negative = up)

// Obstacles
export const OBSTACLE_WIDTH = 64;
export const OBSTACLE_SPEED_L1 = 220;  // px/s
export const OBSTACLE_SPEED_L2 = 290;
export const OBSTACLE_SPEED_L3 = 360;
export const GAP_L1 = 252; // ~35% of 720
export const GAP_L2 = 194; // ~27% of 720
export const GAP_L3 = 158; // ~22% of 720
export const OBSTACLE_INTERVAL = 1800; // ms between spawns

// Endless mode
export const ENDLESS_START_SPEED = 290;
export const ENDLESS_MAX_SPEED   = 520;
export const ENDLESS_START_GAP   = 194;
export const ENDLESS_MIN_GAP     = 140;

// Scoring
export const DATABIT_SCORE = 20;
export const LEADERBOARD_SIZE = 10;
export const LEADERBOARD_MIN_SCORE = 0; // set after playtesting

// Mascot sizing — tweak these to adjust proportions
// MASCOT_BODY_SIZE: width & height of the penguin sprite in-game
// MASCOT_FACE_SIZE: diameter of the circular face photo
// MASCOT_FACE_X: horizontal offset of face (positive = right)
// MASCOT_FACE_Y: vertical offset of face from center (negative = higher up)
export const MASCOT_BODY_SIZE = 100;   // px — penguin sprite display size
export const MASCOT_FACE_SIZE = 40;    // px — face photo circle diameter
export const MASCOT_FACE_X   = 18;     // px — face X offset (positive = right)
export const MASCOT_FACE_Y   = -8;   // px — face Y offset (negative = above center)
// Collectible spawn rates — adjust to control how often chips appear
export const CHIP_GAP_CHANCE  = 0.45;  // chance a column pipe gets a chip in its gap
export const CHIP_FREE_CHANCE = 0.25;  // chance a free-space chip spawns between obstacles

// Collectible sizing — adjust these to change the in-game logo size
export const CHIP_LOGO_SIZE   = 40;   // px — logo image display size
export const CHIP_BUBBLE_SIZE = 74;   // px — glow bubble radius behind the logo

// When you swap to the AWS logo PNG, these become unused
export const CHIP_COLORS = [
  0xFF9900,  // AWS Orange
  0x2E73B8,  // Cyan
  0x3F8624,  // Matrix Green
  0x527FFF,  // Pink ata
  0x7AA116,  // Purple
  0xCD222E,  // Red
];

// Photo pool
export const PHOTO_POOL_MAX = 20;

// Debug — press Ctrl+Shift+H in-game to toggle hitbox display
// RED = obstacle  |  BLUE = chip  |  MAGENTA = monster
export let DEBUG_HITBOXES = false;
export function toggleDebugHitboxes() { DEBUG_HITBOXES = !DEBUG_HITBOXES; return DEBUG_HITBOXES; }
export const DEBUG_COLORS = {
  OBSTACLE:    0xFF0000,
  COLLECTIBLE: 0x00AAFF,
  MONSTER:     0xFF00FF,
};
