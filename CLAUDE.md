# Pacman Browser Game

A Pac-Man-like game that runs in the browser, built with TypeScript.

## Project Goal

Recreate a Pac-Man-style game playable in the browser. Classic gameplay: player navigates a maze, eats dots, avoids ghosts, eats power pellets to temporarily hunt ghosts.

## Tech Stack

| Concern       | Choice       |
|---------------|--------------|
| Language      | TypeScript   |
| Bundler       | Vite         |
| Renderer      | HTML5 Canvas |
| Testing       | Vitest       |
| Package mgr   | pnpm         |

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start Vite dev server
pnpm build            # Production build (outputs to dist/)
pnpm test             # Run Vitest
pnpm test --run       # Run tests once (no watch)
```

## Project Structure (intended)

```
src/
  main.ts           # Entry point, bootstraps game
  game.ts           # Main game loop (requestAnimationFrame)
  input.ts          # Keyboard input handling
  maze/             # Maze layout and tile types
  entities/         # Player, Ghost base classes
  rendering/        # Canvas drawing utilities
  state/            # Game state (score, lives, level)
tests/
  *.test.ts         # Vitest unit tests
index.html          # Shell HTML with <canvas>
vite.config.ts
tsconfig.json
```

## Architecture Notes

- **Game loop**: `requestAnimationFrame`-driven, fixed timestep update + variable render
- **Canvas**: single `<canvas>` element, cleared and redrawn each frame
- **Coordinate system**: tile-based grid (e.g. 28×31 tiles), converted to pixels at render time
- **Entities**: Player and Ghost share movement logic; ghosts have independent AI state machines
- **No external game engine** — keep dependencies minimal

## Code Conventions

- Strict TypeScript (`strict: true` in tsconfig)
- Prefer pure functions for game logic (easier to test)
- Game state is explicit and passed around, not hidden in globals
- Tests live in `tests/` and cover logic (maze, AI, scoring) — not rendering
