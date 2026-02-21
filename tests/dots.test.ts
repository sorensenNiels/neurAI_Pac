import { describe, it, expect } from "vitest";
import { createDots, eatDots, TILE } from "../src/maze/dots";

describe("createDots", () => {
  it("places every dot on a tile-grid intersection", () => {
    // Put spawn far off-canvas so no dots are skipped by the clear zone
    const dots = createDots(200, 200, -999, -999);
    for (const dot of dots) {
      expect(dot.x % TILE).toBe(0);
      expect(dot.y % TILE).toBe(0);
    }
  });

  it("excludes dots inside the spawn clear zone", () => {
    const spawnX = 100;
    const spawnY = 100;
    const skipRadius = TILE * 3;
    const dots = createDots(400, 400, spawnX, spawnY);
    for (const dot of dots) {
      const dx = dot.x - spawnX;
      const dy = dot.y - spawnY;
      expect(dx * dx + dy * dy).toBeGreaterThan(skipRadius * skipRadius);
    }
  });

  it("includes dots that are outside the clear zone", () => {
    // Spawn in the corner — most of the canvas should have dots
    const dots = createDots(200, 200, 0, 0);
    expect(dots.length).toBeGreaterThan(0);
  });

  it("returns an empty array for a canvas too small to fit any dots", () => {
    // Canvas of 15×15 with TILE=20 — no col*TILE fits inside
    const dots = createDots(15, 15, 0, 0);
    expect(dots).toHaveLength(0);
  });
});

describe("eatDots", () => {
  it("removes a dot whose centre is within eatRadius", () => {
    const dots = [{ x: 100, y: 100 }];
    const result = eatDots(dots, 100, 100, 10);
    expect(result).toHaveLength(0);
  });

  it("removes a dot that is exactly at eatRadius (boundary — inside)", () => {
    // distance² = eatRadius² is NOT > eatRadius², so it should be removed
    const dots = [{ x: 110, y: 100 }];
    const result = eatDots(dots, 100, 100, 10);
    expect(result).toHaveLength(0);
  });

  it("keeps a dot that is beyond eatRadius", () => {
    const dots = [{ x: 200, y: 200 }];
    const result = eatDots(dots, 100, 100, 10);
    expect(result).toHaveLength(1);
  });

  it("only removes dots within range, leaving others intact", () => {
    const dots = [
      { x: 100, y: 100 }, // close — eaten
      { x: 200, y: 200 }, // far — kept
    ];
    const result = eatDots(dots, 100, 100, 10);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ x: 200, y: 200 });
  });

  it("does not mutate the original array", () => {
    const dots = [{ x: 100, y: 100 }];
    eatDots(dots, 100, 100, 10);
    expect(dots).toHaveLength(1);
  });

  it("returns an empty array when all dots are eaten", () => {
    const dots = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    expect(eatDots(dots, 0, 0, 50)).toHaveLength(0);
  });
});
