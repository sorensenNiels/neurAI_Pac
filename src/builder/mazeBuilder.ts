import type { MazeLayout } from "../maze/mazeLayouts";
import { parseTile, type TileType } from "../maze/tiles";

// ── Types ────────────────────────────────────────────────────────────────────

export type BuilderTool =
  | "wall"
  | "floor"
  | "dot"
  | "pellet"
  | "door"
  | "playerStart"
  | "ghost"
  | "tunnelRow";

export interface GhostCoord {
  col: number;
  row: number;
}

export interface BuilderState {
  /** 31 rows × 28 cols mutable tile grid. */
  tiles: TileType[][];
  playerStart: { col: number; row: number };
  ghostStarts: [GhostCoord, GhostCoord, GhostCoord];
  tunnelRow: number;
  activeTool: BuilderTool;
  /** Which ghost slot (0–2) is placed by the ghost tool. */
  activeGhostIndex: 0 | 1 | 2;
  isDirty: boolean;
  statusMessage: string;
  statusTimer: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const BUILDER_COLS = 28;
export const BUILDER_ROWS = 31;
/** Height of the two-row toolbar drawn above the editing grid. */
export const BUILDER_TOOLBAR_HEIGHT = 40;

const STORAGE_KEY = "pacman_custom_maze";

// ── Internal helpers ─────────────────────────────────────────────────────────

function emptyGrid(): TileType[][] {
  return Array.from({ length: BUILDER_ROWS }, (_, row) =>
    Array.from({ length: BUILDER_COLS }, (_, col): TileType => {
      if (
        row === 0 ||
        row === BUILDER_ROWS - 1 ||
        col === 0 ||
        col === BUILDER_COLS - 1
      ) {
        return "wall";
      }
      return "floor";
    }),
  );
}

function gridFromLayout(layout: MazeLayout): TileType[][] {
  return Array.from({ length: BUILDER_ROWS }, (_, row) =>
    Array.from({ length: BUILDER_COLS }, (_, col): TileType => {
      const char = layout.tiles[row]?.[col] ?? " ";
      return parseTile(char);
    }),
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

export function createBuilder(base?: MazeLayout): BuilderState {
  const tiles = base ? gridFromLayout(base) : emptyGrid();
  return {
    tiles,
    playerStart: base?.playerStart
      ? { ...base.playerStart }
      : { col: 13, row: 23 },
    ghostStarts: base?.ghostStarts
      ? [
          { ...base.ghostStarts[0] },
          { ...base.ghostStarts[1] },
          { ...base.ghostStarts[2] },
        ]
      : [
          { col: 13, row: 14 },
          { col: 13, row: 13 },
          { col: 15, row: 14 },
        ],
    tunnelRow: base?.tunnelRow ?? 14,
    activeTool: "wall",
    activeGhostIndex: 0,
    isDirty: false,
    statusMessage: base ? "Custom maze loaded." : "New blank maze.",
    statusTimer: 3,
  };
}

/**
 * Applies the active tool (or an explicit override) at the given tile
 * coordinate. Returns the updated state; coordinates out of bounds are ignored.
 */
export function applyTool(
  state: BuilderState,
  col: number,
  row: number,
  overrideTool?: BuilderTool,
): BuilderState {
  if (col < 0 || col >= BUILDER_COLS || row < 0 || row >= BUILDER_ROWS) {
    return state;
  }

  const tool = overrideTool ?? state.activeTool;
  let { tiles, playerStart, ghostStarts, tunnelRow } = state;

  switch (tool) {
    case "wall":
    case "floor":
    case "dot":
    case "pellet":
    case "door": {
      tiles = tiles.map((r, i) => {
        if (i !== row) return r;
        const newRow = [...r];
        newRow[col] = tool;
        return newRow;
      });
      break;
    }
    case "playerStart": {
      playerStart = { col, row };
      break;
    }
    case "ghost": {
      const next: [GhostCoord, GhostCoord, GhostCoord] = [
        { ...ghostStarts[0] },
        { ...ghostStarts[1] },
        { ...ghostStarts[2] },
      ];
      next[state.activeGhostIndex] = { col, row };
      ghostStarts = next;
      break;
    }
    case "tunnelRow": {
      tunnelRow = row;
      break;
    }
  }

  return {
    ...state,
    tiles,
    playerStart,
    ghostStarts,
    tunnelRow,
    isDirty: true,
  };
}

export function setTool(state: BuilderState, tool: BuilderTool): BuilderState {
  return { ...state, activeTool: tool };
}

/** Cycles the active ghost slot (0 → 1 → 2 → 0) while keeping ghost tool active. */
export function cycleGhostIndex(state: BuilderState): BuilderState {
  const next = ((state.activeGhostIndex + 1) % 3) as 0 | 1 | 2;
  return { ...state, activeGhostIndex: next };
}

export function clearMaze(state: BuilderState): BuilderState {
  return {
    ...state,
    tiles: emptyGrid(),
    isDirty: true,
    statusMessage: "Cleared.",
    statusTimer: 2,
  };
}

/** Decrements the status message countdown each frame. */
export function tickBuilder(state: BuilderState, dt: number): BuilderState {
  if (state.statusTimer <= 0) return state;
  const next = Math.max(0, state.statusTimer - dt);
  return {
    ...state,
    statusTimer: next,
    statusMessage: next === 0 ? "" : state.statusMessage,
  };
}

/** Serialises the current builder grid to a MazeLayout ready for gameplay. */
export function exportToLayout(state: BuilderState): MazeLayout {
  const tileChar: Record<TileType, string> = {
    wall: "#",
    floor: " ",
    dot: ".",
    pellet: "o",
    door: "-",
  };
  const tiles = state.tiles.map((row) => row.map((t) => tileChar[t]).join(""));
  return {
    tiles,
    playerStart: { ...state.playerStart },
    ghostStarts: [
      { ...state.ghostStarts[0] },
      { ...state.ghostStarts[1] },
      { ...state.ghostStarts[2] },
    ],
    tunnelRow: state.tunnelRow,
  };
}

/** Persists the current layout to localStorage. Returns updated state. */
export function saveToStorage(state: BuilderState): BuilderState {
  try {
    const layout = exportToLayout(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    return {
      ...state,
      isDirty: false,
      statusMessage: "Saved!",
      statusTimer: 2,
    };
  } catch {
    return { ...state, statusMessage: "Save failed.", statusTimer: 2 };
  }
}

/** Loads a previously saved layout from localStorage, or null if none exists. */
export function loadFromStorage(): MazeLayout | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as Record<string, unknown>).tiles)
    ) {
      return null;
    }
    return parsed as MazeLayout;
  } catch {
    return null;
  }
}

export function hasSavedMaze(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}
