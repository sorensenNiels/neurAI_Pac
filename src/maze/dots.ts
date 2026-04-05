import { TILE } from "./tiles";

export { TILE }; // re-export so existing importers of TILE from dots.ts still work

export const DOT_RADIUS = 3; // pixels

export interface Dot {
  x: number;
  y: number;
  isPellet: boolean; // true for power pellets, false for regular dots
  isHeroPellet?: boolean; // true for the unique hero pellet (replaces a normal dot)
}

/**
 * Pure function — randomly selects one normal (non-power, non-hero) dot and
 * marks it as the Hero Pellet.  If no eligible dot exists the array is
 * returned unchanged.
 */
export function spawnHeroPellet(dots: Dot[]): Dot[] {
  const candidates = dots
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => !d.isPellet && !d.isHeroPellet);
  if (candidates.length === 0) return dots;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  if (pick === undefined) return dots;
  return dots.map((d, i) => (i === pick.i ? { ...d, isHeroPellet: true } : d));
}

/**
 * Pure function — reverts any hero pellet dot back to a normal dot.
 * Called when the 20-second active window expires without Pac-Man eating it.
 */
export function expireHeroPellet(dots: Dot[]): Dot[] {
  return dots.map((d) => (d.isHeroPellet ? { ...d, isHeroPellet: false } : d));
}

/** Point value of a regular dot (matches per-dot increment in game loop). */
export const DOT_SCORE = 1;
/** Point value of a power pellet — 5× a regular dot. */
export const PELLET_SCORE = 5;

/**
 * Pure function — returns the total score value of a collection of dots.
 * Regular dots are worth DOT_SCORE each; power pellets are worth PELLET_SCORE.
 * Used when a hero pellet level-skip awards points for all remaining dots.
 */
export function sumDotScores(dots: Dot[]): number {
  return dots.reduce(
    (total, d) => total + (d.isPellet ? PELLET_SCORE : DOT_SCORE),
    0,
  );
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
