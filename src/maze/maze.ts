import type { Dot } from "./dots";
import type { MazeLayout } from "./mazeLayouts";
import { parseTile, TILE, type TileType } from "./tiles";

export interface MazeState {
  readonly tiles: readonly (readonly TileType[])[];
  readonly cols: number;
  readonly rows: number;
  readonly tunnelRow: number;
}

/**
 * Parses a MazeLayout into a MazeState with a 2-D tile array.
 * Rows shorter than 28 chars are padded with floor tiles.
 */
export function createMaze(layout: MazeLayout): MazeState {
  const tiles = layout.tiles.map((row) =>
    Array.from({ length: 28 }, (_, col) => {
      const char = row[col] ?? " ";
      return parseTile(char);
    }),
  );
  return {
    tiles,
    cols: 28,
    rows: layout.tiles.length,
    tunnelRow: layout.tunnelRow,
  };
}

/**
 * Returns the TileType at (col, row).
 * Out-of-bounds coordinates return "wall" so the border always blocks movement.
 */
export function getTile(maze: MazeState, col: number, row: number): TileType {
  const tileRow = maze.tiles[row];
  if (tileRow === undefined) return "wall";
  const tile = tileRow[col];
  return tile ?? "wall";
}

/**
 * Returns true if the pixel coordinate (pixelX, pixelY) falls inside a wall
 * or ghost-house door tile.
 */
export function isWallAt(
  maze: MazeState,
  pixelX: number,
  pixelY: number,
): boolean {
  const col = Math.floor(pixelX / TILE);
  const row = Math.floor(pixelY / TILE);
  const tile = getTile(maze, col, row);
  return tile === "wall" || tile === "door";
}

/**
 * Builds the initial Dot array from the maze tile grid.
 * Every "dot" tile becomes a small dot; every "pellet" tile becomes a power pellet.
 * Dot pixel position is at the centre of its tile.
 */
export function createDotsFromMaze(maze: MazeState): Dot[] {
  const dots: Dot[] = [];
  for (let row = 0; row < maze.rows; row++) {
    for (let col = 0; col < maze.cols; col++) {
      const tile = getTile(maze, col, row);
      if (tile === "dot" || tile === "pellet") {
        dots.push({
          x: col * TILE + TILE / 2,
          y: row * TILE + TILE / 2,
          isPellet: tile === "pellet",
        });
      }
    }
  }
  return dots;
}
