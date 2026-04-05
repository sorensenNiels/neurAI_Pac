import type { FruitState } from "../entities/fruit";
import { FRUIT_EMOJI } from "../entities/fruit";
import type { GhostState } from "../entities/ghost";
import {
  GHOST_COLORS,
  GHOST_FLASH_THRESHOLD,
  GHOST_RADIUS,
} from "../entities/ghost";
import type { HighScoreEntry } from "../highscores";
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
    if (dot.isHeroPellet) {
      drawHeroPellet(ctx, dot.x, dot.y);
    } else {
      ctx.fillStyle = "#fff";
      const r = dot.isPellet ? DOT_RADIUS * 2.5 : DOT_RADIUS;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, r, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}

/**
 * Draws a glowing golden 5-pointed star to represent a Hero Pellet.
 * Larger and more distinctive than power pellets to signal its rarity.
 */
function drawHeroPellet(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
): void {
  const outerR = 8;
  const innerR = 3.5;
  const points = 5;
  const step = Math.PI / points;

  ctx.save();
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#FFD700";
  ctx.strokeStyle = "#FF8C00";
  ctx.lineWidth = 1;

  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = i * step - Math.PI / 2; // start from top
    const sx = cx + r * Math.cos(angle);
    const sy = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
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

/**
 * Draws the bonus fruit at its maze position using an emoji glyph.
 * Must be called inside the maze coordinate transform (after ctx.translate).
 */
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  fruit: FruitState,
): void {
  ctx.font = "18px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(FRUIT_EMOJI[fruit.type], fruit.x, fruit.y);
}

/** Draws Pac-Man with an animated chomping mouth. */
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
): void {
  if (player.dying) {
    drawPlayerDeath(ctx, player);
    return;
  }

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
 * Death animation — two phases driven by player.deathProgress (0 → 1):
 *
 * Phase 1 (0 → 0.6): The mouth opens wider and wider from the facing
 *   direction, eating the body inward until only a thin sliver remains.
 *   mouthOpen goes from STOPPED_MOUTH up to 0.97·π (just short of π so
 *   the canvas arc never degenerates into a full circle).
 *
 * Phase 2 (0.6 → 1.0): The remaining disc shrinks to nothing.
 */
function drawPlayerDeath(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
): void {
  const t = player.deathProgress;
  const facingAngle = FACING_ANGLES[player.facing];

  if (t < 0.6) {
    const phase = t / 0.6; // 0 → 1
    const mouthOpen = STOPPED_MOUTH + phase * (Math.PI * 0.97 - STOPPED_MOUTH);
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
  } else {
    const phase = (t - 0.6) / 0.4; // 0 → 1
    const r = PACMAN_RADIUS * (1 - phase);
    if (r > 0) {
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(player.x, player.y, r, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
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

/**
 * Draws the attract / start screen with the title, high-score table, and a
 * blinking "PRESS ENTER TO START" prompt.
 */
export function drawAttractScreen(
  ctx: CanvasRenderingContext2D,
  scores: HighScoreEntry[],
  width: number,
  height: number,
  blinkOn: boolean,
): void {
  // Background
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 52px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("PAC-MAN", width / 2, 76);

  // Decorative ghost row
  const ghostColors = ["#FF0000", "#FFB8FF", "#FFB852"];
  for (let i = 0; i < ghostColors.length; i++) {
    const gx = width / 2 + (i - 1) * 44;
    const gy = 110;
    const r = 12;
    ctx.fillStyle = ghostColors[i] ?? "#fff";
    ctx.beginPath();
    ctx.arc(gx, gy - r / 2, r, Math.PI, 0);
    ctx.lineTo(gx + r, gy + r / 2);
    const bR = r / 3;
    ctx.arc(gx + r - bR, gy + r / 2, bR, 0, Math.PI, true);
    ctx.arc(gx, gy + r / 2, bR, 0, Math.PI, true);
    ctx.arc(gx - r + bR, gy + r / 2, bR, 0, Math.PI, true);
    ctx.lineTo(gx - r, gy - r / 2);
    ctx.closePath();
    ctx.fill();
  }

  // High-scores heading
  ctx.fillStyle = "#00BFFF";
  ctx.font = "bold 18px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("HIGH SCORES", width / 2, 148);

  if (scores.length === 0) {
    ctx.fillStyle = "#888";
    ctx.font = "14px monospace";
    ctx.fillText("NO HIGH SCORES YET", width / 2, 190);
  } else {
    // Column positions
    const rankX = width / 2 - 160;
    const nameX = width / 2 - 80;
    const scoreX = width / 2 + 60;
    const lvlX = width / 2 + 140;
    const rowH = 26;
    const startY = 172;

    // Header row
    ctx.fillStyle = "#aaa";
    ctx.font = "13px monospace";
    ctx.textAlign = "left";
    ctx.fillText("#", rankX, startY);
    ctx.fillText("NAME", nameX, startY);
    ctx.fillText("SCORE", scoreX, startY);
    ctx.fillText("LVL", lvlX, startY);

    for (let i = 0; i < scores.length; i++) {
      const entry = scores[i];
      if (!entry) continue;
      const y = startY + rowH * (i + 1);

      // Alternate row colouring — top 3 get gold, rest white
      ctx.fillStyle = i === 0 ? "#FFD700" : i < 3 ? "#C0C0C0" : "#fff";
      ctx.font = i === 0 ? "bold 14px monospace" : "14px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${i + 1}.`, rankX, y);
      ctx.fillText(entry.initials, nameX, y);
      ctx.textAlign = "right";
      ctx.fillText(`${entry.score}`, scoreX + 50, y);
      ctx.textAlign = "left";
      ctx.fillText(`${entry.level}`, lvlX, y);
    }
  }

  // Blinking prompt
  if (blinkOn) {
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("PRESS ENTER TO START", width / 2, height - 28);
  }
}

/**
 * Draws the initials-entry screen shown when the player earns a new high score.
 * `initials` is a 3-element array of uppercase letters; `cursorPos` (0–2) is the
 * currently-active position. `blinkOn` drives the cursor blink.
 */
export function drawEnterInitials(
  ctx: CanvasRenderingContext2D,
  initials: string[],
  cursorPos: number,
  score: number,
  level: number,
  width: number,
  height: number,
  blinkOn: boolean,
): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  // Heading
  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 28px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("NEW HIGH SCORE!", width / 2, 100);

  // Score + level
  ctx.fillStyle = "#fff";
  ctx.font = "18px monospace";
  ctx.fillText(`SCORE: ${score}   LVL: ${level}`, width / 2, 140);

  // Prompt
  ctx.fillStyle = "#00BFFF";
  ctx.font = "bold 18px monospace";
  ctx.fillText("ENTER YOUR INITIALS", width / 2, 190);

  // Three letter boxes
  const boxW = 48;
  const boxH = 60;
  const gap = 16;
  const totalW = 3 * boxW + 2 * gap;
  const startX = width / 2 - totalW / 2;
  const boxY = 220;

  for (let i = 0; i < 3; i++) {
    const bx = startX + i * (boxW + gap);
    const isActive = i === cursorPos;

    // Box background
    ctx.fillStyle = isActive ? "#1a1aff" : "#222";
    ctx.fillRect(bx, boxY, boxW, boxH);

    // Box border
    ctx.strokeStyle = isActive ? "#00BFFF" : "#555";
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, boxY, boxW, boxH);

    // Letter
    ctx.fillStyle = "#fff";
    ctx.font = "bold 36px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials[i] ?? "A", bx + boxW / 2, boxY + boxH / 2);

    // Blinking cursor underline on active box
    if (isActive && blinkOn) {
      ctx.fillStyle = "#00BFFF";
      ctx.fillRect(bx + 6, boxY + boxH - 6, boxW - 12, 3);
    }
  }

  // Instructions
  ctx.fillStyle = "#aaa";
  ctx.font = "13px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("TYPE LETTERS  •  BACKSPACE to fix", width / 2, 316);
  ctx.fillText("ENTER to confirm", width / 2, 336);
}
