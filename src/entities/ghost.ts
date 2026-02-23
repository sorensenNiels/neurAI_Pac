import type { Direction } from "../input";
import type { MazeState } from "../maze/maze";
import { getTile } from "../maze/maze";
import { TILE } from "../maze/tiles";

export const GHOST_RADIUS = 10; // pixels — same as Pac-Man
export const GHOST_SPEED = 115; // pixels per second
export const FRIGHTENED_DURATION = 8; // seconds
export const GHOST_FLASH_THRESHOLD = 2; // seconds before end when ghost starts flashing

/**
 * Each ghost has a unique personality that drives its chase-mode target and
 * scatter corner.
 *
 *   blinky — targets Pac-Man's current tile directly (classic "shadow")
 *   pinky  — targets 4 tiles ahead of Pac-Man's facing direction ("speedy")
 *   clyde  — chases like Blinky when far away (>8 tiles), retreats to its own
 *            scatter corner when close ("pokey")
 */
export type GhostPersonality = "blinky" | "pinky" | "clyde";

// Pixel position of the pen exit — first open floor tile above the door (row 11, col 13)
const PEN_EXIT_X = 13 * TILE + TILE / 2; // 270
const PEN_EXIT_Y = 11 * TILE + TILE / 2; // 230

// Pixel position of the door tile centre — ghost "eaten" return target (row 12, col 13)
const PEN_ENTRANCE_X = 13 * TILE + TILE / 2; // 270
const PEN_ENTRANCE_Y = 12 * TILE + TILE / 2; // 250

// Scatter corner targets — classic maze corners (reachable floor tiles)
const SCATTER_TARGETS: Record<GhostPersonality, { x: number; y: number }> = {
  blinky: { x: 25 * TILE + TILE / 2, y: 1 * TILE + TILE / 2 }, // top-right
  pinky: { x: 2 * TILE + TILE / 2, y: 1 * TILE + TILE / 2 }, // top-left
  clyde: { x: 1 * TILE + TILE / 2, y: 29 * TILE + TILE / 2 }, // bottom-left
};

// Body colour per personality (used in normal scatter/chase modes)
export const GHOST_COLORS: Record<GhostPersonality, string> = {
  blinky: "#FF0000", // red
  pinky: "#FFB8FF", // pink
  clyde: "#FFB852", // orange
};

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
  personality: GhostPersonality;
}

export function createGhost(
  startX: number,
  startY: number,
  personality: GhostPersonality,
  penWait: number,
): GhostState {
  return {
    x: startX,
    y: startY,
    dir: "up",
    mode: "pen",
    frightenedTimer: 0,
    penTimer: penWait,
    personality,
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

/** Snaps `pos` to the nearest tile centre (k*TILE + TILE/2). */
function snapToCenter(pos: number): number {
  return Math.round((pos - TILE / 2) / TILE) * TILE + TILE / 2;
}

/**
 * Returns the first tile centre crossed when moving from `from` to `to`,
 * or null if no centre was crossed.
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
    return mode !== "pen" && mode !== "exiting" && mode !== "eaten";
  }
  return false;
}

/**
 * Computes the chase-mode target pixel for a ghost given the player's state.
 *
 *   blinky — Pac-Man's exact position
 *   pinky  — 4 tiles ahead of Pac-Man's facing direction
 *   clyde  — Pac-Man's position when >8 tiles away; own scatter corner when close
 */
function chaseTarget(
  ghost: GhostState,
  playerX: number,
  playerY: number,
  playerFacing: Direction,
): { x: number; y: number } {
  switch (ghost.personality) {
    case "blinky":
      return { x: playerX, y: playerY };

    case "pinky": {
      const ahead = 4 * TILE;
      switch (playerFacing) {
        case "right":
          return { x: playerX + ahead, y: playerY };
        case "left":
          return { x: playerX - ahead, y: playerY };
        case "down":
          return { x: playerX, y: playerY + ahead };
        case "up":
          return { x: playerX, y: playerY - ahead };
      }
      break;
    }

    case "clyde": {
      const dx = ghost.x - playerX;
      const dy = ghost.y - playerY;
      const distSq = dx * dx + dy * dy;
      const threshold = 8 * TILE;
      if (distSq > threshold * threshold) {
        return { x: playerX, y: playerY }; // far: chase
      }
      return SCATTER_TARGETS.clyde; // close: retreat
    }
  }
}

/**
 * Chooses the best next direction for the ghost at an intersection.
 *
 * Rules:
 *  - Never reverse (U-turns banned except on mode change).
 *  - Never enter a wall (door passability depends on mode).
 *  - Frightened: exclude the direction most directly toward Pac-Man, then pick
 *    randomly from the remainder. This breaks deterministic loops while still
 *    ensuring the ghost never actively runs at the player.
 *  - Otherwise: direction whose one-step-ahead tile centre is closest to target.
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
    const nx = x + (d === "right" ? TILE : d === "left" ? -TILE : 0);
    const ny = y + (d === "down" ? TILE : d === "up" ? -TILE : 0);
    return !ghostIsWallAt(maze, nx, ny, mode);
  });

  if (valid.length === 0) return reverse;

  if (mode === "frightened") {
    // Find the direction that leads most directly toward Pac-Man (target) and
    // remove it from the candidate pool, then pick randomly from the rest.
    // This prevents the ghost from charging at the player while also breaking
    // the deterministic loops that pure max-distance flee creates.
    const toward = valid.reduce((worst, d) => {
      const nx = x + (d === "right" ? TILE : d === "left" ? -TILE : 0);
      const ny = y + (d === "down" ? TILE : d === "up" ? -TILE : 0);
      const dist = (nx - targetX) ** 2 + (ny - targetY) ** 2;
      const bx = x + (worst === "right" ? TILE : worst === "left" ? -TILE : 0);
      const by = y + (worst === "down" ? TILE : worst === "up" ? -TILE : 0);
      const worstDist = (bx - targetX) ** 2 + (by - targetY) ** 2;
      return dist < worstDist ? d : worst;
    });
    const pool = valid.filter((d) => d !== toward);
    const candidates = pool.length > 0 ? pool : valid;
    return candidates[
      Math.floor(Math.random() * candidates.length)
    ] as Direction;
  }

  return valid.reduce((best, d) => {
    const nx = x + (d === "right" ? TILE : d === "left" ? -TILE : 0);
    const ny = y + (d === "down" ? TILE : d === "up" ? -TILE : 0);
    const dist = (nx - targetX) ** 2 + (ny - targetY) ** 2;
    const bx = x + (best === "right" ? TILE : best === "left" ? -TILE : 0);
    const by = y + (best === "down" ? TILE : best === "up" ? -TILE : 0);
    const bestDist = (bx - targetX) ** 2 + (by - targetY) ** 2;
    return dist < bestDist ? d : best;
  });
}

/**
 * Pure function — returns the new GhostState for the next frame.
 *
 * @param ghost         Current state
 * @param playerX       Player pixel x
 * @param playerY       Player pixel y
 * @param playerFacing  Player facing direction (used by Pinky's targeting)
 * @param dt            Frame delta-time in seconds
 * @param maze          Maze state for wall checks
 * @param isChasing     True when the global mode is chase, false for scatter
 */
export function updateGhost(
  ghost: GhostState,
  playerX: number,
  playerY: number,
  playerFacing: Direction,
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
    return { ...ghost, mode, penTimer, frightenedTimer };
  }

  // ── Target selection ────────────────────────────────────────────────────────
  let targetX: number;
  let targetY: number;

  switch (mode) {
    case "exiting":
      targetX = PEN_EXIT_X;
      targetY = PEN_EXIT_Y;
      break;
    case "scatter": {
      const corner = SCATTER_TARGETS[ghost.personality];
      targetX = corner.x;
      targetY = corner.y;
      break;
    }
    case "chase": {
      const t = chaseTarget(ghost, playerX, playerY, playerFacing);
      targetX = t.x;
      targetY = t.y;
      break;
    }
    case "frightened":
      targetX = playerX;
      targetY = playerY;
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

  const axisFrom = movingH ? prevX : prevY;
  const axisTo = movingH ? x : y;
  const crossed = findCrossedCenter(axisFrom, axisTo);

  if (crossed !== null) {
    const distToCenter = Math.abs(crossed - axisFrom);
    const remaining = dist - distToCenter;

    if (movingH) {
      x = crossed;
      y = snapToCenter(prevY);
    } else {
      y = crossed;
      x = snapToCenter(prevX);
    }

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

    dir = pickDirection(x, y, dir, targetX, targetY, mode, maze);

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

  return { ...ghost, x, y, dir, mode, frightenedTimer, penTimer };
}
