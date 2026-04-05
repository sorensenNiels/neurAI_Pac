import type { FruitState } from "./entities/fruit";
import {
  FRUIT_DURATION,
  FRUIT_POINTS,
  FRUIT_RADIUS,
  fruitTypeForLevel,
} from "./entities/fruit";
import type { GhostState } from "./entities/ghost";
import {
  createGhost,
  FRIGHTENED_DURATION,
  GHOST_RADIUS,
  oppositeDir,
  updateGhost,
} from "./entities/ghost";
import type { PlayerState } from "./entities/player";
import { createPlayer, PACMAN_RADIUS, updatePlayer } from "./entities/player";
import type { HighScoreEntry } from "./highscores";
import {
  loadHighScores,
  qualifiesForLeaderboard,
  saveHighScore,
} from "./highscores";
import { Input } from "./input";
import type { Dot } from "./maze/dots";
import {
  eatDots,
  expireHeroPellet,
  spawnHeroPellet,
  sumDotScores,
} from "./maze/dots";
import type { MazeState } from "./maze/maze";
import { createDotsFromMaze, createMaze, isWallAt } from "./maze/maze";
import { LEVEL_1 } from "./maze/mazeLayouts";
import { TILE } from "./maze/tiles";
import {
  clearCanvas,
  drawAttractScreen,
  drawDots,
  drawEnterInitials,
  drawFruit,
  drawGameOver,
  drawGhost,
  drawLevel,
  drawLevelComplete,
  drawLives,
  drawMaze,
  drawPlayer,
  drawScore,
  HUD_HEIGHT,
} from "./rendering/renderer";

/** Collision threshold for ghost–player contact (px). */
const COLLISION_DIST = PACMAN_RADIUS + GHOST_RADIUS - 4; // 16 px

/** Scatter/chase cycle durations (seconds). */
const SCATTER_DURATION = 5;
const CHASE_DURATION = 20;

/** Duration of the death animation before lives are decremented (seconds). */
const DEATH_ANIM_DURATION = 1.2;

/** Duration of the respawn freeze after losing a life (seconds). */
const RESPAWN_FREEZE = 1.5;

/** How long a Hero Pellet stays visible before reverting (seconds). */
const HERO_PELLET_DURATION = 20;

/** Random spawn window for the next Hero Pellet appearance (seconds). */
const HERO_SPAWN_MIN = 10;
const HERO_SPAWN_MAX = 30;

/** Powers a Hero Pellet can grant when eaten. */
export type HeroPower = "extraLife" | "levelSkip";

/**
 * Rolls for a random Hero Pellet power.
 *   10 % chance → extra life
 *   90 % chance → skip to the next level (collecting remaining dot points)
 */
export function rollHeroPower(): HeroPower {
  return Math.random() < 0.1 ? "extraLife" : "levelSkip";
}

/**
 * Pure function — teleports Pac-Man when its centre has fully crossed a tunnel
 * exit, placing it at the matching entrance on the opposite side.
 *
 * Called after updatePlayer each frame so the wrap happens in the same tick as
 * the exit.  Returns the player unchanged on any non-tunnel row.
 */
export function wrapTunnels(
  player: PlayerState,
  tunnelRow: number,
  canvasWidth: number,
): PlayerState {
  const row = Math.floor(player.y / TILE);
  if (row !== tunnelRow) return player;
  if (player.x < 0) return { ...player, x: canvasWidth - PACMAN_RADIUS };
  if (player.x >= canvasWidth) return { ...player, x: PACMAN_RADIUS };
  return player;
}

/**
 * Teleports a ghost position through the tunnel, same logic as wrapTunnels.
 */
function wrapGhostTunnel(
  ghost: GhostState,
  tunnelRow: number,
  canvasWidth: number,
): GhostState {
  const row = Math.floor(ghost.y / TILE);
  if (row !== tunnelRow) return ghost;
  if (ghost.x < 0) return { ...ghost, x: canvasWidth - GHOST_RADIUS };
  if (ghost.x >= canvasWidth) return { ...ghost, x: GHOST_RADIUS };
  return ghost;
}

/**
 * Game — the top-level orchestrator.
 *
 * Owns only:
 *   1. The RAF game loop (start / stop / loop)
 *   2. References to the canvas, Input handler, and current maze
 *   3. The current game state (player, ghosts, dots, score, lives)
 *
 * All logic lives in pure functions in entities/ and maze/.
 * All drawing lives in rendering/renderer.ts.
 */
export class Game {
  private ctx: CanvasRenderingContext2D;
  private lastTime = 0;
  private rafId = 0;
  private input: Input;
  private maze: MazeState;
  private player: PlayerState;
  private ghosts: GhostState[];
  private dots: Dot[];
  private score = 0;
  private lives = 3;
  private level = 1;
  private fruit: FruitState | null = null;
  private fruitSpawnCount = 0; // how many times fruit has spawned this level (max 2)
  private initialDotCount = 0; // total dots at the start of each level
  private respawnTimer = 0;
  private gameOver = false;
  /** Countdown (seconds) before transitioning away from the GAME OVER overlay. */
  private gameOverTimer = 0;
  private levelComplete = false;
  private levelCompleteTimer = 0;
  private isChasing = true; // start in chase so the ghost hunts immediately on exit
  private modeTimer = 0;
  /** Seconds remaining until the next Hero Pellet spawns (0 = ready to spawn). */
  private heroSpawnTimer = 0;
  /** Seconds remaining while the Hero Pellet is active (0 = none active). */
  private heroPelletTimer = 0;

  // ── Screen state ────────────────────────────────────────────────────────────
  /** Which top-level screen is currently shown. */
  private screen: "attract" | "playing" | "enterInitials" = "attract";
  /** Shared blink timer for prompt animations (wraps every second). */
  private blinkTimer = 0;
  private blinkOn = true;
  /** Loaded/refreshed high-score table. */
  private highScores: HighScoreEntry[] = [];
  /** Current initials being entered (3 uppercase chars). */
  private initialsChars: string[] = ["A", "A", "A"];
  /** Index of the cursor position in the initials entry (0–2). */
  private initialsPos = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D canvas context");
    this.ctx = ctx;

    canvas.width = 560; // 28 tiles × 20px
    canvas.height = 620 + HUD_HEIGHT; // 31 maze rows + 1 HUD row

    this.input = new Input();

    // Initialise to valid defaults — real values set by initGame() before play.
    this.maze = createMaze(LEVEL_1);
    const startX = LEVEL_1.playerStart.col * TILE + TILE / 2;
    const startY = LEVEL_1.playerStart.row * TILE + TILE / 2;
    this.player = createPlayer(startX, startY);
    this.ghosts = this.createGhosts();
    this.dots = createDotsFromMaze(this.maze);
    this.initialDotCount = this.dots.length;

    this.highScores = loadHighScores();
  }

  /** Resets all gameplay state for a fresh game (called before each new play). */
  private initGame(): void {
    this.maze = createMaze(LEVEL_1);
    const startX = LEVEL_1.playerStart.col * TILE + TILE / 2;
    const startY = LEVEL_1.playerStart.row * TILE + TILE / 2;
    this.player = createPlayer(startX, startY);
    this.ghosts = this.createGhosts();
    this.dots = createDotsFromMaze(this.maze);
    this.initialDotCount = this.dots.length;
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.fruit = null;
    this.fruitSpawnCount = 0;
    this.respawnTimer = 0;
    this.gameOver = false;
    this.gameOverTimer = 0;
    this.levelComplete = false;
    this.levelCompleteTimer = 0;
    this.isChasing = true;
    this.modeTimer = 0;
    this.heroPelletTimer = 0;
    this.scheduleHeroSpawn();
  }

  /** Creates all three ghosts with staggered pen timers. */
  private createGhosts(): GhostState[] {
    const [blinkyStart, pinkyStart, clydeStart] = LEVEL_1.ghostStarts;
    return [
      createGhost(
        blinkyStart.col * TILE + TILE / 2,
        blinkyStart.row * TILE + TILE / 2,
        "blinky",
        1,
      ),
      createGhost(
        pinkyStart.col * TILE + TILE / 2,
        pinkyStart.row * TILE + TILE / 2,
        "pinky",
        4,
      ),
      createGhost(
        clydeStart.col * TILE + TILE / 2,
        clydeStart.row * TILE + TILE / 2,
        "clyde",
        7,
      ),
    ];
  }

  start(): void {
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
    this.input.destroy();
  }

  private loop(timestamp: number): void {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    // Shared blink timer (used by attract and initials screens)
    this.blinkTimer += dt;
    if (this.blinkTimer >= 0.5) {
      this.blinkTimer -= 0.5;
      this.blinkOn = !this.blinkOn;
    }

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    if (this.screen === "attract") {
      this.updateAttract();
      return;
    }
    if (this.screen === "enterInitials") {
      this.updateEnterInitials();
      return;
    }
    this.updatePlaying(dt);
  }

  /** Attract screen: wait for the player to press Enter/Space to start. */
  private updateAttract(): void {
    if (this.input.consumeConfirm()) {
      this.initGame();
      this.screen = "playing";
    }
  }

  /** Initials-entry screen: type letters, Backspace, then Enter to submit. */
  private updateEnterInitials(): void {
    const ch = this.input.consumeTypedChar();
    if (ch !== null && this.initialsPos < 3) {
      this.initialsChars[this.initialsPos] = ch;
      this.initialsPos = Math.min(3, this.initialsPos + 1);
    }

    if (this.input.consumeBackspace()) {
      this.initialsPos = Math.max(0, this.initialsPos - 1);
      this.initialsChars[this.initialsPos] = "A";
    }

    if (this.input.consumeConfirm() && this.initialsPos === 3) {
      saveHighScore({
        initials: this.initialsChars.join(""),
        score: this.score,
        level: this.level,
      });
      this.highScores = loadHighScores();
      this.screen = "attract";
    }
  }

  private updatePlaying(dt: number): void {
    // Game-over countdown — show overlay briefly, then transition
    if (this.gameOver) {
      this.gameOverTimer = Math.max(0, this.gameOverTimer - dt);
      if (this.gameOverTimer === 0) {
        this.highScores = loadHighScores();
        if (qualifiesForLeaderboard(this.score)) {
          this.initialsChars = ["A", "A", "A"];
          this.initialsPos = 0;
          this.screen = "enterInitials";
        } else {
          this.screen = "attract";
        }
      }
      return;
    }

    // Level complete — count down then restart the maze
    if (this.levelComplete) {
      this.levelCompleteTimer = Math.max(0, this.levelCompleteTimer - dt);
      if (this.levelCompleteTimer === 0) {
        this.levelComplete = false;
        this.level++;
        this.dots = createDotsFromMaze(this.maze);
        this.initialDotCount = this.dots.length;
        this.fruit = null;
        this.fruitSpawnCount = 0;
        this.heroPelletTimer = 0;
        this.scheduleHeroSpawn();
        this.resetPositions();
        this.isChasing = true;
        this.modeTimer = 0;
      }
      return;
    }

    // Death animation — advance progress; resolve lives/game-over when done
    if (this.player.dying) {
      const progress = Math.min(
        1,
        this.player.deathProgress + dt / DEATH_ANIM_DURATION,
      );
      this.player = { ...this.player, deathProgress: progress };
      if (progress >= 1) {
        this.lives--;
        if (this.lives <= 0) {
          this.gameOver = true;
          this.gameOverTimer = 3;
        } else {
          this.respawnTimer = RESPAWN_FREEZE;
          this.resetPositions();
        }
      }
      return;
    }

    // Respawn freeze — show the current frame but skip all physics
    if (this.respawnTimer > 0) {
      this.respawnTimer = Math.max(0, this.respawnTimer - dt);
      return;
    }

    const width = this.canvas.width;
    // Player physics live in maze coordinates (620px tall), not the full
    // canvas height (which includes the HUD strip).
    const mazeHeight = this.maze.rows * TILE;
    const { tunnelRow } = this.maze;

    // On the tunnel row the left and right canvas edges are open passages.
    // We intercept out-of-canvas probes on that row so canMoveInDir doesn't
    // treat them as walls, allowing Pac-Man to physically cross the edge.
    const wallFn = (px: number, py: number): boolean => {
      const row = Math.floor(py / TILE);
      if (row === tunnelRow && (px < 0 || px >= width)) return false;
      return isWallAt(this.maze, px, py);
    };

    // On the tunnel row extend x-bounds beyond the canvas so updatePlayer's
    // clamp doesn't snap Pac-Man back before wrapTunnels can fire.
    const playerRow = Math.floor(this.player.y / TILE);
    const bounds =
      playerRow === tunnelRow
        ? { width, height: mazeHeight, xMin: -TILE, xMax: width + TILE }
        : { width, height: mazeHeight };

    this.player = updatePlayer(
      this.player,
      this.input.direction,
      dt,
      bounds,
      wallFn,
    );

    this.player = wrapTunnels(this.player, tunnelRow, width);

    // Hero pellet lifecycle
    const heroActive = this.dots.some((d) => d.isHeroPellet);
    if (heroActive) {
      // Count down the 20-second active window
      this.heroPelletTimer = Math.max(0, this.heroPelletTimer - dt);
      if (this.heroPelletTimer === 0) {
        // Expired: revert the star back to a plain dot
        this.dots = expireHeroPellet(this.dots);
        this.scheduleHeroSpawn();
      }
    } else if (this.heroSpawnTimer > 0) {
      // Count down to the next appearance
      this.heroSpawnTimer = Math.max(0, this.heroSpawnTimer - dt);
      if (this.heroSpawnTimer === 0) {
        this.dots = spawnHeroPellet(this.dots);
        this.heroPelletTimer = HERO_PELLET_DURATION;
      }
    }

    // Track pellet count before eating to detect power pellet consumption
    const pelletsBefore = this.dots.filter((d) => d.isPellet).length;
    // Track hero pellet before eating to detect its consumption
    const heroBefore = this.dots.find((d) => d.isHeroPellet);

    const prevCount = this.dots.length;
    this.dots = eatDots(this.dots, this.player.x, this.player.y, PACMAN_RADIUS);
    this.score += prevCount - this.dots.length;

    // Hero pellet eaten — roll for a special power
    if (heroBefore !== undefined && !this.dots.some((d) => d.isHeroPellet)) {
      this.heroPelletTimer = 0;
      this.scheduleHeroSpawn();
      this.applyHeroPower(rollHeroPower());
      // Level skip empties the dot array — re-check for level complete below
      if (this.dots.length === 0) {
        this.levelComplete = true;
        this.levelCompleteTimer = 3;
        return;
      }
    }

    // Power pellet eaten → frighten ghosts that are out in the maze.
    // Ghosts in pen/exiting can't pass the door while frightened so they must
    // be left alone; eaten ghosts are already heading back and are unaffected.
    const pelletsAfter = this.dots.filter((d) => d.isPellet).length;
    if (pelletsAfter < pelletsBefore) {
      this.ghosts = this.ghosts.map((g) => {
        if (
          g.mode === "scatter" ||
          g.mode === "chase" ||
          g.mode === "frightened"
        ) {
          // Reverse direction on entering frightened (classic Pac-Man behaviour)
          return {
            ...g,
            mode: "frightened" as const,
            frightenedTimer: FRIGHTENED_DURATION,
            dir: oppositeDir(g.dir),
          };
        }
        return g;
      });
    }

    // Fruit spawn — trigger at 1/3 and 2/3 dots eaten, max 2 per level
    if (this.fruit === null && this.fruitSpawnCount < 2) {
      const dotsEaten = this.initialDotCount - this.dots.length;
      const threshold =
        this.fruitSpawnCount === 0
          ? Math.floor(this.initialDotCount / 3)
          : Math.floor((2 * this.initialDotCount) / 3);
      if (dotsEaten >= threshold) {
        const spawnX = LEVEL_1.playerStart.col * TILE + TILE / 2;
        const spawnY = LEVEL_1.playerStart.row * TILE + TILE / 2;
        this.fruit = {
          x: spawnX,
          y: spawnY,
          type: fruitTypeForLevel(this.level),
          timer: FRUIT_DURATION,
        };
        this.fruitSpawnCount++;
      }
    }

    // Fruit timer — remove when expired
    if (this.fruit !== null) {
      this.fruit = {
        ...this.fruit,
        timer: Math.max(0, this.fruit.timer - dt),
      };
      if (this.fruit.timer === 0) {
        this.fruit = null;
      }
    }

    // Fruit collection
    if (this.fruit !== null) {
      const fdx = this.player.x - this.fruit.x;
      const fdy = this.player.y - this.fruit.y;
      if (fdx * fdx + fdy * fdy < (PACMAN_RADIUS + FRUIT_RADIUS) ** 2) {
        this.score += FRUIT_POINTS[this.fruit.type];
        this.fruit = null;
      }
    }

    // All dots eaten — level complete
    if (this.dots.length === 0) {
      this.levelComplete = true;
      this.levelCompleteTimer = 3;
      return;
    }

    // Scatter / chase global mode cycling.
    // The timer pauses while any ghost is frightened (classic Pac-Man behaviour:
    // the scatter/chase phase clock freezes during the power-pellet window so
    // ghosts reliably resume chasing once frightened mode ends).
    const anyFrightened = this.ghosts.some((g) => g.mode === "frightened");
    if (!anyFrightened) {
      this.modeTimer += dt;
      const phaseDuration = this.isChasing ? CHASE_DURATION : SCATTER_DURATION;
      if (this.modeTimer >= phaseDuration) {
        this.modeTimer = 0;
        this.isChasing = !this.isChasing;
        // Reverse direction on mode switch for all actively roaming ghosts
        this.ghosts = this.ghosts.map((g) => {
          if (g.mode === "scatter" || g.mode === "chase") {
            return { ...g, dir: oppositeDir(g.dir) };
          }
          return g;
        });
      }
    }

    // Update ghost AI
    const heroPelletPos = this.dots.find((d) => d.isHeroPellet) ?? null;
    this.ghosts = this.ghosts.map((g) =>
      wrapGhostTunnel(
        updateGhost(
          g,
          this.player.x,
          this.player.y,
          this.player.facing,
          dt,
          this.maze,
          this.isChasing,
          heroPelletPos,
        ),
        tunnelRow,
        width,
      ),
    );

    // Collision detection for each ghost
    for (let i = 0; i < this.ghosts.length; i++) {
      const g = this.ghosts[i];
      if (!g) continue;
      const dx = this.player.x - g.x;
      const dy = this.player.y - g.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < COLLISION_DIST * COLLISION_DIST) {
        if (g.mode === "frightened") {
          // Player eats the ghost
          this.ghosts[i] = { ...g, mode: "eaten", frightenedTimer: 0 };
          this.score += 200;
        } else if (
          g.mode !== "eaten" &&
          g.mode !== "pen" &&
          g.mode !== "exiting"
        ) {
          // Ghost kills the player — start death animation
          this.player = { ...this.player, dying: true, deathProgress: 0 };
          break; // one death per frame is enough
        }
      }
    }
  }

  private resetPositions(): void {
    const startX = LEVEL_1.playerStart.col * TILE + TILE / 2;
    const startY = LEVEL_1.playerStart.row * TILE + TILE / 2;

    this.player = createPlayer(startX, startY);
    this.ghosts = this.createGhosts();
  }

  /**
   * Sets a random countdown (10–30 s) before the next Hero Pellet appears.
   * Called at level start and whenever a hero pellet expires or is eaten.
   */
  private scheduleHeroSpawn(): void {
    this.heroSpawnTimer =
      HERO_SPAWN_MIN + Math.random() * (HERO_SPAWN_MAX - HERO_SPAWN_MIN);
  }

  /**
   * Applies the power awarded by eating a Hero Pellet.
   *   extraLife  — grants one additional life.
   *   levelSkip  — instantly awards points for every remaining dot and clears
   *                the board so that the level-complete check fires this frame.
   */
  private applyHeroPower(power: HeroPower): void {
    if (power === "extraLife") {
      this.lives++;
    } else {
      // Award the full score value of every remaining dot and power pellet,
      // then clear the board (1 pt per regular dot, 5 pts per power pellet).
      this.score += sumDotScores(this.dots);
      this.dots = [];
    }
  }

  private render(): void {
    if (this.screen === "attract") {
      clearCanvas(this.ctx, this.canvas.width, this.canvas.height);
      drawAttractScreen(
        this.ctx,
        this.highScores,
        this.canvas.width,
        this.canvas.height,
        this.blinkOn,
      );
      return;
    }

    if (this.screen === "enterInitials") {
      clearCanvas(this.ctx, this.canvas.width, this.canvas.height);
      drawEnterInitials(
        this.ctx,
        this.initialsChars,
        this.initialsPos,
        this.score,
        this.level,
        this.canvas.width,
        this.canvas.height,
        this.blinkOn,
      );
      return;
    }

    // Playing screen
    clearCanvas(this.ctx, this.canvas.width, this.canvas.height);

    // HUD — drawn in canvas space before any transform
    drawScore(this.ctx, this.score, this.canvas.width);
    drawLevel(this.ctx, this.level, this.canvas.width);
    drawLives(this.ctx, this.lives);

    // Maze, dots, ghosts and player live in maze coordinates; shift down past the HUD.
    this.ctx.save();
    this.ctx.translate(0, HUD_HEIGHT);
    drawMaze(this.ctx, this.maze);
    drawDots(this.ctx, this.dots);
    if (this.fruit !== null) {
      drawFruit(this.ctx, this.fruit);
    }
    for (const ghost of this.ghosts) {
      drawGhost(this.ctx, ghost);
    }
    drawPlayer(this.ctx, this.player);
    this.ctx.restore();

    if (this.levelComplete) {
      drawLevelComplete(this.ctx, this.canvas.width, this.canvas.height);
    }

    if (this.gameOver) {
      drawGameOver(this.ctx, this.canvas.width, this.canvas.height);
    }
  }
}
