// Draws the world from state. Reads only; never mutates state.
import { TILE as T, VIEW, COLORS } from '../config.js';
import { isPortal, TILE_DEFS } from '../world/tiles.js';
import { ITEMS } from '../items.js';
import { heldId } from '../inventory.js';
import { paintTile } from './tiles.js';
import { drawPlayer, drawZombie, drawSwing, drawArrow, drawDrop } from './sprites.js';
import { drawHud } from '../ui/hud.js';

export function render(ctx, state) {
  const { world, camera, vision, player: p, input } = state;
  ctx.clearRect(0, 0, VIEW.W, VIEW.H);
  ctx.fillStyle = COLORS.sky; ctx.fillRect(0, 0, VIEW.W, VIEW.H);

  ctx.save();
  ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

  // clouds: slow parallax against the camera, pinned to the sky band above the surface
  ctx.fillStyle = COLORS.cloud;
  const px = camera.x * 0.3, cy = Math.max(0, camera.y) * 0.5;
  for (let x = 120; x < world.pxWidth + 600; x += 520) {
    ctx.fillRect(x + px, 70 + cy, 90, 22); ctx.fillRect(x + 20 + px, 56 + cy, 50, 16); ctx.fillRect(x + 260 + px, 150 + cy, 70, 18);
    ctx.fillRect(x + 380 + px, 330 + cy, 80, 18); ctx.fillRect(x + 90 + px, 420 + cy, 60, 14);
  }

  const cFrom = Math.max(0, world.colOf(camera.x)), cTo = Math.min(world.cols - 1, world.colOf(camera.x + VIEW.W));
  const rFrom = Math.max(0, world.rowOf(camera.y)), rTo = Math.min(world.rows - 1, world.rowOf(camera.y + VIEW.H));
  for (let r = rFrom; r <= rTo; r++) for (let c = cFrom; c <= cTo; c++) { const t = world.grid[r][c]; if (t) paintTile(ctx, c, r, t); }

  ctx.fillStyle = COLORS.fog;
  for (let r = rFrom; r <= rTo; r++) for (let c = cFrom; c <= cTo; c++) if (!vision.visible.has(world.idx(c, r))) ctx.fillRect(c * T, r * T, T, T);

  for (const d of state.drops) if (vision.visible.has(world.idxAtPx(d.x + d.w / 2, d.y + d.h / 2))) drawDrop(ctx, d);
  for (const e of state.zombies) if (vision.visible.has(world.idxAtPx(e.x + e.w / 2, e.y + e.h / 2))) drawZombie(ctx, e);

  const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
  if (state.swing) drawSwing(ctx, pcx, pcy, state.swing);
  drawPlayer(ctx, p, state.aim, heldId(state.inventory, state.held));
  for (const a of state.arrows) drawArrow(ctx, a);

  // cursor feedback: a placement ghost when a placeable is selected, else outlines for a tool
  // target or a portal under the cursor
  const mc = world.colOf(input.mouse.wx), mr = world.rowOf(input.mouse.wy);
  const hover = world.get(mc, mr);
  if (state.ghost) {
    const g = state.ghost;
    const insideDir = Math.sign(pcx - (g.c * T + T / 2)) || 1;
    const proto = ITEMS[g.itemId].make(insideDir);
    // paintTile only spans a tile's full multi-cell footprint (DESIGN §5.8) for an anchor that
    // actually has `footAt` — true for anything `stampMulti` has placed, false for a bare
    // `item.make()` prototype like this one. Fake it so the ghost previews the real, whole
    // shape (one door, not the single square its own cell would draw); outlines still cover
    // every cell of the footprint, not just the one under the cursor.
    proto.footAt = { c: g.c, r: g.r };
    const cells = [[0, 0], ...(TILE_DEFS[proto.kind].footprint || [])].map(([dc, dr]) => [g.c + dc, g.r + dr]);
    ctx.save(); ctx.globalAlpha = 0.5;
    paintTile(ctx, g.c, g.r, proto);
    ctx.restore();
    ctx.strokeStyle = g.ok ? COLORS.ghostOk : COLORS.ghostBad; ctx.lineWidth = 2;
    for (const [cc, rr] of cells) ctx.strokeRect(cc * T - 1, rr * T - 1, T + 2, T + 2);
  } else if (state.target) {
    ctx.strokeStyle = state.target.near ? COLORS.accent : 'rgba(242,177,52,0.4)'; ctx.lineWidth = 2;
    ctx.strokeRect(state.target.c * T - 2, state.target.r * T - 2, T + 4, T + 4);
  } else if (isPortal(hover)) {
    ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 2;
    ctx.strokeRect(mc * T - 2, mr * T - 2, T + 4, T + 4);
  }

  const { wx, wy } = input.mouse;
  ctx.strokeStyle = COLORS.crosshair; ctx.lineWidth = 1; ctx.beginPath();
  ctx.moveTo(wx - 8, wy); ctx.lineTo(wx - 3, wy); ctx.moveTo(wx + 3, wy); ctx.lineTo(wx + 8, wy);
  ctx.moveTo(wx, wy - 8); ctx.lineTo(wx, wy - 3); ctx.moveTo(wx, wy + 3); ctx.lineTo(wx, wy + 8); ctx.stroke();
  ctx.restore();

  drawHud(ctx, state);
}
