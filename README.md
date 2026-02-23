# Pac-Man

A Pac-Man clone that runs in the browser, built with TypeScript and HTML5 Canvas — no game engine, no dependencies beyond Vite and Vitest.

## Playing

```bash
pnpm install
pnpm dev
```

Arrow keys move Pac-Man. Eat all the dots to clear the maze. Avoid the ghost — eat a power pellet (large dot) to turn the tables and hunt it instead.

## Ghost AI — How It Works

### The State Machine (the "mood")

The ghost is always in one of six modes, and transitions between them in specific ways:

```
pen ──► exiting ──► scatter ◄──► chase
                        │           │
                        └─► frightened ─► (back to scatter/chase)
                                │
                              eaten ──► pen
```

| Mode | Behaviour |
|---|---|
| `pen` | Waits inside the ghost house. Does not move. Counts down a timer. |
| `exiting` | Navigates toward the pen exit tile. Passes through the door. |
| `scatter` | Heads for its fixed "home corner" (top-right for Blinky). Circles there. |
| `chase` | Hunts Pac-Man directly — target is Pac-Man's current pixel. |
| `frightened` | Moves randomly at intersections. Can be eaten by Pac-Man. Flashes when timer is low. |
| `eaten` | Eyes only. Rushes back to the pen entrance. Re-enters `pen` mode. |

The global game loop alternates **scatter → chase → scatter → chase** every 7 s / 20 s. When a power pellet is eaten, `frightened` overrides whatever the current mode is.

---

### The Movement Model (the "legs")

The ghost moves continuously at 115 px/s. Instead of deciding direction every frame, it only reconsiders **at tile centres** — the exact pixel midpoint of each maze tile. This mirrors classic arcade behaviour.

**How tile-centre crossing is detected:**

Each frame:
1. Record position before the move
2. Apply the full movement in the current direction
3. Check: did the ghost *cross* a tile centre this frame?

```
prev = 271.0 → new = 269.3   (moving up, y decreasing)
Tile centre at 270 is in range [269.3, 271.0] → CROSSED ✓
```

A proximity check (`|pos − centre| < threshold`) was tried first but had a fatal flaw: the threshold had to be ≥ per-frame distance to catch movement, but that caused the ghost to snap back to centre on every subsequent frame too — it could never escape. Crossing detection fires exactly once per centre.

**When a crossing is detected:**
1. Snap to the exact tile centre (eliminates floating-point drift)
2. Pick the next direction (see below)
3. Apply any *remaining* distance in the new direction (no wasted movement)

---

### Direction Picking (the "decision")

At each tile centre the ghost evaluates all four directions and picks the best one, subject to two hard rules:

**Rule 1 — No U-turns.** The reverse of the current direction is always excluded. This forces the ghost to commit to paths and creates natural flowing movement.

**Rule 2 — No walls.** A direction is excluded if the tile one step ahead is a wall. The door tile is special: it is passable only in `pen`, `exiting`, and `eaten` modes — not during normal chase or scatter.

From the remaining valid directions:

- **Normal modes (scatter / chase / eaten / exiting):** pick the direction whose one-step-ahead tile centre is *closest* (Euclidean distance) to the target. This greedy rule naturally steers the ghost toward its goal without any pathfinding algorithm.
- **Frightened mode:** pick randomly from valid directions. This makes the ghost erratic and harder to herd into a corner.

If *no* direction is valid (dead end), the no-U-turn rule is lifted and the ghost reverses.

---

### Target Selection (the "goal")

The target changes depending on mode:

| Mode | Target |
|---|---|
| `chase` | Pac-Man's current pixel — direct pursuit |
| `scatter` | Tile (25, 0) — top-right corner of the maze |
| `exiting` | Tile (13, 11) — first floor tile above the pen door |
| `eaten` | Tile (13, 12) — the pen door tile |
| `frightened` | Irrelevant (random movement) |

The greedy distance-to-target rule means Blinky in chase mode always trends toward Pac-Man, but is naturally diverted by walls and the no-U-turn rule — it has to navigate the maze rather than teleport through it.

---

### Why It Feels Like a Personality

Even though Blinky only chases Pac-Man's current position, several emergent properties come from the rules:

- **It corners** — approaching a wall forces it down a different path, giving the appearance of cutting off routes
- **It overshoots** — the greedy rule picks the *locally* closest tile, which can lead it slightly past Pac-Man before it can correct
- **Scatter gives breathing room** — every 7 seconds Blinky retreats to its corner, giving the player a safe window; the mode switch also forces a reversal, which is a visible "turn away" cue

The three other classic ghosts (Pinky, Inky, Clyde) share the same movement and state machine infrastructure. They differ only in their chase-mode target calculation:

| Ghost | Chase target |
|---|---|
| Blinky (red) ✅ | Pac-Man's current tile |
| Pinky (pink) | 4 tiles ahead of Pac-Man's facing direction |
| Inky (cyan) | Reflection of Blinky's position through a point 2 tiles ahead of Pac-Man |
| Clyde (orange) | Pac-Man's tile when far away; scatter corner when within 8 tiles |

---

## Project Structure

```
src/
  main.ts          Entry point
  game.ts          RAF loop, collision, lives, score
  input.ts         Keyboard input
  entities/
    player.ts      Pac-Man movement (pure functions)
    ghost.ts       Ghost AI — state machine + movement (pure functions)
  maze/
    tiles.ts       Tile types and TILE constant
    mazeLayouts.ts Level definitions
    maze.ts        Maze parsing, wall queries
    dots.ts        Dot eating
  rendering/
    renderer.ts    All canvas drawing
tests/             Vitest unit tests
```

## Tech Stack

| Concern | Choice |
|---|---|
| Language | TypeScript |
| Bundler | Vite |
| Renderer | HTML5 Canvas |
| Testing | Vitest |
| Linter | Biome |
| Package manager | pnpm |
