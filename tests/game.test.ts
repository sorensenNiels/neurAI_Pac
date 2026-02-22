import { describe, expect, it } from "vitest";
import { wrapTunnels } from "../src/game";
import { createPlayer, PACMAN_RADIUS, updatePlayer } from "../src/entities/player";

const CANVAS_WIDTH = 560;
const CANVAS_HEIGHT = 620;
const TUNNEL_ROW = 14;
// Pixel y-centre of the tunnel row (row 14 × 20px + 10px half-tile)
const TUNNEL_Y = TUNNEL_ROW * 20 + 10; // 290

describe("wrapTunnels", () => {
  it("wraps left exit to the right side", () => {
    const p = { ...createPlayer(-2, TUNNEL_Y), currentDir: "left" as const };
    const wrapped = wrapTunnels(p, TUNNEL_ROW, CANVAS_WIDTH);
    expect(wrapped.x).toBe(CANVAS_WIDTH - PACMAN_RADIUS); // 550
  });

  it("wraps right exit to the left side", () => {
    const p = { ...createPlayer(CANVAS_WIDTH, TUNNEL_Y), currentDir: "right" as const };
    const wrapped = wrapTunnels(p, TUNNEL_ROW, CANVAS_WIDTH);
    expect(wrapped.x).toBe(PACMAN_RADIUS); // 10
  });

  it("does not wrap when x is inside the canvas", () => {
    const p = { ...createPlayer(10, TUNNEL_Y), currentDir: "left" as const };
    expect(wrapTunnels(p, TUNNEL_ROW, CANVAS_WIDTH).x).toBe(10);
  });

  it("does not wrap on a non-tunnel row", () => {
    const p = { ...createPlayer(-2, 90), currentDir: "left" as const };
    expect(wrapTunnels(p, TUNNEL_ROW, CANVAS_WIDTH).x).toBe(-2);
  });

  it("preserves all other player state when wrapping", () => {
    const p = { ...createPlayer(-4, TUNNEL_Y), currentDir: "left" as const, facing: "left" as const };
    const wrapped = wrapTunnels(p, TUNNEL_ROW, CANVAS_WIDTH);
    expect(wrapped.currentDir).toBe("left");
    expect(wrapped.facing).toBe("left");
    expect(wrapped.y).toBe(TUNNEL_Y);
  });
});

describe("updatePlayer — tunnel x-bounds override", () => {
  it("allows x to go below R when xMin is set negative", () => {
    const p = { ...createPlayer(2, 310), currentDir: "left" as const };
    // xMin = -20 lets the clamp allow negative x
    const next = updatePlayer(p, null, 0.1, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      xMin: -20,
    });
    expect(next.x).toBeLessThan(2); // moved left past the default floor of R=10
  });

  it("allows x to exceed (width - R) when xMax is set large", () => {
    const p = { ...createPlayer(CANVAS_WIDTH - 2, 310), currentDir: "right" as const };
    const next = updatePlayer(p, null, 0.1, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      xMax: CANVAS_WIDTH + 20,
    });
    expect(next.x).toBeGreaterThan(CANVAS_WIDTH - 2);
  });
});
