import type { Direction } from "../input";

export const SPEED = 120; // pixels per second
export const PACMAN_RADIUS = 10; // pixels

// Mouth animation
export const MOUTH_SPEED = 8; // chomp cycles per second
export const MAX_MOUTH = 0.25 * Math.PI; // 45° — max half-angle when fully open
export const STOPPED_MOUTH = 0.15 * Math.PI; // 27° — fixed half-angle when standing still

export interface PlayerState {
  x: number;
  y: number;
  facing: Direction;
  mouthTimer: number; // seconds elapsed while moving; drives the chomp animation
  isMoving: boolean;
}

/** Creates a player at the given pixel position. */
export function createPlayer(startX: number, startY: number): PlayerState {
  return {
    x: startX,
    y: startY,
    facing: "right",
    mouthTimer: 0,
    isMoving: false,
  };
}

/**
 * Pure function — returns a new PlayerState.
 *
 * @param player   Current state
 * @param dir      Held direction key, or null
 * @param dt       Frame delta-time in seconds
 * @param bounds   Canvas dimensions used for edge clamping
 * @param isWallAt Optional predicate; return true if a pixel coordinate is
 *                 inside a wall. Defaults to no walls (open canvas).
 */
export function updatePlayer(
  player: PlayerState,
  dir: Direction | null,
  dt: number,
  bounds: { width: number; height: number },
  isWallAt: (x: number, y: number) => boolean = () => false,
): PlayerState {
  const isMoving = dir !== null;
  const facing = dir !== null ? dir : player.facing;
  const mouthTimer = isMoving ? player.mouthTimer + dt : player.mouthTimer;

  const dist = SPEED * dt;
  let x = player.x;
  let y = player.y;

  // Compute candidate new position then check the leading edge for wall collision.
  // Each axis is handled independently so Pac-Man can slide along a wall.
  switch (dir) {
    case "right": {
      const nx = x + dist;
      if (!isWallAt(nx + PACMAN_RADIUS, y)) x = nx;
      break;
    }
    case "left": {
      const nx = x - dist;
      if (!isWallAt(nx - PACMAN_RADIUS, y)) x = nx;
      break;
    }
    case "down": {
      const ny = y + dist;
      if (!isWallAt(x, ny + PACMAN_RADIUS)) y = ny;
      break;
    }
    case "up": {
      const ny = y - dist;
      if (!isWallAt(x, ny - PACMAN_RADIUS)) y = ny;
      break;
    }
  }

  // Clamp to canvas bounds (tunnel wrapping is handled separately in game.ts)
  x = Math.max(PACMAN_RADIUS, Math.min(bounds.width - PACMAN_RADIUS, x));
  y = Math.max(PACMAN_RADIUS, Math.min(bounds.height - PACMAN_RADIUS, y));

  return { x, y, facing, mouthTimer, isMoving };
}
