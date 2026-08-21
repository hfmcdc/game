export const SERVER_CONFIG = {
  PORT: process.env.PORT || 3000,
  TICK_RATE: 60, // 60 updates/sec physics loop
  SNAPSHOT_RATE: 30, // 30 updates/sec network broadcast
};

export const ARENA_CONFIG = {
  WIDTH: 2000,
  HEIGHT: 2000,
  BORDER_THICKNESS: 40,
  GRID_SIZE: 100,
};

export const PLAYER_CONFIG = {
  RADIUS: 24,
  MAX_HEALTH: 100,
  BASE_SPEED: 320, // Pixels per second
  DIAGONAL_MODIFIER: Math.SQRT1_2, // ~0.7071
  RESPAWN_DELAY: 2.0, // 2.0s before respawn
  INVULNERABILITY_TIME: 1.0, // 1.0s spawn shield
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 16,
};

export const WEAPON_CONFIG = {
  FIRE_RATE: 160, // Milliseconds between shots
  PROJECTILE_SPEED: 950, // Pixels per second
  PROJECTILE_RADIUS: 6,
  PROJECTILE_LIFETIME: 2.2, // Covers arena length
  DAMAGE: 25, // 4 hits to eliminate
};

export const MATCH_CONFIG = {
  MIN_PLAYERS_TO_START: 2,
  MAX_PLAYERS_PER_ROOM: 8,
  COUNTDOWN_DURATION: 3, // Seconds
  TARGET_SCORE: 30, // First to 30 kills wins
};

export const GAME_STATES = {
  LOBBY: 'LOBBY',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  GAME_OVER: 'GAME_OVER',
};
