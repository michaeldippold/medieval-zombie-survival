import { createGame } from './game.js';
import { validateContent } from './validate.js';

validateContent();   // fail loudly at boot on a bad TILE_DEFS/CRAFTS row, not mid-game

const game = createGame({
  canvas: document.getElementById('g'),
  menuEl: document.getElementById('menu'),
  paletteEl: document.getElementById('palette'),
  inventoryEl: document.getElementById('inventory'),
  status: { vis: document.getElementById('vis'), hit: document.getElementById('hit'), total: document.getElementById('total') },
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(1 / 30, (now - last) / 1000);
  last = now;
  game.update(dt);
  game.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.game = game;   // handy in the console while developing
