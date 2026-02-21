import { Input } from "./input";
import { createPlayer, updatePlayer, PACMAN_RADIUS } from "./entities/player";
import { createDots, eatDots } from "./maze/dots";
import { clearCanvas, drawDots, drawPlayer } from "./rendering/renderer";
import type { PlayerState } from "./entities/player";
import type { Dot } from "./maze/dots";

/**
 * Game — the top-level orchestrator.
 *
 * This class owns only three things:
 *   1. The RAF game loop (start / stop / loop)
 *   2. References to the canvas and Input handler
 *   3. The current game state (player + dots)
 *
 * All game logic lives in pure functions in entities/ and maze/.
 * All drawing lives in rendering/renderer.ts.
 * This class just wires them together each frame.
 */
export class Game {
  private ctx: CanvasRenderingContext2D;
  private lastTime = 0;
  private rafId = 0;
  private input: Input;
  private player: PlayerState;
  private dots: Dot[];

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D canvas context");
    this.ctx = ctx;

    canvas.width  = 560; // 28 tiles × 20px
    canvas.height = 620; // 31 tiles × 20px

    this.input  = new Input();
    this.player = createPlayer(canvas.width, canvas.height);
    this.dots   = createDots(canvas.width, canvas.height, this.player.x, this.player.y);
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
    this.player = updatePlayer(this.player, this.input.direction, dt, bounds);
    this.dots   = eatDots(this.dots, this.player.x, this.player.y, PACMAN_RADIUS);
  }

  private render(): void {
    const { ctx, canvas } = this;
    clearCanvas(ctx, canvas.width, canvas.height);
    drawDots(ctx, this.dots);
    drawPlayer(ctx, this.player);
  }
}
