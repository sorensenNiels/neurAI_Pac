import {
  BUILDER_COLS,
  BUILDER_ROWS,
  BUILDER_TOOLBAR_HEIGHT,
  type BuilderState,
  type BuilderTool,
} from "../builder/mazeBuilder";
import { TILE } from "../maze/tiles";

// ── Toolbar layout definitions ─────────────────────────────────────────────
// Row 1: tool palette (y = 0..19)
// Row 2: actions      (y = 20..39)
// Grid:               (y = 40..659)

interface ButtonRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ToolButton {
  tool: BuilderTool;
  label: string;
  fg: string; // label colour
  bg: string; // fill colour for the tile preview swatch
  shortcut: string;
}

type ActionId = "play" | "save" | "load" | "clear" | "back";

interface ActionButton {
  id: ActionId;
  label: string;
}

/** Ghost colours matching the game: Blinky, Pinky, Clyde. */
const GHOST_COLORS = ["#FF0000", "#FFB8FF", "#FFB852"] as const;

const TOOL_W = 40;
const TOOL_H = 20;
const ACTION_H = 20;

export const TOOL_BUTTONS: (ToolButton & { rect: ButtonRect })[] = [
  {
    tool: "wall",
    label: "# Wall",
    fg: "#7af",
    bg: "#0000cc",
    shortcut: "W",
    rect: { x: 0, y: 0, w: TOOL_W, h: TOOL_H },
  },
  {
    tool: "floor",
    label: "_ Floor",
    fg: "#aaa",
    bg: "#111",
    shortcut: "F",
    rect: { x: 40, y: 0, w: TOOL_W, h: TOOL_H },
  },
  {
    tool: "dot",
    label: ". Dot",
    fg: "#fff",
    bg: "#333",
    shortcut: "D",
    rect: { x: 80, y: 0, w: TOOL_W, h: TOOL_H },
  },
  {
    tool: "pellet",
    label: "o Pellet",
    fg: "#fff",
    bg: "#444",
    shortcut: "O",
    rect: { x: 120, y: 0, w: TOOL_W + 10, h: TOOL_H },
  },
  {
    tool: "door",
    label: "- Door",
    fg: "#ffb8ff",
    bg: "#442244",
    shortcut: "X",
    rect: { x: 170, y: 0, w: TOOL_W, h: TOOL_H },
  },
  {
    tool: "playerStart",
    label: "P Start",
    fg: "#FFD700",
    bg: "#332200",
    shortcut: "P",
    rect: { x: 210, y: 0, w: TOOL_W + 10, h: TOOL_H },
  },
  {
    tool: "ghost",
    label: "G Ghost",
    fg: "#FF0000",
    bg: "#330000",
    shortcut: "G",
    rect: { x: 260, y: 0, w: TOOL_W + 10, h: TOOL_H },
  },
  {
    tool: "tunnelRow",
    label: "T Tunnel",
    fg: "#00ff88",
    bg: "#003322",
    shortcut: "T",
    rect: { x: 310, y: 0, w: TOOL_W + 10, h: TOOL_H },
  },
];

const ACTION_BUTTONS: (ActionButton & { rect: ButtonRect })[] = [
  {
    id: "play",
    label: "\u25B6 TEST",
    rect: { x: 0, y: 20, w: 70, h: ACTION_H },
  },
  { id: "save", label: "SAVE", rect: { x: 72, y: 20, w: 52, h: ACTION_H } },
  { id: "load", label: "LOAD", rect: { x: 126, y: 20, w: 52, h: ACTION_H } },
  { id: "clear", label: "CLEAR", rect: { x: 180, y: 20, w: 52, h: ACTION_H } },
  {
    id: "back",
    label: "\u2190 BACK",
    rect: { x: 234, y: 20, w: 62, h: ACTION_H },
  },
];

// ── Hit testing ───────────────────────────────────────────────────────────────

export type BuilderClick =
  | { kind: "tool"; tool: BuilderTool }
  | { kind: "action"; action: ActionId }
  | { kind: "tile"; col: number; row: number }
  | null;

/**
 * Maps a canvas-space (x, y) click to a builder action.
 * Call with coordinates already scaled to the canvas's logical pixel space.
 */
export function hitTestBuilder(x: number, y: number): BuilderClick {
  // ── Toolbar ──────────────────────────────────────────────────────────────
  if (y < BUILDER_TOOLBAR_HEIGHT) {
    for (const btn of TOOL_BUTTONS) {
      const r = btn.rect;
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) {
        return { kind: "tool", tool: btn.tool };
      }
    }
    for (const btn of ACTION_BUTTONS) {
      const r = btn.rect;
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) {
        return { kind: "action", action: btn.id };
      }
    }
    return null;
  }

  // ── Grid ──────────────────────────────────────────────────────────────────
  const col = Math.floor(x / TILE);
  const row = Math.floor((y - BUILDER_TOOLBAR_HEIGHT) / TILE);
  if (col >= 0 && col < BUILDER_COLS && row >= 0 && row < BUILDER_ROWS) {
    return { kind: "tile", col, row };
  }
  return null;
}

// ── Drawing ──────────────────────────────────────────────────────────────────

function drawButton(
  ctx: CanvasRenderingContext2D,
  rect: ButtonRect,
  label: string,
  fg: string,
  bg: string,
  active: boolean,
): void {
  ctx.fillStyle = active ? "#224" : bg;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  // Border
  ctx.strokeStyle = active ? "#FFD700" : "#555";
  ctx.lineWidth = active ? 1.5 : 0.5;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);

  // Label
  ctx.fillStyle = active ? "#FFD700" : fg;
  ctx.font = `${active ? "bold " : ""}9px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w - 4);
}

/** Renders the full builder screen (toolbar + grid + markers). */
export function drawBuilder(
  ctx: CanvasRenderingContext2D,
  state: BuilderState,
  width: number,
): void {
  const totalH = BUILDER_TOOLBAR_HEIGHT + BUILDER_ROWS * TILE;

  // Background
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, totalH);

  // ── Toolbar row 1: tile-type palette ─────────────────────────────────────
  for (const btn of TOOL_BUTTONS) {
    let fg = btn.fg;
    // Ghost button colour follows the currently-active ghost index
    if (btn.tool === "ghost") {
      fg = GHOST_COLORS[state.activeGhostIndex] ?? "#FF0000";
    }
    drawButton(
      ctx,
      btn.rect,
      btn.label +
        (btn.tool === "ghost" ? ` G${state.activeGhostIndex + 1}` : ""),
      fg,
      btn.bg,
      state.activeTool === btn.tool,
    );
  }

  // Status text to the right of the palette
  const statusX = 360;
  if (state.statusTimer > 0 && state.statusMessage) {
    ctx.fillStyle = state.statusMessage.startsWith("Saved")
      ? "#0f0"
      : state.statusMessage.startsWith("Save failed")
        ? "#f44"
        : "#aaa";
    ctx.font = "9px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(state.statusMessage, statusX, 10, width - statusX - 4);
  }

  // Tool shortcuts hint
  ctx.fillStyle = "#444";
  ctx.font = "8px monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText("keys: W F D O X P G T", width - 2, 10);

  // ── Toolbar row 2: actions ────────────────────────────────────────────────
  for (const btn of ACTION_BUTTONS) {
    drawButton(ctx, btn.rect, btn.label, "#ddd", "#1a1a1a", false);
  }

  // Dirty indicator
  if (state.isDirty) {
    ctx.fillStyle = "#f80";
    ctx.font = "9px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("● unsaved", 300, 30);
  }

  // Key hints for actions
  ctx.fillStyle = "#444";
  ctx.font = "8px monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText("Enter=test  S=save  L=load  C=clear  Esc=back", width - 2, 30);

  // ── Grid ─────────────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(0, BUILDER_TOOLBAR_HEIGHT);

  // Draw grid cells
  for (let row = 0; row < BUILDER_ROWS; row++) {
    for (let col = 0; col < BUILDER_COLS; col++) {
      const tile = state.tiles[row]?.[col] ?? "floor";
      const px = col * TILE;
      const py = row * TILE;

      switch (tile) {
        case "wall":
          ctx.fillStyle = "#0000cc";
          ctx.fillRect(px, py, TILE, TILE);
          break;
        case "floor":
          // Floor is black background — no fill needed
          break;
        case "dot":
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(px + TILE / 2, py + TILE / 2, 2, 0, 2 * Math.PI);
          ctx.fill();
          break;
        case "pellet":
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(px + TILE / 2, py + TILE / 2, 5, 0, 2 * Math.PI);
          ctx.fill();
          break;
        case "door":
          ctx.fillStyle = "#ffb8ff";
          ctx.fillRect(px, py + TILE / 2 - 2, TILE, 4);
          break;
      }
    }
  }

  // Tunnel-row highlight
  {
    const ty = state.tunnelRow * TILE;
    ctx.fillStyle = "rgba(0, 255, 136, 0.12)";
    ctx.fillRect(0, ty, BUILDER_COLS * TILE, TILE);
    ctx.strokeStyle = "rgba(0, 255, 136, 0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, ty);
    ctx.lineTo(BUILDER_COLS * TILE, ty);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, ty + TILE);
    ctx.lineTo(BUILDER_COLS * TILE, ty + TILE);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Player-start marker
  {
    const { col, row } = state.playerStart;
    const cx = col * TILE + TILE / 2;
    const cy = row * TILE + TILE / 2;
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("P", cx, cy);
  }

  // Ghost-start markers
  for (let i = 0; i < 3; i++) {
    const gs = state.ghostStarts[i];
    if (!gs) continue;
    const cx = gs.col * TILE + TILE / 2;
    const cy = gs.row * TILE + TILE / 2;
    const color = GHOST_COLORS[i] ?? "#fff";

    // Ghost body (simple rounded shape)
    const r = 7;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy - 1, r, Math.PI, 0);
    ctx.lineTo(cx + r, cy + r);
    const bR = r / 3;
    ctx.arc(cx + r - bR, cy + r, bR, 0, Math.PI, true);
    ctx.arc(cx, cy + r, bR, 0, Math.PI, true);
    ctx.arc(cx - r + bR, cy + r, bR, 0, Math.PI, true);
    ctx.lineTo(cx - r, cy - 1);
    ctx.closePath();
    ctx.fill();

    // Ghost index label
    ctx.fillStyle = "#000";
    ctx.font = "bold 7px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${i + 1}`, cx, cy);
  }

  // Grid lines (subtle)
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 0.5;
  for (let col = 0; col <= BUILDER_COLS; col++) {
    ctx.beginPath();
    ctx.moveTo(col * TILE, 0);
    ctx.lineTo(col * TILE, BUILDER_ROWS * TILE);
    ctx.stroke();
  }
  for (let row = 0; row <= BUILDER_ROWS; row++) {
    ctx.beginPath();
    ctx.moveTo(0, row * TILE);
    ctx.lineTo(BUILDER_COLS * TILE, row * TILE);
    ctx.stroke();
  }

  ctx.restore();
}
