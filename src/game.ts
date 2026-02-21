import { Input } from "./input";
import type { Direction } from "./input";

const SPEED = 120;        // pixels per second
const PACMAN_RADIUS = 10; // pac-man radius in pixels
const DOT_RADIUS = 3;     // food dot radius in pixels
const TILE = 20;          // grid cell size in pixels

// Mouth animation
// The mouth is modelled as a half-angle that grows and shrinks each frame.
// MAX_MOUTH = 45° means each jaw travels 45° from centre — a classic wide chomp.
const MOUTH_SPEED = 8;                    // full open→close cycles per second
const MAX_MOUTH = 0.25 * Math.PI;        // 45° — maximum half-angle when fully open
const STOPPED_MOUTH = 0.15 * Math.PI;   // 27° — fixed half-angle when standing still

// For each direction, the angle (in radians, clockwise from 3 o'clock) that
// points toward the centre of the open mouth.
//
//   right →   0°  (3 o'clock)
//   down  →  90°  (6 o'clock)
//   left  → 180°  (9 o'clock)
//   up    → 270°  (12 o'clock)
//
// The arc is then drawn from (facingAngle + mouthOpen) clockwise to
// (facingAngle − mouthOpen), which gives us the body. closePath() adds the
// two straight edges of the wedge, completing the pac-man shape.
const FACING_ANGLES: Record<Direction, number> = {
  right: 0,
  down:  0.5 * Math.PI,
  left:  Math.PI,
  up:    1.5 * Math.PI,
};

interface Dot {
  x: number;
  y: number;
}

/**
 * Builds the initial grid of food dots.
 * Dots are placed at every tile intersection, skipping any that start too
 * close to pac-man's spawn point so there's breathing room at the start.
 */
function createDots(width: number, height: number, spawnX: number, spawnY: number): Dot[] {
  const dots: Dot[] = [];
  const skipRadius = TILE * 3; // clear zone around pac-man's start position

  for (let col = 1; col * TILE < width; col++) {
    for (let row = 1; row * TILE < height; row++) {
      const x = col * TILE;
      const y = row * TILE;
      const dx = x - spawnX;
      const dy = y - spawnY;
      if (dx * dx + dy * dy > skipRadius * skipRadius) {
        dots.push({ x, y });
      }
    }
  }

  return dots;
}

export class Game {
  private ctx: CanvasRenderingContext2D;
  private lastTime = 0;
  private rafId = 0;
  private input: Input;

  // Player state
  private x: number;
  private y: number;
  private facing: Direction = "right";
  private mouthTimer = 0; // advances only while moving; drives the chomp animation
  private isMoving = false;

  // World state
  private dots: Dot[];

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D canvas context");
    this.ctx = ctx;

    canvas.width  = 560; // 28 tiles × 20px
    canvas.height = 620; // 31 tiles × 20px

    this.x = canvas.width  / 2;
    this.y = canvas.height / 2;

    this.input = new Input();
    this.dots  = createDots(canvas.width, canvas.height, this.x, this.y);
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
    const dir = this.input.direction;

    this.isMoving = dir !== null;

    if (dir !== null) {
      this.facing = dir;
      this.mouthTimer += dt; // only tick while a key is held
    }

    // Move
    const dist = SPEED * dt;
    switch (dir) {
      case "up":    this.y -= dist; break;
      case "down":  this.y += dist; break;
      case "left":  this.x -= dist; break;
      case "right": this.x += dist; break;
    }

    // Clamp to canvas bounds
    this.x = Math.max(PACMAN_RADIUS, Math.min(this.canvas.width  - PACMAN_RADIUS, this.x));
    this.y = Math.max(PACMAN_RADIUS, Math.min(this.canvas.height - PACMAN_RADIUS, this.y));

    // Eat any dot whose centre is within pac-man's radius
    this.dots = this.dots.filter((dot) => {
      const dx = dot.x - this.x;
      const dy = dot.y - this.y;
      return dx * dx + dy * dy > PACMAN_RADIUS * PACMAN_RADIUS;
    });
  }

  private render(): void {
    const { ctx, canvas } = this;

    // Background
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- Dots ---
    ctx.fillStyle = "#fff";
    for (const dot of this.dots) {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, DOT_RADIUS, 0, 2 * Math.PI);
      ctx.fill();
    }

    // --- Pac-Man ---
    // The mouth half-angle oscillates between 0 (closed) and MAX_MOUTH (wide open)
    // using an absolute sine wave — this gives the classic chomping rhythm.
    const mouthOpen = this.isMoving
      ? Math.abs(Math.sin(this.mouthTimer * MOUTH_SPEED)) * MAX_MOUTH
      : STOPPED_MOUTH;

    const facingAngle = FACING_ANGLES[this.facing];

    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.arc(this.x, this.y, PACMAN_RADIUS, facingAngle + mouthOpen, facingAngle - mouthOpen);
    ctx.closePath();
    ctx.fill();
  }
}
