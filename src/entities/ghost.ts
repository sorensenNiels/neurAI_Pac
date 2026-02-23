import type { Direction } from "../input";
import type { MazeState } from "../maze/maze";
import { getTile } from "../maze/maze";
import { TILE } from "../maze/tiles";

export const GHOST_RADIUS = 10; // pixels — same as Pac-Man
export const GHOST_SPEED = 115; // pixels per second (slightly slower than Pac-Man's 120)
export const FRIGHTENED_DURATION = 8; // seconds
export const GHOST_FLASH_THRESHOLD = 2; // seconds before end when ghost starts flashing
const PEN_WAIT = 1; // seconds ghost waits in pen before exiting

// Pixel position of the pen exit — first open floor tile above the door (row 11, col 13)
const PEN_EXIT_X = 13 * TILE + TILE / 2; // 270
const PEN_EXIT_Y = 11 * TILE + TILE / 2; // 230

// Pixel position of the door tile centre — ghost "eaten" return target (row 12, col 13)
const PEN_ENTRANCE_X = 13 * TILE + TILE / 2; // 270
const PEN_ENTRANCE_Y = 12 * TILE + TILE / 2; // 250

// Blinky's scatter corner — top-right of the maze (col 25, row 0)
export const BLINKY_SCATTER_X = 25 * TILE + TILE / 2; // 510
export const BLINKY_SCATTER_Y = TILE / 2; // 10

export type GhostMode =
  | "pen"
  | "exiting"
  | "scatter"
  | "chase"
  | "frightened"
  | "eaten";

export interface GhostState {
  x: number;
  y: number;
  dir: Direction;
  mode: GhostMode;
  /** Seconds remaining in frightened mode; 0 when not frightened. */
  frightenedTimer: number;
  /** Seconds remaining before the ghost starts leaving the pen. */
  penTimer: number;
}

export function createGhost(startX: number, startY: number): GhostState {
  return {
    x: startX,
    y: startY,
    dir: "up",
    mode: "pen",
    frightenedTimer: 0,
    penTimer: PEN_WAIT,
  };
}

/** Returns the opposite of a direction. */
export function oppositeDir(dir: Direction): Direction {
  switch (dir) {
    case "left":
      return "right";
    case "right":
      return "left";
    case "up":
      return "down";
    case "down":
      return "up";
  }
}

/**
 * Snaps `pos` to the nearest tile centre (k*TILE + TILE/2).
 */
function snapToCenter(pos: number): number {
  return Math.round((pos - TILE / 2) / TILE) * TILE + TILE / 2;
}

/**
 * Returns the first tile centre crossed when moving from `from` to `to`,
 * or null if no centre was crossed.
 *
 * Tile centres sit at k*TILE + TILE/2 for integer k≥0.
 * For movement in the positive direction, returns the lowest centre in range;
 * for negative, the highest.  This ensures we act on the first crossing.
 */
function findCrossedCenter(from: number, to: number): number | null {
  if (from === to) return null;
  const min = Math.min(from, to);
  const max = Math.max(from, to);
  const kLow = Math.ceil((min - TILE / 2) / TILE);
  const kHigh = Math.floor((max - TILE / 2) / TILE);
  if (kLow > kHigh) return null;
  const k = to > from ? kLow : kHigh;
  return k * TILE + TILE / 2;
}

/**
 * Returns true if the given pixel position would land the ghost inside a wall.
 * Ghosts can pass through the door only when in pen/exiting/eaten modes.
 */
export function ghostIsWallAt(
  maze: MazeState,
  x: number,
  y: number,
  mode: GhostMode,
): boolean {
  const col = Math.floor(x / TILE);
  const row = Math.floor(y / TILE);
  const tile = getTile(maze, col, row);
  if (tile === "wall") return true;
  if (tile === "door") {
    // Door is passable only for ghosts entering/leaving the pen
    return mode !== "pen" && mode !== "exiting" && mode !== "eaten";
  }
  return false;
}

/**
 * Chooses the best next direction for the ghost at an intersection.
 *
 * Rules (matching classic Pac-Man):
 *  - Never reverse (U-turns are banned except on mode change).
 *  - Never enter a wall (door passability depends on mode).
 *  - Frightened: choose randomly among valid directions.
 *  - Otherwise: choose the direction whose one-step-ahead tile centre is
 *    closest (Euclidean) to (targetX, targetY).
 */
export function pickDirection(
  x: number,
  y: number,
  currentDir: Direction,
  targetX: number,
  targetY: number,
  mode: GhostMode,
  maze: MazeState,
): Direction {
  const reverse = oppositeDir(currentDir);
  const all: Direction[] = ["up", "down", "left", "right"];

  const valid = all.filter((d) => {
    if (d === reverse) return false;
    // One tile ahead centre
    const nx = x + (d === "right" ? TILE : d === "left" ? -TILE : 0);
    const ny = y + (d === "down" ? TILE : d === "up" ? -TILE : 0);
    return !ghostIsWallAt(maze, nx, ny, mode);
  });

  if (valid.length === 0) return reverse; // cornered — reverse as last resort

  if (mode === "frightened") {
    return valid[Math.floor(Math.random() * valid.length)] as Direction;
  }

  // Pick direction minimising Euclidean distance to target
  return valid.reduce((best, d) => {
    const nx = x + (d === "right" ? TILE : d === "left" ? -TILE : 0);
    const ny = y + (d === "down" ? TILE : d === "up" ? -TILE : 0);
    const dx = nx - targetX;
    const dy = ny - targetY;
    const dist = dx * dx + dy * dy;

    const bx = x + (best === "right" ? TILE : best === "left" ? -TILE : 0);
    const by = y + (best === "down" ? TILE : best === "up" ? -TILE : 0);
    const bdx = bx - targetX;
    const bdy = by - targetY;
    const bestDist = bdx * bdx + bdy * bdy;

    return dist < bestDist ? d : best;
  });
}

/**
 * Pure function — returns the new GhostState for the next frame.
 *
 * Movement model:
 *   The ghost moves at GHOST_SPEED px/s in its current direction.
 *   Each frame, we check whether the movement crossed a tile centre.
 *   If it did, we snap to that centre, pick the next direction, and apply
 *   any remaining distance in the new direction.
 *
 *   Using a "did we cross a centre?" test (rather than "are we near a centre?")
 *   avoids the proximity-snap trap: a proximity check with threshold ≥ per-frame
 *   distance would re-trigger every frame, keeping the ghost frozen at the centre.
 *
 * @param ghost      Current state
 * @param playerX    Player pixel x (used as chase target)
 * @param playerY    Player pixel y
 * @param dt         Frame delta-time in seconds
 * @param maze       Maze state for wall checks
 * @param isChasing  True when the global mode is chase, false for scatter
 */
export function updateGhost(
  ghost: GhostState,
  playerX: number,
  playerY: number,
  dt: number,
  maze: MazeState,
  isChasing: boolean,
): GhostState {
  let { x, y, dir, mode, frightenedTimer, penTimer } = ghost;

  // ── Frightened timer ────────────────────────────────────────────────────────
  if (frightenedTimer > 0) {
    frightenedTimer = Math.max(0, frightenedTimer - dt);
    if (frightenedTimer === 0 && mode === "frightened") {
      mode = isChasing ? "chase" : "scatter";
    }
  }

  // ── Pen waiting ─────────────────────────────────────────────────────────────
  if (mode === "pen") {
    penTimer = Math.max(0, penTimer - dt);
    if (penTimer === 0) {
      mode = "exiting";
    }
    return { x, y, dir, mode, frightenedTimer, penTimer };
  }

  // ── Target selection ────────────────────────────────────────────────────────
  let targetX: number;
  let targetY: number;

  switch (mode) {
    case "exiting":
      targetX = PEN_EXIT_X;
      targetY = PEN_EXIT_Y;
      break;
    case "scatter":
      targetX = BLINKY_SCATTER_X;
      targetY = BLINKY_SCATTER_Y;
      break;
    case "chase":
      targetX = playerX;
      targetY = playerY;
      break;
    case "frightened":
      targetX = 0;
      targetY = 0;
      break;
    case "eaten":
      targetX = PEN_ENTRANCE_X;
      targetY = PEN_ENTRANCE_Y;
      break;
  }

  // ── Movement with crossing-based direction updates ──────────────────────────
  const dist = GHOST_SPEED * dt;
  const movingH = dir === "left" || dir === "right";

  const prevX = x;
  const prevY = y;

  // Apply the full frame's movement in the current direction
  switch (dir) {
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

  // Check whether we crossed a tile centre this frame on the movement axis
  const axisFrom = movingH ? prevX : prevY;
  const axisTo = movingH ? x : y;
  const crossed = findCrossedCenter(axisFrom, axisTo);

  if (crossed !== null) {
    const distToCenter = Math.abs(crossed - axisFrom);
    const remaining = dist - distToCenter;

    // Snap to the tile centre (including the off-axis coordinate)
    if (movingH) {
      x = crossed;
      y = snapToCenter(prevY);
    } else {
      y = crossed;
      x = snapToCenter(prevX);
    }

    // Mode transitions that happen at specific tile centres
    if (
      mode === "exiting" &&
      Math.abs(x - PEN_EXIT_X) < 1 &&
      Math.abs(y - PEN_EXIT_Y) < 1
    ) {
      x = PEN_EXIT_X;
      y = PEN_EXIT_Y;
      mode = isChasing ? "chase" : "scatter";
    }

    if (
      mode === "eaten" &&
      Math.abs(x - PEN_ENTRANCE_X) < 1 &&
      Math.abs(y - PEN_ENTRANCE_Y) < 1
    ) {
      x = PEN_ENTRANCE_X;
      y = PEN_ENTRANCE_Y;
      mode = "pen";
      penTimer = 1;
    }

    // Pick the next direction (using the updated mode so targets are correct)
    dir = pickDirection(x, y, dir, targetX, targetY, mode, maze);

    // Apply remaining distance in the new direction
    if (remaining > 0) {
      switch (dir) {
        case "right":
          x += remaining;
          break;
        case "left":
          x -= remaining;
          break;
        case "down":
          y += remaining;
          break;
        case "up":
          y -= remaining;
          break;
      }
    }
  }

  return { x, y, dir, mode, frightenedTimer, penTimer };
}
