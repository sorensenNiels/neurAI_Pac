import type { Direction } from "../input";

export const SPEED = 120;        // pixels per second
export const PACMAN_RADIUS = 10; // pixels

// Mouth animation
export const MOUTH_SPEED = 8;                 // chomp cycles per second
export const MAX_MOUTH = 0.25 * Math.PI;      // 45° — max half-angle when fully open
export const STOPPED_MOUTH = 0.15 * Math.PI;  // 27° — fixed half-angle when standing still

export interface PlayerState {
  x: number;
  y: number;
  facing: Direction;
  mouthTimer: number; // seconds elapsed while moving; drives the chomp animation
  isMoving: boolean;
}

export function createPlayer(canvasWidth: number, canvasHeight: number): PlayerState {
  return {
    x: canvasWidth / 2,
    y: canvasHeight / 2,
    facing: "right",
    mouthTimer: 0,
    isMoving: false,
  };
}

/**
 * Pure function — returns a new PlayerState given the current state, the held
 * direction key (or null), the frame delta-time, and the canvas bounds.
 * No side effects; safe to call in tests without a DOM.
 */
export function updatePlayer(
  player: PlayerState,
  dir: Direction | null,
  dt: number,
  bounds: { width: number; height: number },
): PlayerState {
  const isMoving = dir !== null;
  const facing = dir !== null ? dir : player.facing;
  const mouthTimer = isMoving ? player.mouthTimer + dt : player.mouthTimer;

  const dist = SPEED * dt;
  let x = player.x;
  let y = player.y;

  switch (dir) {
    case "up":    y -= dist; break;
    case "down":  y += dist; break;
    case "left":  x -= dist; break;
    case "right": x += dist; break;
  }

  x = Math.max(PACMAN_RADIUS, Math.min(bounds.width  - PACMAN_RADIUS, x));
  y = Math.max(PACMAN_RADIUS, Math.min(bounds.height - PACMAN_RADIUS, y));

  return { x, y, facing, mouthTimer, isMoving };
}
