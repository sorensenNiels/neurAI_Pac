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
  game.ts                   # Orchestrator: RAF loop, wrapTunnels (exported), score/level/fruit state
  input.ts                  # Keyboard input — tracks most-recently-pressed arrow key
  entities/
    player.ts               # PlayerState interface + createPlayer + updatePlayer (pure); death animation
    ghost.ts                # GhostState + GhostPersonality + createGhost + updateGhost + pickDirection (pure)
    fruit.ts                # FruitState + FruitType + FRUIT_POINTS + FRUIT_EMOJI + fruitTypeForLevel
  maze/
    tiles.ts                # TILE constant, TileType, parseTile
    mazeLayouts.ts          # MazeLayout interface + LEVEL_1 classic maze (includes ghostStarts)
    maze.ts                 # MazeState + createMaze + isWallAt + createDotsFromMaze
    dots.ts                 # Dot type + eatDots (pure)
  rendering/
    renderer.ts             # HUD_HEIGHT + clearCanvas + drawMaze + drawDots + drawPlayer + drawScore
                            #   + drawGhost + drawLives + drawLevel + drawFruit + drawLevelComplete + drawGameOver
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
- **Scoring**: dot eating + 200 pts for eating a frightened ghost + fruit bonus points, tracked in `Game.score`. Displayed right-aligned in the HUD by `drawScore`.
- **Ghost AI**: Three ghosts with distinct personalities (Blinky, Pinky, Clyde), all using intersection-based direction selection. Mode chain: `pen` (staggered waits: 0s/1s/4s) → `exiting` → `scatter`/`chase` (global 5s/20s cycle) → `frightened` (8s on power pellet, random movement, flash last 2s) → `eaten` (eyes-only, returns to pen). Door tile is passable only in pen/exiting/eaten modes.
  - **Blinky** (red): targets Pac-Man's exact position; scatter → top-right corner
  - **Pinky** (pink): targets 4 tiles ahead of Pac-Man's facing; scatter → top-left corner
  - **Clyde** (orange): chases when >8 tiles away, retreats to scatter corner when close; scatter → bottom-left corner
- **Death animation**: 1.2s two-phase animation on collision — mouth widens then body shrinks to nothing; followed by 1.5s respawn freeze before positions reset.
- **Lives system**: 3 lives tracked in `Game`. Ghost collision → death animation + lose a life + respawn freeze + reset positions. 0 lives → `gameOver = true` + GAME OVER overlay.
- **Level progression**: clearing all dots triggers a "LEVEL CLEAR!" overlay and advances to the next level. Dot count and positions reset; ghost pen timers and fruit spawn counters reset per level.
- **Fruit bonus**: `FruitState` spawned twice per level (at 1/3 and 2/3 dots eaten), lives for 10s. Type escalates by level (cherry → strawberry → orange → banana → melon). Points: 100/300/500/700/1000. Rendered as an emoji glyph.
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
| 1   | **Maze**                   | ✅ Tile-based walls; 2-D array of TileType (wall, floor, dot, pellet, door)                                                                                             |
| 2   | **Power pellets**          | ✅ Larger dots at corners; trigger 8s ghost-frightened state                                                                                                            |
| 3   | **Super power pellets**    | Rare special pellets that grant Pac-Man a temporary super power; each pickup randomly awards one of: speed boost, ghost freeze, score multiplier, or pass-through walls |
| 4   | **Ghosts**                 | ✅ Blinky, Pinky, Clyde implemented (scatter/chase/frightened/eaten AI). Inky — planned                                                                                 |
| 5   | **Scoring**                | ✅ Dots + ghost eat + fruit bonus + HUD display. Full arcade scoring (10pt dots, 50pt pellets, escalating ghost chain) — planned                                        |
| 6   | **Lives system**           | ✅ 3 lives + death animation + respawn + GAME OVER screen                                                                                                               |
| 7   | **Level progression**      | ✅ Clear all dots → next level + LEVEL CLEAR overlay. Ghost speed scaling per level — planned                                                                           |
| 8   | **Fruit bonus**            | ✅ Per-level fruit with escalating type and points; spawns twice per level                                                                                              |
| 9   | **Sound**                  | Web Audio API for chomp, ghost eaten, death, and level-complete sounds                                                                                                  |
| 10  | **High score**             | Persist best score to `localStorage`                                                                                                                                    |
