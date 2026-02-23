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
  game.ts                   # Orchestrator: RAF loop, wrapTunnels (exported), score state
  input.ts                  # Keyboard input — tracks most-recently-pressed arrow key
  entities/
    player.ts               # PlayerState interface + createPlayer + updatePlayer (pure)
    ghost.ts                # GhostState interface + createGhost + updateGhost + pickDirection (pure)
  maze/
    tiles.ts                # TILE constant, TileType, parseTile
    mazeLayouts.ts          # MazeLayout interface + LEVEL_1 classic maze (includes ghostStart)
    maze.ts                 # MazeState + createMaze + isWallAt + createDotsFromMaze
    dots.ts                 # Dot type + eatDots (pure)
  rendering/
    renderer.ts             # HUD_HEIGHT + clearCanvas + drawMaze + drawDots + drawPlayer + drawScore + drawGhost + drawLives + drawGameOver
  state/                    # (planned) Level progression state
tests/
  player.test.ts            # Unit tests for player movement and wall collision
  dots.test.ts              # Unit tests for dot eating
  maze.test.ts              # Unit tests for maze parsing and tile queries
  game.test.ts              # Unit tests for wrapTunnels and tunnel x-bounds override
  ghost.test.ts             # Unit tests for ghost AI, direction picking, mode transitions
index.html                  # Shell HTML with <canvas>
biome.json                  # Biome linter/formatter config
vite.config.ts
tsconfig.json
```

## Architecture Notes

- **Game loop**: `requestAnimationFrame`-driven, fixed timestep update + variable render
- **Canvas**: single `<canvas>` element, cleared and redrawn each frame; 560×640px total (560×620 maze + 20px HUD strip)
- **Coordinate system**: tile-based grid (28×31 tiles), each tile is 20px → maze is 560×620px; canvas adds a 20px HUD row above
- **HUD**: drawn at y=0..HUD_HEIGHT in canvas space before any translate; maze/dots/player are drawn after `ctx.translate(0, HUD_HEIGHT)`
- **Movement model**: Pac-Man moves continuously once started; releasing a key does not stop movement. Input queues a `desiredDir`; the turn is applied as soon as the maze allows it (at the nearest tile intersection). Pac-Man starts stationary and begins only after the first arrow key press.
- **Turn checking**: perpendicular turns snap the off-axis coordinate to the nearest tile centre before probing walls, ensuring all three leading-arc probes land in a single tile. Wall probes use the destination position (after applying `dist`), not the current position, to correctly detect walls in the "left" and "up" directions.
- **Tunnel wrapping**: `wrapTunnels` (exported from `game.ts`) teleports Pac-Man when its centre crosses a canvas edge on the designated tunnel row. The game passes a custom `wallFn` that treats out-of-canvas pixels on the tunnel row as open, and extends `updatePlayer`'s x-bounds so the clamp doesn't cancel the exit movement.
- **Scoring**: 1 point per dot eaten + 200 pts for eating a frightened ghost, tracked in `Game.score`. Displayed right-aligned in the HUD by `drawScore`.
- **Ghost AI (Blinky)**: continuous movement with intersection-based direction selection. Modes: `pen` (waits 3s) → `exiting` (navigates to pen exit) → `scatter`/`chase` (global 7s/20s cycle) → `frightened` (8s on power pellet, random movement, flash last 2s) → `eaten` (eyes-only, returns to pen). Door tile is passable only in pen/exiting/eaten modes.
- **Lives system**: 3 lives tracked in `Game`. Ghost collision → lose a life + 1.5s respawn freeze + reset positions. 0 lives → `gameOver = true` + GAME OVER overlay.
- **No external game engine** — keep dependencies minimal

## Code Conventions

- Strict TypeScript (`strict: true` in tsconfig)
- Prefer pure functions for game logic (easier to test)
- Prefer `interface` for entity state shapes (e.g. `PlayerState`); `type` for unions and aliases
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
| 4   | **Ghosts**                 | Blinky ✅ implemented (scatter/chase/frightened/eaten AI, lives in `entities/ghost.ts`). Pinky, Inky, Clyde — planned                                                  |
| 5   | **Scoring**                | Basic score (1pt/dot, 200pt ghost eat) + HUD display ✅ implemented. Full scoring: dots (10), power pellets (50), ghosts (200/400/800/1600) — planned                  |
| 6   | **Lives system**           | 3 lives + respawn + GAME OVER screen ✅ implemented                                                                                                                     |
| 7   | **Level progression**      | Clear all dots → next level; increase ghost speed and reduce frightened duration per level                                                                               |
| 8   | **Sound**                  | Web Audio API for chomp, ghost eaten, death, and level-complete sounds                                                                                                  |
| 9   | **High score**             | Persist best score to `localStorage`                                                                                                                                    |
