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

  it("does not move when direction is null", () => {
    const p = createPlayer(280, 310);
    const next = updatePlayer(p, null, 0.016, BOUNDS);
    expect(next.x).toBe(p.x);
    expect(next.y).toBe(p.y);
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
});

describe("updatePlayer — facing and animation state", () => {
  it("updates facing to match the held direction", () => {
    const p = createPlayer(280, 310);
    const next = updatePlayer(p, "up", 0.016, BOUNDS);
    expect(next.facing).toBe("up");
  });

  it("keeps the last facing direction when no key is held", () => {
    const p = { ...createPlayer(280, 310), facing: "left" as const };
    const next = updatePlayer(p, null, 0.016, BOUNDS);
    expect(next.facing).toBe("left");
  });

  it("advances mouthTimer only while moving", () => {
    const p = createPlayer(280, 310);
    const moving = updatePlayer(p, "right", 0.1, BOUNDS);
    expect(moving.mouthTimer).toBeCloseTo(0.1);

    const stopped = updatePlayer(moving, null, 0.1, BOUNDS);
    expect(stopped.mouthTimer).toBeCloseTo(0.1); // unchanged
  });

  it("sets isMoving true when a direction is held", () => {
    const p = createPlayer(280, 310);
    expect(updatePlayer(p, "down", 0.016, BOUNDS).isMoving).toBe(true);
  });

  it("sets isMoving false when no direction is held", () => {
    const p = createPlayer(280, 310);
    expect(updatePlayer(p, null, 0.016, BOUNDS).isMoving).toBe(false);
  });
});
