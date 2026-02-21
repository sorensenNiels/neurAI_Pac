import { describe, expect, it } from "vitest";
import type { Dot } from "../src/maze/dots";
import { eatDots, TILE } from "../src/maze/dots";

// Helper to create a plain dot for use in tests
const dot = (x: number, y: number, isPellet = false): Dot => ({
  x,
  y,
  isPellet,
});

describe("eatDots", () => {
  it("removes a dot whose centre is within eatRadius", () => {
    const dots = [dot(100, 100)];
    expect(eatDots(dots, 100, 100, 10)).toHaveLength(0);
  });

  it("removes a dot that is exactly at eatRadius (boundary — inside)", () => {
    // distance² = eatRadius² is NOT > eatRadius², so it is removed
    const dots = [dot(110, 100)];
    expect(eatDots(dots, 100, 100, 10)).toHaveLength(0);
  });

  it("keeps a dot that is beyond eatRadius", () => {
    const dots = [dot(200, 200)];
    expect(eatDots(dots, 100, 100, 10)).toHaveLength(1);
  });

  it("only removes dots within range, leaving others intact", () => {
    const close = dot(100, 100);
    const far = dot(200, 200);
    const result = eatDots([close, far], 100, 100, 10);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(far);
  });

  it("does not mutate the original array", () => {
    const dots = [dot(100, 100)];
    eatDots(dots, 100, 100, 10);
    expect(dots).toHaveLength(1);
  });

  it("returns an empty array when all dots are eaten", () => {
    const dots = [dot(0, 0), dot(1, 1)];
    expect(eatDots(dots, 0, 0, 50)).toHaveLength(0);
  });

  it("preserves isPellet on kept dots", () => {
    const pellet = dot(200, 200, true);
    const result = eatDots([pellet], 100, 100, 10);
    expect(result[0]?.isPellet).toBe(true);
  });
});

// Sanity-check that TILE is still accessible from dots.ts (re-exported from tiles.ts)
describe("TILE re-export", () => {
  it("exports TILE = 20", () => {
    expect(TILE).toBe(20);
  });
});
