/**
 * A maze layout is a 28-column × 31-row character grid plus metadata.
 *
 * Character key:
 *   '#'  wall
 *   '.'  dot (small pellet)
 *   'o'  power pellet (large pellet)
 *   '-'  ghost-house door
 *   ' '  open floor (no dot — corridors outside the maze boundary or
 *        the ghost-house interior)
 *
 * playerStart is in tile coordinates (col, row); game.ts converts to pixels.
 * tunnelRow   is the row index where Pac-Man wraps left↔right at the canvas edge.
 */
export interface MazeLayout {
  readonly tiles: readonly string[];
  readonly playerStart: { readonly col: number; readonly row: number };
  readonly ghostStarts: ReadonlyArray<{
    readonly col: number;
    readonly row: number;
  }>;
  readonly tunnelRow: number;
}

// ─── Level 1 — classic Pac-Man maze ───────────────────────────────────────────
//
// Column index reference (0-based):
//  0         1         2
//  0123456789012345678901234567
//
// Verified: every string below is exactly 28 characters wide.
export const LEVEL_1: MazeLayout = {
  tiles: [
    "############################", //  0
    "#............##............#", //  1
    "#.####.#####.##.#####.####.#", //  2
    "#o####.#####.##.#####.####o#", //  3  ← power pellets at cols 1 & 26
    "#.####.#####.##.#####.####.#", //  4
    "#..........................#", //  5
    "#.####.##.########.##.####.#", //  6
    "#.####.##.########.##.####.#", //  7
    "#......##....##....##......#", //  8
    "######.##### ## #####.######", //  9
    "     #.##### ## #####.#     ", // 10
    "     #.##          ##.#     ", // 11
    "     #.## ###--### ##.#     ", // 12  ← ghost-house door at cols 13–14
    "######.## #      # ##.######", // 13
    "          #      #          ", // 14  ← tunnel row (open edges = wrapping)
    "######.## #      # ##.######", // 15
    "     #.## ######## ##.#     ", // 16
    "     #.##          ##.#     ", // 17
    "     #.## ######## ##.#     ", // 18
    "######.## ######## ##.######", // 19
    "#............##............#", // 20
    "#.####.#####.##.#####.####.#", // 21
    "#o..##................##..o#", // 22  ← power pellets at cols 1 & 26
    "###.##.##          ##.##.###", // 23  ← open centre — Pac-Man starts here
    "###.##.##.########.##.##.###", // 24
    "#......##....##....##......#", // 25
    "#.##########.##.##########.#", // 26
    "#..........................#", // 27
    "#.####.#####.##.#####.####.#", // 28
    "#............##............#", // 29
    "############################", // 30
  ],
  playerStart: { col: 13, row: 23 }, // open floor in row 23, centre of the board
  ghostStarts: [
    { col: 13, row: 14 }, // Blinky — pen centre
    { col: 13, row: 13 }, // Pinky  — one row above centre
    { col: 15, row: 14 }, // Clyde  — right side of pen
  ],
  tunnelRow: 14,
};
