export const TILE = 20;      // grid cell size in pixels
export const DOT_RADIUS = 3; // pixels

export interface Dot {
  x: number;
  y: number;
}

/**
 * Pure function — builds the initial grid of food dots.
 * Dots are placed at every tile intersection across the canvas, skipping any
 * that fall within a clear zone around pac-man's spawn point.
 */
export function createDots(
  width: number,
  height: number,
  spawnX: number,
  spawnY: number,
): Dot[] {
  const dots: Dot[] = [];
  const skipRadius = TILE * 3;

  for (let col = 1; col * TILE < width; col++) {
    for (let row = 1; row * TILE < height; row++) {
      const x = col * TILE;
      const y = row * TILE;
      const dx = x - spawnX;
      const dy = y - spawnY;
      if (dx * dx + dy * dy > skipRadius * skipRadius) {
        dots.push({ x, y });
      }
    }
  }

  return dots;
}

/**
 * Pure function — returns a new array with any dots within eatRadius of the
 * player position removed. Does not mutate the input array.
 */
export function eatDots(
  dots: Dot[],
  playerX: number,
  playerY: number,
  eatRadius: number,
): Dot[] {
  return dots.filter((dot) => {
    const dx = dot.x - playerX;
    const dy = dot.y - playerY;
    return dx * dx + dy * dy > eatRadius * eatRadius;
  });
}
