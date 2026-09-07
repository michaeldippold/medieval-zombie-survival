// 40×40 item icons for inventory and palettes. Tiles reuse their painter; the rest are drawn here.
import { TILE, COLORS } from '../config.js';
import { makeTile } from '../world/tiles.js';
import { paintTile } from './tiles.js';
import { drawWeapon } from './sprites.js';

const TILE_ICON = { dirt: 'dirt', stone: 'stone', leaf: 'leaf' };

export function paintItemIcon(ctx, id) {
  ctx.clearRect(0, 0, TILE, TILE);
  if (TILE_ICON[id]) { paintTile(ctx, 0, 0, makeTile(TILE_ICON[id])); return; }
  switch (id) {
    case 'wood':
      for (let i = 0; i < 3; i++) { ctx.fillStyle = COLORS.doorLeaf; ctx.fillRect(4, 6 + i * 11, 32, 9); ctx.fillStyle = COLORS.frame; ctx.fillRect(4, 13 + i * 11, 32, 2); }
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
