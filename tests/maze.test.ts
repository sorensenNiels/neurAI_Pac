import { describe, expect, it } from "vitest";
import {
  createDotsFromMaze,
  createMaze,
  getTile,
  isWallAt,
} from "../src/maze/maze";
import { LEVEL_1 } from "../src/maze/mazeLayouts";
import { TILE } from "../src/maze/tiles";

const maze = createMaze(LEVEL_1);

describe("createMaze", () => {
  it("produces a grid with the correct number of rows", () => {
    expect(maze.rows).toBe(31);
  });

  it("produces a grid with the correct number of columns", () => {
    expect(maze.cols).toBe(28);
  });

  it("sets the tunnelRow from the layout", () => {
    expect(maze.tunnelRow).toBe(LEVEL_1.tunnelRow);
  });
});

describe("getTile", () => {
  it("returns 'wall' for row 0, col 0 (corner)", () => {
    expect(getTile(maze, 0, 0)).toBe("wall");
  });

  it("returns 'dot' for a known corridor tile (row 1, col 1)", () => {
    // Row 1: '#............##............#'  — col 1 is '.'
    expect(getTile(maze, 1, 1)).toBe("dot");
  });

  it("returns 'pellet' for a known power-pellet tile (row 3, col 1)", () => {
    // Row 3: '#o####...' — col 1 is 'o'
    expect(getTile(maze, 1, 3)).toBe("pellet");
  });

  it("returns 'door' for the ghost-house door tile", () => {
    // Row 12: '     #.## ###--### ##.#     ' — col 13 is '-'
    expect(getTile(maze, 13, 12)).toBe("door");
  });

  it("returns 'floor' for an open corridor with no dot (row 14 — tunnel row)", () => {
    // Row 14: '          #      #          ' — col 0 is ' '
    expect(getTile(maze, 0, 14)).toBe("floor");
  });

  it("returns 'wall' for a negative column (out of bounds)", () => {
    expect(getTile(maze, -1, 0)).toBe("wall");
  });

  it("returns 'wall' for a row beyond the grid (out of bounds)", () => {
    expect(getTile(maze, 0, 999)).toBe("wall");
  });
});

describe("isWallAt", () => {
  it("returns true for a pixel clearly inside a wall tile", () => {
    // Tile (0, 0) is a wall; its pixel centre is (10, 10)
    expect(isWallAt(maze, 10, 10)).toBe(true);
  });

  it("returns false for a pixel inside an open corridor tile", () => {
    // Row 1, col 1 is a dot — open corridor; pixel centre = (30, 30)
    expect(isWallAt(maze, 30, 30)).toBe(false);
  });

  it("returns true for a door tile (ghost-house entrance)", () => {
    // Col 13, row 12 is '-' (door); pixel centre = (270, 250)
    expect(isWallAt(maze, 270, 250)).toBe(true);
  });
});

describe("createDotsFromMaze", () => {
  const dots = createDotsFromMaze(maze);

  it("creates at least one dot", () => {
    expect(dots.length).toBeGreaterThan(0);
  });

  it("positions every dot at the centre of its tile", () => {
    for (const d of dots) {
      expect((d.x - TILE / 2) % TILE).toBe(0);
      expect((d.y - TILE / 2) % TILE).toBe(0);
    }
  });

  it("marks power-pellet tiles as isPellet = true", () => {
    const pellets = dots.filter((d) => d.isPellet);
    expect(pellets.length).toBe(4); // classic maze has 4 power pellets
  });

  it("marks regular dot tiles as isPellet = false", () => {
    const regular = dots.filter((d) => !d.isPellet);
    expect(regular.length).toBeGreaterThan(0);
  });

  it("does not create dots on wall tiles", () => {
    // Tile (0,0) is a wall at pixel (10,10) — no dot should be there
    const wallDot = dots.find((d) => d.x === 10 && d.y === 10);
    expect(wallDot).toBeUndefined();
  });

  it("does not create dots on floor/open tiles (no-dot corridors)", () => {
    // Tile (0,14) is floor (tunnel row) — no dot
    const tunnelDot = dots.find(
      (d) => d.x === TILE / 2 && d.y === 14 * TILE + TILE / 2,
    );
    expect(tunnelDot).toBeUndefined();
  });
});
