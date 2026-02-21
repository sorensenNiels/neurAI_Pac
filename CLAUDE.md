# Pacman Browser Game

A Pac-Man-like game that runs in the browser, built with TypeScript.

## Project Goal

Recreate a Pac-Man-style game playable in the browser. Classic gameplay: player navigates a maze, eats dots, avoids ghosts, eats power pellets to temporarily hunt ghosts.

## Tech Stack

| Concern       | Choice       |
| ------------- | ------------ |
| Language      | TypeScript   |
| Bundler       | Vite         |
| Renderer      | HTML5 Canvas |
| Testing       | Vitest       |
| Linter        | Biome        |
| Package mgr   | pnpm         |

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start Vite dev server
pnpm build            # Type-check (tsc) then production build (outputs to dist/)
pnpm preview          # Preview the production build locally
pnpm test             # Run Vitest in watch mode
pnpm test:run         # Run tests once (no watch)
pnpm lint             # Lint src/ and tests/ with Biome
pnpm format           # Auto-format src/ and tests/ with Biome
pnpm check            # Lint + format check (no writes) — use in CI
```

## Project Structure

```
src/
  main.ts                   # Entry point, bootstraps Game
  game.ts                   # Thin orchestrator: RAF loop + wires update/render
  input.ts                  # Keyboard input — tracks held arrow key direction
  entities/
    player.ts               # PlayerState type + createPlayer + updatePlayer (pure)
  maze/
    tiles.ts                # TILE constant, TileType, parseTile
    mazeLayouts.ts          # MazeLayout interface + LEVEL_1 classic maze
    maze.ts                 # MazeState + createMaze + isWallAt + createDotsFromMaze
    dots.ts                 # Dot type + eatDots (pure)
  rendering/
    renderer.ts             # clearCanvas + drawMaze + drawDots + drawPlayer
  state/                    # (planned) Score, lives, level state
tests/
  player.test.ts            # Unit tests for player movement and wall collision
  dots.test.ts              # Unit tests for dot eating
  maze.test.ts              # Unit tests for maze parsing and tile queries
index.html                  # Shell HTML with <canvas>
biome.json                  # Biome linter/formatter config
vite.config.ts
tsconfig.json
```

## Architecture Notes

- **Game loop**: `requestAnimationFrame`-driven, fixed timestep update + variable render
- **Canvas**: single `<canvas>` element, cleared and redrawn each frame
- **Coordinate system**: tile-based grid (28×31 tiles), each tile is 20px → canvas is 560×620px
- **Entities**: Player and Ghost share movement logic; ghosts have independent AI state machines
- **No external game engine** — keep dependencies minimal

## Code Conventions

- Strict TypeScript (`strict: true` in tsconfig)
- Prefer pure functions for game logic (easier to test)
- Prefer types over interfaces
- Game state is explicit and passed around, not hidden in globals
- Tests live in `tests/` and cover logic (maze, AI, scoring) — not rendering

## Roadmap (planned, not yet built)

Features are tracked as GitHub Issues. This section exists so Claude understands
the intended direction and can make architecture decisions that won't need undoing.

| #   | Feature                    | Notes                                                                                                                                                                   |
| --- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Maze**                   | Tile-based walls replacing the open canvas; define layout as a 2-D array of tile types (wall, floor, dot, power pellet)                                                 |
| 2   | **Power pellets**          | Larger dots at maze corners; trigger a timed ghost-vulnerable state                                                                                                     |
| 3   | **Super power pellets**    | Rare special pellets that grant Pac-Man a temporary super power; each pickup randomly awards one of: speed boost, ghost freeze, score multiplier, or pass-through walls |
| 4   | **Ghosts**                 | 4 enemies (Blinky, Pinky, Inky, Clyde) with classic scatter/chase/frightened AI state machines; lives in `entities/ghost.ts`                                           |
| 5   | **Scoring**                | Points for dots (10), power pellets (50), ghosts while vulnerable (200/400/800/1600); HUD overlay on canvas                                                             |
| 6   | **Lives system**           | Start with 3 lives; respawn on ghost collision; game-over screen                                                                                                        |
| 7   | **Level progression**      | Clear all dots → next level; increase ghost speed and reduce frightened duration per level                                                                               |
| 8   | **Sound**                  | Web Audio API for chomp, ghost eaten, death, and level-complete sounds                                                                                                  |
| 9   | **High score**             | Persist best score to `localStorage`                                                                                                                                    |
