export type Direction = "up" | "down" | "left" | "right";

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

/**
 * Tracks which arrow key the player is currently holding.
 * - When a key is pressed, it becomes the active direction.
 * - When that key is released, the direction falls back to any other
 *   key still held, or null if nothing is held.
 *
 * Also buffers single-use events for UI screens:
 * - confirmPending  — Enter or Space was pressed (consume with consumeConfirm)
 * - typedChar       — last A-Z key pressed (consume with consumeTypedChar)
 * - backspacePending — Backspace was pressed (consume with consumeBackspace)
 */
export class Input {
  private _direction: Direction | null = null;

  // Tracks all currently held direction keys so we can fall back
  // to one if the active key is released while another is still held.
  private readonly held: Direction[] = [];

  private _confirmPending = false;
  private _typedChar: string | null = null;
  private _backspacePending = false;
  private _highScorePending = false;
  private _escapePending = false;
  private _builderPending = false;

  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  get direction(): Direction | null {
    return this._direction;
  }

  /** Consumes and returns true if Enter or Space was pressed since the last call. */
  consumeConfirm(): boolean {
    const v = this._confirmPending;
    this._confirmPending = false;
    return v;
  }

  /** Consumes and returns the last A–Z key typed, or null if none since the last call. */
  consumeTypedChar(): string | null {
    const v = this._typedChar;
    this._typedChar = null;
    return v;
  }

  /** Consumes and returns true if Backspace was pressed since the last call. */
  consumeBackspace(): boolean {
    const v = this._backspacePending;
    this._backspacePending = false;
    return v;
  }

  /** Consumes and returns true if H was pressed since the last call. */
  consumeHighScore(): boolean {
    const v = this._highScorePending;
    this._highScorePending = false;
    return v;
  }

  /** Consumes and returns true if Escape was pressed since the last call. */
  consumeEscape(): boolean {
    const v = this._escapePending;
    this._escapePending = false;
    return v;
  }

  /** Consumes and returns true if B was pressed since the last call. */
  consumeBuilder(): boolean {
    const v = this._builderPending;
    this._builderPending = false;
    return v;
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    // UI: Escape → back
    if (e.key === "Escape") {
      this._escapePending = true;
      e.preventDefault();
      return;
    }

    // UI: Enter / Space → confirm
    if (e.key === "Enter" || e.key === " ") {
      this._confirmPending = true;
      e.preventDefault();
      return;
    }

    // UI: Backspace
    if (e.key === "Backspace") {
      this._backspacePending = true;
      e.preventDefault();
      return;
    }

    // UI: letter keys for initials entry
    if (/^[a-zA-Z]$/.test(e.key)) {
      this._typedChar = e.key.toUpperCase();
      if (e.key === "h" || e.key === "H") {
        this._highScorePending = true;
      }
      if (e.key === "b" || e.key === "B") {
        this._builderPending = true;
      }
      // Fall through so the key is NOT treated as a direction
      return;
    }

    const dir = KEY_MAP[e.key];
    if (!dir) return;

    e.preventDefault(); // stop arrow keys from scrolling the page

    // Avoid duplicate entries if key is held down (browser fires repeated keydown)
    if (!this.held.includes(dir)) {
      this.held.push(dir);
    }

    // Most recently pressed key wins
    this._direction = dir;
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    const dir = KEY_MAP[e.key];
    if (!dir) return;

    const idx = this.held.indexOf(dir);
    if (idx !== -1) this.held.splice(idx, 1);

    // If the released key was the active one, fall back to whatever is still held
    if (this._direction === dir) {
      this._direction = this.held[this.held.length - 1] ?? null;
    }
  };
}
