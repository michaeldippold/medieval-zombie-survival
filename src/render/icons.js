// TILE×TILE item icons for the hotbar and inventory panel. A placeable item draws as its own tile
// (via ITEMS[id].make) with zero extra code — add a new placeable and its icon just works.
import { TILE, COLORS } from '../config.js';
import { ITEMS } from '../items.js';
import { paintTile } from './tiles.js';
import { drawWeapon } from './sprites.js';

export function paintItemIcon(ctx, id) {
  ctx.clearRect(0, 0, TILE, TILE);
  const item = ITEMS[id];
  if (item?.make) { paintTile(ctx, 0, 0, item.make(1)); return; }
  switch (id) {
    case 'plank':
      for (let i = 0; i < 3; i++) { ctx.fillStyle = COLORS.doorLeaf; ctx.fillRect(4, 6 + i * 11, 32, 9); ctx.fillStyle = COLORS.frame; ctx.fillRect(4, 13 + i * 11, 32, 2); }
      break;
    case 'curtain':
      ctx.fillStyle = COLORS.frame; ctx.fillRect(TILE * 0.15, TILE * 0.12, TILE * 0.7, TILE * 0.06);
      ctx.fillStyle = COLORS.doorLeaf;
      ctx.beginPath();
      ctx.moveTo(TILE * 0.2, TILE * 0.18);
      ctx.quadraticCurveTo(TILE * 0.3, TILE * 0.5, TILE * 0.22, TILE * 0.85);
      ctx.lineTo(TILE * 0.55, TILE * 0.85);
      ctx.quadraticCurveTo(TILE * 0.48, TILE * 0.5, TILE * 0.6, TILE * 0.18);
      ctx.closePath(); ctx.fill();
      break;
    case 'arrow':
      for (const off of [-6, 6]) {
        ctx.save(); ctx.translate(20 + off, 20 - off); ctx.rotate(-Math.PI / 4);
        ctx.strokeStyle = COLORS.arrowShaft; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(10, 0); ctx.stroke();
        ctx.fillStyle = COLORS.arrowHead; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(8, -3.5); ctx.lineTo(8, 3.5); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = COLORS.arrowFletch; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-17, -3); ctx.moveTo(-14, 0); ctx.lineTo(-17, 3); ctx.stroke();
        ctx.restore();
      }
      break;
    default:
      ctx.save(); ctx.translate(6, 30); ctx.rotate(-Math.PI / 4); drawWeapon(ctx, id); ctx.restore();
  }
}
