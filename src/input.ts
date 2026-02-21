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
 */
export class Input {
  private _direction: Direction | null = null;

  // Tracks all currently held direction keys so we can fall back
  // to one if the active key is released while another is still held.
  private readonly held: Direction[] = [];

  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  get direction(): Direction | null {
    return this._direction;
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
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
