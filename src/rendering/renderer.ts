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
