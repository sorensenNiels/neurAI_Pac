import { TILE } from "./tiles";

export { TILE }; // re-export so existing importers of TILE from dots.ts still work

export const DOT_RADIUS = 3; // pixels

export interface Dot {
  x: number;
  y: number;
  isPellet: boolean; // true for power pellets, false for regular dots
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
