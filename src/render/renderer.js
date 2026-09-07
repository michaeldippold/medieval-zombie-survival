// Draws the world from state. Reads only; never mutates state.
import { TILE as T, VIEW, COLORS } from '../config.js';
import { isPortal } from '../world/tiles.js';
import { paintTile } from './tiles.js';
import { drawPlayer, drawZombie, drawSwing, drawArrow } from './sprites.js';
import { drawHud } from '../ui/hud.js';

export function render(ctx, state) {
  const { world, camera, vision, player: p, input } = state;
  ctx.clearRect(0, 0, VIEW.W, VIEW.H);
  ctx.fillStyle = COLORS.sky; ctx.fillRect(0, 0, VIEW.W, VIEW.H);

  ctx.save();
  ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

  // clouds: slow parallax against the camera
  ctx.fillStyle = COLORS.cloud;
  const px = camera.x * 0.3;
  for (let x = 120; x < world.pxWidth + 600; x += 520) { ctx.fillRect(x + px, 70, 90, 22); ctx.fillRect(x + 20 + px, 56, 50, 16); ctx.fillRect(x + 260 + px, 150, 70, 18); }

  const cFrom = Math.max(0, world.colOf(camera.x)), cTo = Math.min(world.cols - 1, world.colOf(camera.x + VIEW.W));
  const rFrom = Math.max(0, world.rowOf(camera.y)), rTo = Math.min(world.rows - 1, world.rowOf(camera.y + VIEW.H));
  for (let r = rFrom; r <= rTo; r++) for (let c = cFrom; c <= cTo; c++) { const t = world.grid[r][c]; if (t) paintTile(ctx, c, r, t); }

  ctx.fillStyle = COLORS.fog;
  for (let r = rFrom; r <= rTo; r++) for (let c = cFrom; c <= cTo; c++) if (!vision.visible.has(world.idx(c, r))) ctx.fillRect(c * T, r * T, T, T);

  for (const e of state.zombies) if (vision.visible.has(world.idxAtPx(e.x + e.w / 2, e.y + e.h / 2))) drawZombie(ctx, e);

  const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
  if (state.swing) drawSwing(ctx, pcx, pcy, state.swing);
  drawPlayer(ctx, p, state.aim, state.held);
  for (const a of state.arrows) drawArrow(ctx, a);

  const hover = world.tileAtPx(input.mouse.wx, input.mouse.wy);
  if (isPortal(hover)) { ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 2; ctx.strokeRect(world.colOf(input.mouse.wx) * T - 2, world.rowOf(input.mouse.wy) * T - 2, T + 4, T + 4); }

  const { wx, wy } = input.mouse;
  ctx.strokeStyle = COLORS.crosshair; ctx.lineWidth = 1; ctx.beginPath();
  ctx.moveTo(wx - 8, wy); ctx.lineTo(wx - 3, wy); ctx.moveTo(wx + 3, wy); ctx.lineTo(wx + 8, wy);
  ctx.moveTo(wx, wy - 8); ctx.lineTo(wx, wy - 3); ctx.moveTo(wx, wy + 3); ctx.lineTo(wx, wy + 8); ctx.stroke();
  ctx.restore();

  drawHud(ctx, state);
}
