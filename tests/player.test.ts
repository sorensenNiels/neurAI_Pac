import { describe, expect, it } from "vitest";
import {
  createPlayer,
  PACMAN_RADIUS,
  SPEED,
  updatePlayer,
} from "../src/entities/player";

const BOUNDS = { width: 560, height: 620 };

describe("createPlayer", () => {
  it("spawns at the given pixel position", () => {
    const p = createPlayer(280, 310);
    expect(p.x).toBe(280);
    expect(p.y).toBe(310);
  });

  it("starts facing right and not moving", () => {
    const p = createPlayer(280, 310);
    expect(p.facing).toBe("right");
    expect(p.isMoving).toBe(false);
    expect(p.mouthTimer).toBe(0);
  });

  it("starts with no current or desired direction", () => {
    const p = createPlayer(280, 310);
    expect(p.currentDir).toBeNull();
    expect(p.desiredDir).toBeNull();
  });
});

describe("updatePlayer — movement", () => {
  it("moves right by SPEED * dt", () => {
    const p = createPlayer(280, 310);
    const next = updatePlayer(p, "right", 1, BOUNDS);
    expect(next.x).toBeCloseTo(p.x + SPEED);
  });

  it("moves left by SPEED * dt", () => {
    const p = createPlayer(280, 310);
    const next = updatePlayer(p, "left", 1, BOUNDS);
    expect(next.x).toBeCloseTo(p.x - SPEED);
  });

  it("moves up by SPEED * dt", () => {
    const p = createPlayer(280, 310);
    const next = updatePlayer(p, "up", 1, BOUNDS);
    expect(next.y).toBeCloseTo(p.y - SPEED);
  });

  it("moves down by SPEED * dt", () => {
    const p = createPlayer(280, 310);
    const next = updatePlayer(p, "down", 1, BOUNDS);
    expect(next.y).toBeCloseTo(p.y + SPEED);
  });

  it("does not move when no key is pressed and Pac-Man has not started", () => {
    const p = createPlayer(280, 310);
    const next = updatePlayer(p, null, 0.016, BOUNDS);
    expect(next.x).toBe(p.x);
    expect(next.y).toBe(p.y);
  });
});

describe("updatePlayer — autonomous movement", () => {
  it("continues moving in the same direction after key is released", () => {
    const p = createPlayer(280, 310);
    const started = updatePlayer(p, "right", 0.1, BOUNDS); // press right
    const continued = updatePlayer(started, null, 0.1, BOUNDS); // release key
    expect(continued.x).toBeGreaterThan(started.x);
    expect(continued.isMoving).toBe(true);
  });

  it("turns at the next opportunity when a new direction is queued", () => {
    const p = createPlayer(280, 310);
    const moving = updatePlayer(p, "right", 0.1, BOUNDS); // moving right
    const turned = updatePlayer(moving, "up", 0.1, BOUNDS); // request up (no walls)
    expect(turned.facing).toBe("up");
    expect(turned.y).toBeLessThan(moving.y);
  });

  it("snaps to the nearest tile centre when turning perpendicular", () => {
    // Pac-Man at x=292 (2 px past the tile-14 centre at 290), moving right.
    // Requesting up: should snap x to 290 before committing the turn.
    const p = { ...createPlayer(280, 310), x: 292, currentDir: "right" as const };
    const turned = updatePlayer(p, "up", 0, BOUNDS); // dt=0: no travel, just turn
    expect(turned.x).toBe(290);
    expect(turned.currentDir).toBe("up");
  });

  it("keeps trying a queued turn while it is blocked", () => {
    // Wall only above; Pac-Man keeps moving right with desiredDir queued.
    const p = createPlayer(280, 310);
    const moving = updatePlayer(p, "right", 0.016, BOUNDS);
    const wallAbove = (_x: number, y: number) => y < 310; // wall above centre row
    const blocked = updatePlayer(moving, "up", 0.016, BOUNDS, wallAbove);
    expect(blocked.currentDir).toBe("right"); // still moving right
    expect(blocked.desiredDir).toBe("up"); // turn queued for later
  });

  it("stops when the current direction hits a wall", () => {
    const p = createPlayer(280, 310);
    const moving = updatePlayer(p, "right", 0.016, BOUNDS);
    const alwaysWall = () => true;
    const stopped = updatePlayer(moving, null, 0.016, BOUNDS, alwaysWall);
    expect(stopped.x).toBe(moving.x);
    expect(stopped.isMoving).toBe(false);
  });
});

describe("updatePlayer — bounds clamping", () => {
  it("clamps x to the right edge", () => {
    const p = { ...createPlayer(280, 310), x: 559 };
    const next = updatePlayer(p, "right", 1, BOUNDS);
    expect(next.x).toBe(BOUNDS.width - PACMAN_RADIUS);
  });

  it("clamps x to the left edge", () => {
    const p = { ...createPlayer(280, 310), x: 1 };
    const next = updatePlayer(p, "left", 1, BOUNDS);
    expect(next.x).toBe(PACMAN_RADIUS);
  });

  it("clamps y to the top edge", () => {
    const p = { ...createPlayer(280, 310), y: 1 };
    const next = updatePlayer(p, "up", 1, BOUNDS);
    expect(next.y).toBe(PACMAN_RADIUS);
  });

  it("clamps y to the bottom edge", () => {
    const p = { ...createPlayer(280, 310), y: 619 };
    const next = updatePlayer(p, "down", 1, BOUNDS);
    expect(next.y).toBe(BOUNDS.height - PACMAN_RADIUS);
  });
});

describe("updatePlayer — wall collision", () => {
  it("stops rightward movement when the leading edge hits a wall", () => {
    const p = createPlayer(280, 310);
    const alwaysWall = () => true;
    const next = updatePlayer(p, "right", 0.016, BOUNDS, alwaysWall);
    expect(next.x).toBe(p.x);
  });

  it("stops leftward movement when the leading edge hits a wall", () => {
    const p = createPlayer(280, 310);
    const alwaysWall = () => true;
    const next = updatePlayer(p, "left", 0.016, BOUNDS, alwaysWall);
    expect(next.x).toBe(p.x);
  });

  it("allows movement when isWallAt returns false", () => {
    const p = createPlayer(280, 310);
    const noWalls = () => false;
    const next = updatePlayer(p, "right", 0.1, BOUNDS, noWalls);
    expect(next.x).toBeGreaterThan(p.x);
  });

  it("stops rightward movement when only the upper-diagonal probe hits a wall", () => {
    // Simulates a wall tile above-right that the single centre-point check
    // would have missed. The diagonal probe at (nx+7, y-7) must catch it.
    const p = createPlayer(280, 310);
    const upperWallOnly = (_x: number, y: number) => y < p.y; // wall above centre
    const next = updatePlayer(p, "right", 0.016, BOUNDS, upperWallOnly);
    expect(next.x).toBe(p.x);
  });

  it("stops downward movement when only the right-diagonal probe hits a wall", () => {
    const p = createPlayer(280, 310);
    const rightWallOnly = (x: number, _y: number) => x > p.x; // wall right of centre
    const next = updatePlayer(p, "down", 0.016, BOUNDS, rightWallOnly);
    expect(next.y).toBe(p.y);
  });
});

describe("updatePlayer — facing and animation state", () => {
  it("updates facing to match the active direction", () => {
    const p = createPlayer(280, 310);
    const next = updatePlayer(p, "up", 0.016, BOUNDS);
    expect(next.facing).toBe("up");
  });

  it("keeps the last facing direction when stationary", () => {
    const p = { ...createPlayer(280, 310), facing: "left" as const };
    const next = updatePlayer(p, null, 0.016, BOUNDS);
    expect(next.facing).toBe("left");
  });

  it("advances mouthTimer while Pac-Man is moving", () => {
    const p = createPlayer(280, 310);
    const moving = updatePlayer(p, "right", 0.1, BOUNDS);
    expect(moving.mouthTimer).toBeCloseTo(0.1);
  });

  it("continues advancing mouthTimer after key release (autonomous movement)", () => {
    const p = createPlayer(280, 310);
    const moving = updatePlayer(p, "right", 0.1, BOUNDS);
    const continued = updatePlayer(moving, null, 0.1, BOUNDS);
    expect(continued.mouthTimer).toBeCloseTo(0.2);
  });

  it("does not advance mouthTimer before the first key press", () => {
    const p = createPlayer(280, 310);
    const still = updatePlayer(p, null, 0.1, BOUNDS);
    expect(still.mouthTimer).toBeCloseTo(0);
  });

  it("does not advance mouthTimer when blocked by a wall", () => {
    const p = createPlayer(280, 310);
    const alwaysWall = () => true;
    const blocked = updatePlayer(p, "right", 0.1, BOUNDS, alwaysWall);
    expect(blocked.mouthTimer).toBeCloseTo(0);
  });

  it("sets isMoving true when Pac-Man actually moves", () => {
    const p = createPlayer(280, 310);
    expect(updatePlayer(p, "down", 0.016, BOUNDS).isMoving).toBe(true);
  });

  it("sets isMoving false at start before any key press", () => {
    const p = createPlayer(280, 310);
    expect(updatePlayer(p, null, 0.016, BOUNDS).isMoving).toBe(false);
  });
});
