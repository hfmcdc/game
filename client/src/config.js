export const CLIENT_CONFIG = {
  ARENA_WIDTH: 2000,
  ARENA_HEIGHT: 2000,
  INTERPOLATION_LERP: 0.25, // Positional smoothing factor
  ROTATION_LERP: 0.35,
  // Interval (ms) at which the mobile fire stick re-sends shoot requests
  // while held. Slightly above the server's weapon fire rate (180ms) so
  // every tick lands without spamming useless extra requests.
  TOUCH_FIRE_INTERVAL: 190,
};

export const COLORS = {
  CYAN: 0x00f0ff,
  MAGENTA: 0xff0055,
  GREEN: 0x00ff66,
  AMBER: 0xffe600,
  DARK_BG: 0x050811,
  GRID_LINE: 0x0a1c38,
  WALL_FILL: 0x0b172a,
  WALL_STROKE: 0x00f0ff,
  WALL_CORE: 0xff0055,
};
