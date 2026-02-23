import type { GhostState } from "../entities/ghost";
import {
  GHOST_COLORS,
  GHOST_FLASH_THRESHOLD,
  GHOST_RADIUS,
} from "../entities/ghost";
import type { PlayerState } from "../entities/player";
import {
  MAX_MOUTH,
  MOUTH_SPEED,
  PACMAN_RADIUS,
  STOPPED_MOUTH,
} from "../entities/player";
import type { Direction } from "../input";
import type { Dot } from "../maze/dots";
import { DOT_RADIUS } from "../maze/dots";
import type { MazeState } from "../maze/maze";
import { TILE } from "../maze/tiles";

/** Height of the HUD strip drawn above the maze, in pixels. */
export const HUD_HEIGHT = TILE; // 20 px — one tile row

// Center angle of the mouth opening for each facing direction.
// Measured in radians, clockwise from 3 o'clock (the canvas x-axis).
//
//   right →   0°  (3 o'clock)
//   down  →  90°  (6 o'clock)
//   left  → 180°  (9 o'clock)
//   up    → 270°  (12 o'clock)
//
// The body arc runs from (facingAngle + mouthOpen) clockwise to
// (facingAngle − mouthOpen). closePath() adds the two straight jaw edges,
// completing the pac-man wedge shape.
const FACING_ANGLES: Record<Direction, number> = {
  right: 0,
  down: 0.5 * Math.PI,
  left: Math.PI,
  up: 1.5 * Math.PI,
};

const WALL_COLOR = "#0000cc"; // classic blue
const DOOR_COLOR = "#ffb8ff"; // pink — ghost-house entrance hint

export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
}

/** Draws all wall and door tiles. Call before drawDots / drawPlayer. */
export function drawMaze(ctx: CanvasRenderingContext2D, maze: MazeState): void {
  for (let row = 0; row < maze.rows; row++) {
    for (let col = 0; col < maze.cols; col++) {
      const tile = maze.tiles[row]?.[col];
      if (tile === "wall") {
        ctx.fillStyle = WALL_COLOR;
        ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
      } else if (tile === "door") {
        // Thin horizontal bar across the middle of the tile to hint at the ghost-house entrance
        ctx.fillStyle = DOOR_COLOR;
        ctx.fillRect(col * TILE, row * TILE + TILE / 2 - 2, TILE, 4);
      }
    }
  }
}

/** Draws all remaining (uneaten) dots and power pellets. */
export function drawDots(ctx: CanvasRenderingContext2D, dots: Dot[]): void {
  for (const dot of dots) {
    ctx.fillStyle = "#fff";
    const r = dot.isPellet ? DOT_RADIUS * 2.5 : DOT_RADIUS;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, r, 0, 2 * Math.PI);
    ctx.fill();
  }
}

/**
 * Draws the current level number centred in the HUD strip.
 * Call before any ctx.translate so coordinates are in canvas space.
 */
export function drawLevel(
  ctx: CanvasRenderingContext2D,
  level: number,
  canvasWidth: number,
): void {
  ctx.fillStyle = "#fff";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`LVL ${level}`, canvasWidth / 2, HUD_HEIGHT / 2);
}

/**
 * Draws the score in the HUD strip at the top of the canvas.
 * Call before any ctx.translate so coordinates are in canvas space.
 */
export function drawScore(
  ctx: CanvasRenderingContext2D,
  score: number,
  canvasWidth: number,
): void {
  ctx.fillStyle = "#fff";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(`${score}`, canvasWidth - 8, HUD_HEIGHT / 2);
}

/**
 * Draws remaining lives as small Pac-Man icons in the HUD strip.
 * Call before any ctx.translate so coordinates are in canvas space.
 */
export function drawLives(ctx: CanvasRenderingContext2D, lives: number): void {
  const r = 7;
  const spacing = 18;
  const mouthAngle = 0.25 * Math.PI;
  for (let i = 0; i < lives; i++) {
    const cx = 8 + r + i * spacing;
    const cy = HUD_HEIGHT / 2;
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, mouthAngle, 2 * Math.PI - mouthAngle);
    ctx.closePath();
    ctx.fill();
  }
}

/** Draws Pac-Man with an animated chomping mouth. */
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
): void {
  // Mouth half-angle oscillates between 0 (closed) and MAX_MOUTH (fully open)
  // via |sin(t)|, producing the classic chomping rhythm. Timer pauses when
  // standing still so the mouth rests at a fixed slightly-open angle.
  const mouthOpen = player.isMoving
    ? Math.abs(Math.sin(player.mouthTimer * MOUTH_SPEED)) * MAX_MOUTH
    : STOPPED_MOUTH;

  const facingAngle = FACING_ANGLES[player.facing];

  ctx.fillStyle = "#FFD700";
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.arc(
    player.x,
    player.y,
    PACMAN_RADIUS,
    facingAngle + mouthOpen,
    facingAngle - mouthOpen,
  );
  ctx.closePath();
  ctx.fill();
}

/**
 * Draws Blinky the ghost.
 *
 * Normal:     red body, white eyes with dark pupils
 * Frightened: blue body, simple white eyes
 * Flashing:   alternates white/blue body (last 2 s of frightened)
 * Eaten:      eyes only — ghost is returning to pen
 *
 * The classic ghost silhouette is a semicircle top + rectangular body with
 * three small bumps along the bottom edge.
 */
export function drawGhost(
  ctx: CanvasRenderingContext2D,
  ghost: GhostState,
): void {
  const { x, y, mode, frightenedTimer } = ghost;
  const r = GHOST_RADIUS;

  if (mode === "eaten") {
    // Eyes only — two white discs with blue pupils
    drawGhostEyes(ctx, x, y, r);
    return;
  }

  // Body colour
  let bodyColor: string;
  if (mode === "frightened") {
    const flashing = frightenedTimer < GHOST_FLASH_THRESHOLD;
    if (flashing) {
      bodyColor =
        Math.floor(frightenedTimer * 4) % 2 === 0 ? "#ffffff" : "#0000ff";
    } else {
      bodyColor = "#0000ff";
    }
  } else {
    bodyColor = GHOST_COLORS[ghost.personality];
  }

  // Ghost body path: semicircle top + rectangular sides + wavy bottom (3 bumps)
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  // Semicircle top
  ctx.arc(x, y - r / 2, r, Math.PI, 0);
  // Right side down
  ctx.lineTo(x + r, y + r / 2);
  // Wavy bottom — three bumps (right to left)
  const bumpR = r / 3;
  ctx.arc(x + r - bumpR, y + r / 2, bumpR, 0, Math.PI, true);
  ctx.arc(x, y + r / 2, bumpR, 0, Math.PI, true);
  ctx.arc(x - r + bumpR, y + r / 2, bumpR, 0, Math.PI, true);
  // Left side up
  ctx.lineTo(x - r, y - r / 2);
  ctx.closePath();
  ctx.fill();

  // Eyes (not drawn when frightened — just dots)
  if (mode === "frightened") {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.1, 2, 0, 2 * Math.PI);
    ctx.arc(x + r * 0.3, y - r * 0.1, 2, 0, 2 * Math.PI);
    ctx.fill();
  } else {
    drawGhostEyes(ctx, x, y, r);
  }
}

function drawGhostEyes(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
): void {
  const eyeR = r * 0.28;
  const pupilR = eyeR * 0.55;
  const eyeOffX = r * 0.3;
  const eyeY = y - r * 0.1;

  // White sclera
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x - eyeOffX, eyeY, eyeR, 0, 2 * Math.PI);
  ctx.arc(x + eyeOffX, eyeY, eyeR, 0, 2 * Math.PI);
  ctx.fill();

  // Blue pupils
  ctx.fillStyle = "#00f";
  ctx.beginPath();
  ctx.arc(x - eyeOffX, eyeY, pupilR, 0, 2 * Math.PI);
  ctx.arc(x + eyeOffX, eyeY, pupilR, 0, 2 * Math.PI);
  ctx.fill();
}

/**
 * Draws a semi-transparent "LEVEL CLEAR!" overlay centred on the canvas.
 * Call after all other drawing, before ctx.restore, so it covers everything.
 */
export function drawLevelComplete(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#00FF87";
  ctx.font = "bold 32px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("LEVEL CLEAR!", width / 2, height / 2);
}

/**
 * Draws a semi-transparent "GAME OVER" overlay centred on the canvas.
 * Call after all other drawing, before ctx.restore, so it covers everything.
 */
export function drawGameOver(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 32px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("GAME OVER", width / 2, height / 2);
}
