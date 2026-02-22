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
  drawMaze,
  drawPlayer,
  drawScore,
  HUD_HEIGHT,
} from "./rendering/renderer";

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
 * Game — the top-level orchestrator.
 *
 * Owns only:
 *   1. The RAF game loop (start / stop / loop)
 *   2. References to the canvas, Input handler, and current maze
 *   3. The current game state (player, dots, score)
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
  private dots: Dot[];
  private score = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D canvas context");
    this.ctx = ctx;

    canvas.width = 560; // 28 tiles × 20px
    canvas.height = 620 + HUD_HEIGHT; // 31 maze rows + 1 HUD row

    this.input = new Input();
    this.maze = createMaze(LEVEL_1);

    // Convert the maze's tile-coordinate start into pixels (tile centre)
    const startX = LEVEL_1.playerStart.col * TILE + TILE / 2;
    const startY = LEVEL_1.playerStart.row * TILE + TILE / 2;

    this.player = createPlayer(startX, startY);
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

    const prevCount = this.dots.length;
    this.dots = eatDots(this.dots, this.player.x, this.player.y, PACMAN_RADIUS);
    this.score += prevCount - this.dots.length;
  }

  private render(): void {
    clearCanvas(this.ctx, this.canvas.width, this.canvas.height);

    // HUD — drawn in canvas space before any transform
    drawScore(this.ctx, this.score, this.canvas.width);

    // Maze, dots and player live in maze coordinates; shift down past the HUD.
    this.ctx.save();
    this.ctx.translate(0, HUD_HEIGHT);
    drawMaze(this.ctx, this.maze);
    drawDots(this.ctx, this.dots);
    drawPlayer(this.ctx, this.player);
    this.ctx.restore();
  }
}
