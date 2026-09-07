import { createGame } from './game.js';

const game = createGame({
  canvas: document.getElementById('g'),
  menuEl: document.getElementById('menu'),
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
