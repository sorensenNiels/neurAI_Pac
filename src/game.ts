export class Game {
  private ctx: CanvasRenderingContext2D;
  private lastTime = 0;
  private rafId = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D canvas context");
    this.ctx = ctx;

    canvas.width = 560;  // 28 tiles × 20px
    canvas.height = 620; // 31 tiles × 20px
  }

  start(): void {
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
  }

  private loop(timestamp: number): void {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1); // seconds, capped at 100ms
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(_dt: number): void {
    // Game logic goes here
  }

  private render(): void {
    const { ctx, canvas } = this;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Placeholder: draw "PACMAN" in the center until we have real rendering
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 40px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PACMAN", canvas.width / 2, canvas.height / 2);
  }
}
