// Game dimensions (landscape, standard laptop)
export const WIDTH = 1280;
export const HEIGHT = 720;

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
    bgColor:        0x0D1B2A,  // deep cold navy
    accentColor:    0xB3E5FC,  // ice blue
    particleColor:  0xE0F7FA,  // snow white-blue
    obstacleColor:  0xB3E5FC,
    obstacleAccent: 0x80DEEA,
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
export const DATABIT_SCORE = 10;
export const LEADERBOARD_SIZE = 10;
export const LEADERBOARD_MIN_SCORE = 0; // set after playtesting

// Photo pool
export const PHOTO_POOL_MAX = 20;
