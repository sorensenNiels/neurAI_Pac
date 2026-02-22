import type { Direction } from "../input";
import { TILE } from "../maze/tiles";

export const SPEED = 120; // pixels per second
export const PACMAN_RADIUS = 10; // pixels

// Mouth animation
export const MOUTH_SPEED = 8; // chomp cycles per second
export const MAX_MOUTH = 0.25 * Math.PI; // 45° — max half-angle when fully open
export const STOPPED_MOUTH = 0.15 * Math.PI; // 27° — fixed half-angle when standing still

const R = PACMAN_RADIUS;
const D = Math.round(R / Math.SQRT2); // ≈ 7 — diagonal probe offset
const HALF_TILE = TILE / 2; // 10px — tile half-width, equals PACMAN_RADIUS

/**
 * Returns the pixel centre of the tile that is nearest to `pos`.
 * Tile centres sit at TILE/2, 3*TILE/2, 5*TILE/2, … (i.e. col*TILE + TILE/2).
 */
function nearestTileCenter(pos: number): number {
  return Math.round((pos - HALF_TILE) / TILE) * TILE + HALF_TILE;
}

type TurnResult = { allowed: boolean; snapX: number; snapY: number };

/**
 * Decides whether a queued turn from `currentDir` to `desiredDir` is valid.
 *
 * For a perpendicular turn (horizontal↔vertical) the check uses the nearest
 * tile-centre in the off-axis coordinate rather than the raw pixel position.
 * This guarantees all three leading-arc probes fall inside a single tile so
 * the wall decision is always tile-accurate.  When the turn is allowed, the
 * snapped coordinate is returned so the caller can align Pac-Man to the grid.
 *
 * Same-axis moves (continuing or reversing) need no snap.
 */
function tryTurn(
  x: number,
  y: number,
  currentDir: Direction | null,
  desiredDir: Direction,
  isWallAt: (px: number, py: number) => boolean,
): TurnResult {
  let snapX = x;
  let snapY = y;

  if (currentDir !== null) {
    const movingH = currentDir === "left" || currentDir === "right";
    const wantH = desiredDir === "left" || desiredDir === "right";
    if (movingH !== wantH) {
      // Perpendicular turn: snap the off-axis coordinate to the nearest tile centre.
      if (movingH) {
        snapX = nearestTileCenter(x); // turning U/D while moving L/R → align x
      } else {
        snapY = nearestTileCenter(y); // turning L/R while moving U/D → align y
      }
    }
  }

  return { allowed: canMoveInDir(snapX, snapY, desiredDir, 1, isWallAt), snapX, snapY };
}

export interface PlayerState {
  x: number;
  y: number;
  facing: Direction;
  /** Direction Pac-Man is currently travelling (null = not yet started). */
  currentDir: Direction | null;
  /** Queued turn the player has requested; applied as soon as the path clears. */
  desiredDir: Direction | null;
  mouthTimer: number; // seconds elapsed while moving; drives the chomp animation
  isMoving: boolean;
}

/** Creates a player at the given pixel position. */
export function createPlayer(startX: number, startY: number): PlayerState {
  return {
    x: startX,
    y: startY,
    facing: "right",
    currentDir: null,
    desiredDir: null,
    mouthTimer: 0,
    isMoving: false,
  };
}

/**
 * Returns true when Pac-Man can take a step of `dist` pixels in `dir` from
 * (x, y) without any point on the leading arc entering a wall.
 *
 * Probes are evaluated at the *destination* (x ± dist, y ± dist) rather than
 * the current position.  This is critical for "left" and "up": Math.floor maps
 * the tile-boundary pixel (e.g. x − R at a tile centre) back to the current
 * tile, so checking the current position would never detect walls ahead in
 * those directions.  Probing the destination position is symmetric with "right"
 * and "down" and matches the original single-pass movement logic.
 *
 * Pass dist = 1 for turn-validity checks (just enough to cross the boundary).
 * Pass dist = SPEED * dt for actual movement checks.
 */
function canMoveInDir(
  x: number,
  y: number,
  dir: Direction,
  dist: number,
  isWallAt: (x: number, y: number) => boolean,
): boolean {
  switch (dir) {
    case "right": {
      const nx = x + dist;
      return !isWallAt(nx + R, y) && !isWallAt(nx + D, y - D) && !isWallAt(nx + D, y + D);
    }
    case "left": {
      const nx = x - dist;
      return !isWallAt(nx - R, y) && !isWallAt(nx - D, y - D) && !isWallAt(nx - D, y + D);
    }
    case "down": {
      const ny = y + dist;
      return !isWallAt(x, ny + R) && !isWallAt(x - D, ny + D) && !isWallAt(x + D, ny + D);
    }
    case "up": {
      const ny = y - dist;
      return !isWallAt(x, ny - R) && !isWallAt(x - D, ny - D) && !isWallAt(x + D, ny - D);
    }
  }
}

/**
 * Pure function — returns a new PlayerState.
 *
 * Movement model:
 *   - Pac-Man starts stationary (currentDir = null) and only begins moving
 *     after the first arrow key press.
 *   - Once moving, Pac-Man travels continuously in `currentDir` regardless of
 *     whether a key is still held.
 *   - Pressing a direction key queues it as `desiredDir`; the turn is applied
 *     as soon as the path in that direction is clear.
 *   - Pac-Man stops only when `currentDir` is blocked by a wall.
 *
 * @param player   Current state
 * @param dir      Direction from input (held key), or null
 * @param dt       Frame delta-time in seconds
 * @param bounds   Canvas dimensions used for edge clamping.
 *                 `xMin`/`xMax` override the default clamp of [R, width-R] —
 *                 used by the tunnel row to let Pac-Man cross the canvas edge.
 * @param isWallAt Predicate; return true if a pixel coordinate is inside a wall.
 */
export function updatePlayer(
  player: PlayerState,
  dir: Direction | null,
  dt: number,
  bounds: { width: number; height: number; xMin?: number; xMax?: number },
  isWallAt: (x: number, y: number) => boolean = () => false,
): PlayerState {
  // New input overrides the queued direction; releasing a key preserves it.
  const desiredDir = dir !== null ? dir : player.desiredDir;

  let currentDir = player.currentDir;
  let remainingDesired = desiredDir;

  // Try to apply the queued turn.
  // tryTurn snaps to the nearest tile centre in the off-axis coordinate before
  // checking the wall, so turns are only granted at proper maze intersections.
  const dist = SPEED * dt;
  let x = player.x;
  let y = player.y;

  if (desiredDir !== null) {
    const turn = tryTurn(x, y, player.currentDir, desiredDir, isWallAt);
    if (turn.allowed) {
      currentDir = desiredDir;
      remainingDesired = null; // consumed
      x = turn.snapX; // align to tile centre in the perpendicular axis
      y = turn.snapY;
    }
  }

  if (currentDir !== null && canMoveInDir(x, y, currentDir, dist, isWallAt)) {
    switch (currentDir) {
      case "right":
        x += dist;
        break;
      case "left":
        x -= dist;
        break;
      case "down":
        y += dist;
        break;
      case "up":
        y -= dist;
        break;
    }
  }

  // Clamp to canvas bounds (tunnel wrapping is handled separately in game.ts).
  // xMin/xMax can be overridden by the caller for the tunnel row.
  const xMin = bounds.xMin ?? R;
  const xMax = bounds.xMax ?? bounds.width - R;
  x = Math.max(xMin, Math.min(xMax, x));
  y = Math.max(R, Math.min(bounds.height - R, y));

  const isMoving = x !== player.x || y !== player.y;
  const facing = currentDir ?? player.facing;
  const mouthTimer = isMoving ? player.mouthTimer + dt : player.mouthTimer;

  return {
    x,
    y,
    facing,
    currentDir,
    desiredDir: remainingDesired,
    mouthTimer,
    isMoving,
  };
}
