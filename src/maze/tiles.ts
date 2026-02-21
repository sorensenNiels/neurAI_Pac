// TILE is defined here (not in dots.ts) so both maze.ts and dots.ts can import
// it without creating a circular dependency.
export const TILE = 20; // grid cell size in pixels

export type TileType = "wall" | "floor" | "dot" | "pellet" | "door";

/**
 * Maps a single character from a maze layout string to its TileType.
 *   '#' → wall
 *   '.' → dot
 *   'o' → pellet (power pellet)
 *   '-' → door  (ghost-house entrance)
 *   anything else (space, tunnel marker …) → floor
 */
export function parseTile(char: string): TileType {
  switch (char) {
    case "#":
      return "wall";
    case ".":
      return "dot";
    case "o":
      return "pellet";
    case "-":
      return "door";
    default:
      return "floor";
  }
}
