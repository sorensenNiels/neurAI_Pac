import { describe, it, expect } from "vitest";
import { createPlayer, updatePlayer, SPEED, PACMAN_RADIUS } from "../src/entities/player";

const BOUNDS = { width: 560, height: 620 };

describe("createPlayer", () => {
  it("spawns at canvas centre", () => {
    const p = createPlayer(560, 620);
    expect(p.x).toBe(280);
    expect(p.y).toBe(310);
  });

  it("starts facing right and not moving", () => {
    const p = createPlayer(560, 620);
    expect(p.facing).toBe("right");
    expect(p.isMoving).toBe(false);
    expect(p.mouthTimer).toBe(0);
  });
});

describe("updatePlayer — movement", () => {
  it("moves right by SPEED * dt", () => {
    const p = createPlayer(560, 620);
    const next = updatePlayer(p, "right", 1, BOUNDS);
    expect(next.x).toBeCloseTo(p.x + SPEED);
  });

  it("moves left by SPEED * dt", () => {
    const p = createPlayer(560, 620);
    const next = updatePlayer(p, "left", 1, BOUNDS);
    expect(next.x).toBeCloseTo(p.x - SPEED);
  });

  it("moves up by SPEED * dt", () => {
    const p = createPlayer(560, 620);
    const next = updatePlayer(p, "up", 1, BOUNDS);
    expect(next.y).toBeCloseTo(p.y - SPEED);
  });

  it("moves down by SPEED * dt", () => {
    const p = createPlayer(560, 620);
    const next = updatePlayer(p, "down", 1, BOUNDS);
    expect(next.y).toBeCloseTo(p.y + SPEED);
  });

  it("does not move when direction is null", () => {
    const p = createPlayer(560, 620);
    const next = updatePlayer(p, null, 0.016, BOUNDS);
    expect(next.x).toBe(p.x);
    expect(next.y).toBe(p.y);
  });
});

describe("updatePlayer — bounds clamping", () => {
  it("clamps x to the right edge", () => {
    const p = { ...createPlayer(560, 620), x: 559 };
    const next = updatePlayer(p, "right", 1, BOUNDS);
    expect(next.x).toBe(BOUNDS.width - PACMAN_RADIUS);
  });

  it("clamps x to the left edge", () => {
    const p = { ...createPlayer(560, 620), x: 1 };
    const next = updatePlayer(p, "left", 1, BOUNDS);
    expect(next.x).toBe(PACMAN_RADIUS);
  });

  it("clamps y to the top edge", () => {
    const p = { ...createPlayer(560, 620), y: 1 };
    const next = updatePlayer(p, "up", 1, BOUNDS);
    expect(next.y).toBe(PACMAN_RADIUS);
  });

  it("clamps y to the bottom edge", () => {
    const p = { ...createPlayer(560, 620), y: 619 };
    const next = updatePlayer(p, "down", 1, BOUNDS);
    expect(next.y).toBe(BOUNDS.height - PACMAN_RADIUS);
  });
});

describe("updatePlayer — facing and animation state", () => {
  it("updates facing to match the held direction", () => {
    const p = createPlayer(560, 620);
    const next = updatePlayer(p, "up", 0.016, BOUNDS);
    expect(next.facing).toBe("up");
  });

  it("keeps the last facing direction when no key is held", () => {
    const p = { ...createPlayer(560, 620), facing: "left" as const };
    const next = updatePlayer(p, null, 0.016, BOUNDS);
    expect(next.facing).toBe("left");
  });

  it("advances mouthTimer only while moving", () => {
    const p = createPlayer(560, 620);
    const moving = updatePlayer(p, "right", 0.1, BOUNDS);
    expect(moving.mouthTimer).toBeCloseTo(0.1);

    const stopped = updatePlayer(moving, null, 0.1, BOUNDS);
    expect(stopped.mouthTimer).toBeCloseTo(0.1); // unchanged
  });

  it("sets isMoving true when a direction is held", () => {
    const p = createPlayer(560, 620);
    expect(updatePlayer(p, "down", 0.016, BOUNDS).isMoving).toBe(true);
  });

  it("sets isMoving false when no direction is held", () => {
    const p = createPlayer(560, 620);
    expect(updatePlayer(p, null, 0.016, BOUNDS).isMoving).toBe(false);
  });
});
