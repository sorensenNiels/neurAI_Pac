import type { GhostState } from "./entities/ghost";
import {
  createGhost,
  GHOST_RADIUS,
  oppositeDir,
  updateGhost,
} from "./entities/ghost";
import type { PlayerState } from "./entities/player";
import { createPlayer, PACMAN_RADIUS, updatePlayer } from "./entities/player";
import { Input } from "./input";
import type { Dot } from "./maze/dots";
import { eatDots } from "./maze/dots";
import type { MazeState } from "./maze/maze";
import { createDotsFromMaze, createMaze, isWallAt } from "./maze/maze";
import { LEVEL_1 } from "./maze/mazeLayouts";
import { TILE } from "./maze/tiles";
import {
  clearCanvas,
  drawDots,
  drawGameOver,
  drawGhost,
  drawLives,
  drawMaze,
  drawPlayer,
  drawScore,
  HUD_HEIGHT,
} from "./rendering/renderer";

/** Collision threshold for ghost–player contact (px). */
const COLLISION_DIST = PACMAN_RADIUS + GHOST_RADIUS - 4; // 16 px

/** Scatter/chase cycle durations (seconds). */
const SCATTER_DURATION = 7;
const CHASE_DURATION = 20;

/** Duration of the respawn freeze after losing a life (seconds). */
const RESPAWN_FREEZE = 1.5;

/**
 * Pure function — teleports Pac-Man when its centre has fully crossed a tunnel
 * exit, placing it at the matching entrance on the opposite side.
 *
 * Called after updatePlayer each frame so the wrap happens in the same tick as
 * the exit.  Returns the player unchanged on any non-tunnel row.
 */
export function wrapTunnels(
  player: PlayerState,
  tunnelRow: number,
  canvasWidth: number,
): PlayerState {
  const row = Math.floor(player.y / TILE);
  if (row !== tunnelRow) return player;
  if (player.x < 0) return { ...player, x: canvasWidth - PACMAN_RADIUS };
  if (player.x >= canvasWidth) return { ...player, x: PACMAN_RADIUS };
  return player;
}

/**
 * Teleports a ghost position through the tunnel, same logic as wrapTunnels.
 */
function wrapGhostTunnel(
  ghost: GhostState,
  tunnelRow: number,
  canvasWidth: number,
): GhostState {
  const row = Math.floor(ghost.y / TILE);
  if (row !== tunnelRow) return ghost;
  if (ghost.x < 0) return { ...ghost, x: canvasWidth - GHOST_RADIUS };
  if (ghost.x >= canvasWidth) return { ...ghost, x: GHOST_RADIUS };
  return ghost;
}

/**
 * Game — the top-level orchestrator.
 *
 * Owns only:
 *   1. The RAF game loop (start / stop / loop)
 *   2. References to the canvas, Input handler, and current maze
 *   3. The current game state (player, ghost, dots, score, lives)
 *
 * All logic lives in pure functions in entities/ and maze/.
 * All drawing lives in rendering/renderer.ts.
 */
export class Game {
  private ctx: CanvasRenderingContext2D;
  private lastTime = 0;
  private rafId = 0;
  private input: Input;
  private maze: MazeState;
  private player: PlayerState;
  private ghost: GhostState;
  private dots: Dot[];
  private score = 0;
  private lives = 3;
  private respawnTimer = 0;
  private gameOver = false;
  private isChasing = false;
  private modeTimer = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D canvas context");
    this.ctx = ctx;

    canvas.width = 560; // 28 tiles × 20px
    canvas.height = 620 + HUD_HEIGHT; // 31 maze rows + 1 HUD row

    this.input = new Input();
    this.maze = createMaze(LEVEL_1);

    // Convert tile-coordinate starts into pixels (tile centres)
    const startX = LEVEL_1.playerStart.col * TILE + TILE / 2;
    const startY = LEVEL_1.playerStart.row * TILE + TILE / 2;
    const ghostStartX = LEVEL_1.ghostStart.col * TILE + TILE / 2;
    const ghostStartY = LEVEL_1.ghostStart.row * TILE + TILE / 2;

    this.player = createPlayer(startX, startY);
    this.ghost = createGhost(ghostStartX, ghostStartY);
    this.dots = createDotsFromMaze(this.maze);
  }

  start(): void {
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
    this.input.destroy();
  }

  private loop(timestamp: number): void {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    if (this.gameOver) return;

    // Respawn freeze — show the current frame but skip all physics
    if (this.respawnTimer > 0) {
      this.respawnTimer = Math.max(0, this.respawnTimer - dt);
      return;
    }

    const width = this.canvas.width;
    // Player physics live in maze coordinates (620px tall), not the full
    // canvas height (which includes the HUD strip).
    const mazeHeight = this.maze.rows * TILE;
    const { tunnelRow } = this.maze;

    // On the tunnel row the left and right canvas edges are open passages.
    // We intercept out-of-canvas probes on that row so canMoveInDir doesn't
    // treat them as walls, allowing Pac-Man to physically cross the edge.
    const wallFn = (px: number, py: number): boolean => {
      const row = Math.floor(py / TILE);
      if (row === tunnelRow && (px < 0 || px >= width)) return false;
      return isWallAt(this.maze, px, py);
    };

    // On the tunnel row extend x-bounds beyond the canvas so updatePlayer's
    // clamp doesn't snap Pac-Man back before wrapTunnels can fire.
    const playerRow = Math.floor(this.player.y / TILE);
    const bounds =
      playerRow === tunnelRow
        ? { width, height: mazeHeight, xMin: -TILE, xMax: width + TILE }
        : { width, height: mazeHeight };

    this.player = updatePlayer(
      this.player,
      this.input.direction,
      dt,
      bounds,
      wallFn,
    );

    this.player = wrapTunnels(this.player, tunnelRow, width);

    // Track pellet count before eating to detect power pellet consumption
    const pelletsBefore = this.dots.filter((d) => d.isPellet).length;

    const prevCount = this.dots.length;
    this.dots = eatDots(this.dots, this.player.x, this.player.y, PACMAN_RADIUS);
    this.score += prevCount - this.dots.length;

    // Power pellet eaten → frighten the ghost (unless it's already eaten)
    const pelletsAfter = this.dots.filter((d) => d.isPellet).length;
    if (pelletsAfter < pelletsBefore && this.ghost.mode !== "eaten") {
      this.ghost = {
        ...this.ghost,
        mode: "frightened",
        frightenedTimer: 8,
      };
    }

    // Scatter / chase global mode cycling
    this.modeTimer += dt;
    const phaseDuration = this.isChasing ? CHASE_DURATION : SCATTER_DURATION;
    if (this.modeTimer >= phaseDuration) {
      this.modeTimer = 0;
      this.isChasing = !this.isChasing;
      // Reverse ghost direction on mode switch (only in active maze modes)
      const g = this.ghost;
      if (g.mode === "scatter" || g.mode === "chase") {
        this.ghost = { ...g, dir: oppositeDir(g.dir) };
      }
    }

    // Update ghost AI
    this.ghost = updateGhost(
      this.ghost,
      this.player.x,
      this.player.y,
      dt,
      this.maze,
      this.isChasing,
    );

    // Tunnel wrapping for ghost
    this.ghost = wrapGhostTunnel(this.ghost, tunnelRow, width);

    // Collision detection
    const dx = this.player.x - this.ghost.x;
    const dy = this.player.y - this.ghost.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < COLLISION_DIST * COLLISION_DIST) {
      if (this.ghost.mode === "frightened") {
        // Player eats the ghost
        this.ghost = { ...this.ghost, mode: "eaten", frightenedTimer: 0 };
        this.score += 200;
      } else if (
        this.ghost.mode !== "eaten" &&
        this.ghost.mode !== "pen" &&
        this.ghost.mode !== "exiting"
      ) {
        // Ghost kills the player
        this.lives--;
        if (this.lives <= 0) {
          this.gameOver = true;
        } else {
          this.respawnTimer = RESPAWN_FREEZE;
          this.resetPositions();
        }
      }
    }
  }

  private resetPositions(): void {
    const startX = LEVEL_1.playerStart.col * TILE + TILE / 2;
    const startY = LEVEL_1.playerStart.row * TILE + TILE / 2;
    const ghostStartX = LEVEL_1.ghostStart.col * TILE + TILE / 2;
    const ghostStartY = LEVEL_1.ghostStart.row * TILE + TILE / 2;

    this.player = createPlayer(startX, startY);
    this.ghost = createGhost(ghostStartX, ghostStartY);
  }

  private render(): void {
    clearCanvas(this.ctx, this.canvas.width, this.canvas.height);

    // HUD — drawn in canvas space before any transform
    drawScore(this.ctx, this.score, this.canvas.width);
    drawLives(this.ctx, this.lives);

    // Maze, dots, ghost and player live in maze coordinates; shift down past the HUD.
    this.ctx.save();
    this.ctx.translate(0, HUD_HEIGHT);
    drawMaze(this.ctx, this.maze);
    drawDots(this.ctx, this.dots);
    drawGhost(this.ctx, this.ghost);
    drawPlayer(this.ctx, this.player);
    this.ctx.restore();

    if (this.gameOver) {
      drawGameOver(this.ctx, this.canvas.width, this.canvas.height);
    }
  }
}
