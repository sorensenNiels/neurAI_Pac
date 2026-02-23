/**
 * Bonus fruit — appears twice per level at the player-start tile, triggered
 * when a certain fraction of dots have been eaten.
 *
 * First spawn:  after 1/3 of all dots are eaten
 * Second spawn: after 2/3 of all dots are eaten
 *
 * Each fruit disappears after FRUIT_DURATION seconds if not collected.
 */

export type FruitType = "cherry" | "strawberry" | "orange" | "banana" | "melon";

export interface FruitState {
  x: number;
  y: number;
  type: FruitType;
  /** Seconds remaining before the fruit disappears on its own. */
  timer: number;
}

/** Bonus score awarded for collecting each fruit type. */
export const FRUIT_POINTS: Record<FruitType, number> = {
  cherry: 100,
  strawberry: 300,
  orange: 500,
  banana: 700,
  melon: 1000,
};

/** Emoji glyph used to represent each fruit type on the canvas. */
export const FRUIT_EMOJI: Record<FruitType, string> = {
  cherry: "🍒",
  strawberry: "🍓",
  orange: "🍊",
  banana: "🍌",
  melon: "🍈",
};

/** Progression of fruit types — index = level - 1, clamped at the last entry. */
const LEVEL_FRUIT: FruitType[] = [
  "cherry",
  "strawberry",
  "orange",
  "banana",
  "melon",
];

/** How long (seconds) a fruit stays on screen before vanishing. */
export const FRUIT_DURATION = 10;

/** Collision radius for player–fruit overlap check (px). */
export const FRUIT_RADIUS = 10;

/** Returns the fruit type that should appear for a given level number (1-based). */
export function fruitTypeForLevel(level: number): FruitType {
  const idx = Math.min(level - 1, LEVEL_FRUIT.length - 1);
  return LEVEL_FRUIT[idx] as FruitType;
}
