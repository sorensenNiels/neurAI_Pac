import type { Direction } from "../input";
import type { PlayerState } from "../entities/player";
import type { Dot } from "../maze/dots";
import { PACMAN_RADIUS, MOUTH_SPEED, MAX_MOUTH, STOPPED_MOUTH } from "../entities/player";
import { DOT_RADIUS } from "../maze/dots";

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
  down:  0.5 * Math.PI,
  left:  Math.PI,
  up:    1.5 * Math.PI,
};

export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
}

export function drawDots(ctx: CanvasRenderingContext2D, dots: Dot[]): void {
  ctx.fillStyle = "#fff";
  for (const dot of dots) {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, DOT_RADIUS, 0, 2 * Math.PI);
    ctx.fill();
  }
}

export function drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerState): void {
  // Mouth half-angle oscillates between 0 (closed) and MAX_MOUTH (fully open)
  // via |sin(t)|, producing the classic chomping rhythm. Timer pauses when
  // standing still, so the mouth rests at a fixed slightly-open angle.
  const mouthOpen = player.isMoving
    ? Math.abs(Math.sin(player.mouthTimer * MOUTH_SPEED)) * MAX_MOUTH
    : STOPPED_MOUTH;

  const facingAngle = FACING_ANGLES[player.facing];

  ctx.fillStyle = "#FFD700";
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.arc(player.x, player.y, PACMAN_RADIUS, facingAngle + mouthOpen, facingAngle - mouthOpen);
  ctx.closePath();
  ctx.fill();
}
