/** A single entry in the high-score table. */
export interface HighScoreEntry {
  /** Three uppercase letters chosen by the player. */
  initials: string;
  score: number;
  level: number;
}

const HS_KEY = "pacman_highscores";
const MAX_ENTRIES = 10;

/** Loads and validates scores from localStorage. Returns an empty array on any error. */
export function loadHighScores(): HighScoreEntry[] {
  try {
    const raw = localStorage.getItem(HS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[])
      .filter((e): e is HighScoreEntry => {
        if (typeof e !== "object" || e === null) return false;
        const r = e as Record<string, unknown>;
        return (
          typeof r.initials === "string" &&
          typeof r.score === "number" &&
          typeof r.level === "number"
        );
      })
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

/** Inserts an entry, re-sorts, trims to MAX_ENTRIES, and persists to localStorage. */
export function saveHighScore(entry: HighScoreEntry): void {
  const scores = loadHighScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const trimmed = scores.slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(HS_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage unavailable — ignore silently
  }
}

/**
 * Returns true if the given score would appear in the top-10 table.
 * A score of 0 is never considered a qualifying score.
 */
export function qualifiesForLeaderboard(score: number): boolean {
  if (score === 0) return false;
  const scores = loadHighScores();
  if (scores.length < MAX_ENTRIES) return true;
  return score > (scores[MAX_ENTRIES - 1]?.score ?? 0);
}
