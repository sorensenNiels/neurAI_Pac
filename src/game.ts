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
} from "./rendering/renderer";

/**
 * Game — the top-level orchestrator.
 *
 * Owns only:
 *   1. The RAF game loop (start / stop / loop)
 *   2. References to the canvas, Input handler, and current maze
 *   3. The current game state (player + dots)
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

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D canvas context");
    this.ctx = ctx;

    canvas.width = 560; // 28 tiles × 20px
    canvas.height = 620; // 31 tiles × 20px

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
    const bounds = { width: this.canvas.width, height: this.canvas.height };
    const wallFn = (x: number, y: number) => isWallAt(this.maze, x, y);

    this.player = updatePlayer(
      this.player,
      this.input.direction,
      dt,
      bounds,
      wallFn,
    );

    // Tunnel wrapping — at the tunnel row, the canvas edges are open passages
    // rather than hard boundaries, so we override the normal clamping.
    const playerRow = Math.floor(this.player.y / TILE);
    if (playerRow === this.maze.tunnelRow) {
      if (this.player.x < 0)
        this.player = { ...this.player, x: this.canvas.width - PACMAN_RADIUS };
      if (this.player.x > this.canvas.width)
        this.player = { ...this.player, x: PACMAN_RADIUS };
    }

    this.dots = eatDots(this.dots, this.player.x, this.player.y, PACMAN_RADIUS);
  }

  private render(): void {
    clearCanvas(this.ctx, this.canvas.width, this.canvas.height);
    drawMaze(this.ctx, this.maze);
    drawDots(this.ctx, this.dots);
    drawPlayer(this.ctx, this.player);
  }
}
