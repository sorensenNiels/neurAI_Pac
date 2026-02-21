import { Game } from "./game";

const canvas = document.getElementById("game");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Could not find #game canvas element");
}

const game = new Game(canvas);
game.start();
