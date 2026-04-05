import { describe, expect, it } from "vitest";
import type { Dot } from "../src/maze/dots";
import {
  DOT_SCORE,
  eatDots,
  expireHeroPellet,
  PELLET_SCORE,
  spawnHeroPellet,
  sumDotScores,
  TILE,
} from "../src/maze/dots";

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

describe("spawnHeroPellet", () => {
  const normalDot = (x: number, y: number): Dot => ({ x, y, isPellet: false });
  const powerPellet = (x: number, y: number): Dot => ({ x, y, isPellet: true });

  it("marks exactly one dot as the hero pellet", () => {
    const dots = [normalDot(10, 10), normalDot(20, 20), normalDot(30, 30)];
    const result = spawnHeroPellet(dots);
    const heroes = result.filter((d) => d.isHeroPellet);
    expect(heroes).toHaveLength(1);
  });

  it("does not mark a power pellet as the hero pellet", () => {
    const dots = [powerPellet(10, 10), powerPellet(20, 20)];
    const result = spawnHeroPellet(dots);
    expect(result.every((d) => !d.isHeroPellet)).toBe(true);
  });

  it("preserves all dot coordinates and other fields", () => {
    const dots = [normalDot(10, 10), normalDot(20, 20)];
    const result = spawnHeroPellet(dots);
    expect(result).toHaveLength(2);
    for (let i = 0; i < dots.length; i++) {
      expect(result[i]?.x).toBe(dots[i]?.x);
      expect(result[i]?.y).toBe(dots[i]?.y);
      expect(result[i]?.isPellet).toBe(dots[i]?.isPellet);
    }
  });

  it("does not mutate the input array", () => {
    const dots = [normalDot(10, 10), normalDot(20, 20)];
    spawnHeroPellet(dots);
    expect(dots.every((d) => !d.isHeroPellet)).toBe(true);
  });

  it("returns unchanged array when no eligible dots exist", () => {
    const dots = [powerPellet(10, 10)];
    const result = spawnHeroPellet(dots);
    expect(result).toEqual(dots);
  });
});

describe("expireHeroPellet", () => {
  const normalDot = (x: number, y: number): Dot => ({ x, y, isPellet: false });

  it("clears the isHeroPellet flag, keeping position and other fields", () => {
    const dots: Dot[] = [
      { x: 10, y: 10, isPellet: false, isHeroPellet: true },
      normalDot(20, 20),
    ];
    const result = expireHeroPellet(dots);
    expect(result[0]?.isHeroPellet).toBe(false);
    expect(result[0]?.x).toBe(10);
    expect(result[0]?.isPellet).toBe(false);
  });

  it("leaves non-hero dots unchanged", () => {
    const dots = [normalDot(10, 10), normalDot(20, 20)];
    const result = expireHeroPellet(dots);
    expect(result).toEqual(dots);
  });

  it("does not mutate the input array", () => {
    const dots: Dot[] = [{ x: 10, y: 10, isPellet: false, isHeroPellet: true }];
    expireHeroPellet(dots);
    expect(dots[0]?.isHeroPellet).toBe(true);
  });
});

describe("sumDotScores", () => {
  const d = (isPellet: boolean): Dot => ({ x: 0, y: 0, isPellet });

  it("scores regular dots at DOT_SCORE each", () => {
    expect(sumDotScores([d(false), d(false), d(false)])).toBe(DOT_SCORE * 3);
  });

  it("scores power pellets at PELLET_SCORE each", () => {
    expect(sumDotScores([d(true), d(true)])).toBe(PELLET_SCORE * 2);
  });

  it("mixes dot and pellet values correctly", () => {
    expect(sumDotScores([d(false), d(true), d(false)])).toBe(
      DOT_SCORE * 2 + PELLET_SCORE,
    );
  });

  it("returns 0 for an empty array", () => {
    expect(sumDotScores([])).toBe(0);
  });

  it("ignores the isHeroPellet flag (hero pellet counts as a regular dot)", () => {
    const hero: Dot = { x: 0, y: 0, isPellet: false, isHeroPellet: true };
    expect(sumDotScores([hero])).toBe(DOT_SCORE);
  });
});
