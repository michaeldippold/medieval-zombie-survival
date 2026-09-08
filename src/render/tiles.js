// Tile painters. One function per kind, plus shared decorations (bars, cracks, splinters).
import { TILE as T, COLORS, PORTAL } from '../config.js';
import { integrity, TILE_DEFS } from '../world/tiles.js';

export function paintTile(ctx, c, r, t) {
  const x = c * T, y = r * T;
  if (t.back) paintBack(ctx, x, y, t.back, c);
  const fn = PAINTERS[t.kind];
  if (fn) fn(ctx, x, y, t, c, r);
  else paintPlain(ctx, x, y, t);
}

// Default look for any block without its own painter: a flat fill from the def, optional cap
// strip and edge line, and cracks as it takes damage. A new plain block is one row in TILE_DEFS.
function paintPlain(ctx, x, y, t) {
  const d = TILE_DEFS[t.kind];
  if (!d.color) return;
  ctx.fillStyle = d.color; ctx.fillRect(x, y, T, T);
  if (d.cap) { ctx.fillStyle = d.cap; ctx.fillRect(x, y, T, 8); }
  if (d.edge) { ctx.strokeStyle = d.edge; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, T - 2, T - 2); }
  paintCracks(ctx, x, y, integrity(t));
}

// Bark: edge-to-edge fill with a couple of shaded rings so it doesn't read as a flat brown box.
function paintBark(ctx, x, y) {
  ctx.fillStyle = COLORS.trunk; ctx.fillRect(x, y, T, T);
  ctx.fillStyle = COLORS.trunkShade;
  ctx.fillRect(x, y, 4, T); ctx.fillRect(x + T - 4, y, 4, T);
  ctx.fillRect(x, y + 10, T, 3); ctx.fillRect(x, y + 27, T, 3);
}

function paintBack(ctx, x, y, back, c) {
  if (back === 'plaster') { ctx.fillStyle = COLORS.plaster; ctx.fillRect(x, y, T, T); if (c % 2 === 0) { ctx.fillStyle = COLORS.plasterStripe; ctx.fillRect(x, y, T, T); } }
  else if (back === 'earth') { ctx.fillStyle = COLORS.earthBack; ctx.fillRect(x, y, T, T); }
}

// Whether `kind` has a dedicated painter (as opposed to falling back to paintPlain). Used by
// validate.js at boot to confirm every tile kind can actually be drawn one way or the other.
export const hasPainter = kind => kind in PAINTERS;

// Only blocks with a distinctive look get a painter. Everything else uses paintPlain via its def.
const PAINTERS = {
  air() {},
  grass(ctx, x, y, t) {
    ctx.fillStyle = COLORS.dirt; ctx.fillRect(x, y, T, T);
    ctx.fillStyle = COLORS.grass; ctx.fillRect(x, y, T, 8);
    ctx.fillStyle = COLORS.grassShade; ctx.fillRect(x, y + 8, T, 2);
    paintCracks(ctx, x, y, integrity(t));
  },
  // Full block, edge to edge, so a natural trunk and a placed log block read as the same
  // material — one is just standing in a tree, the other in a wall.
  trunk(ctx, x, y) { paintBark(ctx, x, y); },
  log(ctx, x, y, t) { paintBark(ctx, x, y); paintCracks(ctx, x, y, integrity(t)); },
  leaf(ctx, x, y, t, c, r) {
    ctx.fillStyle = COLORS.leaf; ctx.fillRect(x, y, T, T);
    ctx.fillStyle = COLORS.leafShade; ctx.fillRect(x + ((c * 7 + r * 3) % 20), y + ((c * 5 + r * 11) % 22), 10, 8);
  },
  wall_stone(ctx, x, y, t) {
    ctx.fillStyle = COLORS.wallStone; ctx.fillRect(x, y, T, T);
    ctx.strokeStyle = COLORS.wallStoneEdge; ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, T - 2, T / 2 - 1); ctx.strokeRect(x + 1, y + T / 2, T / 2, T / 2 - 1); ctx.strokeRect(x + T / 2, y + T / 2, T / 2 - 1, T / 2 - 1);
    paintCracks(ctx, x, y, integrity(t));
  },
  floor(ctx, x, y, t) {
    ctx.fillStyle = COLORS.wood; ctx.fillRect(x, y, T, T);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x, y + 18, T, 3);
    paintCracks(ctx, x, y, integrity(t));
  },
  ladder(ctx, x, y) { paintLadder(ctx, x, y); },
  door(ctx, x, y, t) {
    ctx.fillStyle = COLORS.frame; ctx.fillRect(x, y - 3, 3, T + 3); ctx.fillRect(x + T - 3, y - 3, 3, T + 3); ctx.fillRect(x, y - 3, T, 3);
    if (t.broken) { ctx.fillStyle = COLORS.opening; ctx.fillRect(x + 3, y, T - 6, T); paintSplinters(ctx, x, y); }
    else if (t.open) { ctx.fillStyle = COLORS.opening; ctx.fillRect(x + 3, y, T - 6, T); ctx.fillStyle = COLORS.doorLeaf; ctx.fillRect(x + 3, y, 6, T); }
    else {
      ctx.fillStyle = COLORS.doorLeaf; ctx.fillRect(x + 3, y, T - 6, T);
      ctx.fillStyle = COLORS.frame; ctx.fillRect(x + 3, y + 12, T - 6, 3); ctx.fillRect(x + 3, y + 26, T - 6, 3);
      ctx.fillStyle = '#3a3f41'; ctx.fillRect(x + T - 12, y + T / 2 - 2, 4, 4);
      paintCracks(ctx, x, y, integrity(t));
    }
    paintBars(ctx, x, y, t);
  },
  shutter(ctx, x, y, t) {
    ctx.fillStyle = COLORS.frame; ctx.fillRect(x, y, T, T);
    if (t.broken) { ctx.fillStyle = COLORS.opening; ctx.fillRect(x + 4, y + 4, T - 8, T - 8); paintSplinters(ctx, x + 2, y + 2); }
    else if (t.open) {
      ctx.fillStyle = COLORS.opening; ctx.fillRect(x + 4, y + 4, T - 8, T - 8);
      ctx.fillStyle = COLORS.doorLeaf; ctx.fillRect(x - 6, y + 2, 8, T - 4); ctx.fillRect(x + T - 2, y + 2, 8, T - 4);   // panels swung wide
    } else {
      ctx.fillStyle = COLORS.doorLeaf; ctx.fillRect(x + 4, y + 4, T - 8, T - 8);
      ctx.fillStyle = COLORS.frame; ctx.fillRect(x + T / 2 - 1, y + 4, 2, T - 8);
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(x + 4, y + 14, T - 8, 2); ctx.fillRect(x + 4, y + 26, T - 8, 2);
      paintCracks(ctx, x, y, integrity(t));
    }
    paintBars(ctx, x, y, t);
  },
  hatch(ctx, x, y, t) {
    paintLadder(ctx, x, y);                              // the ladder continues through the hatch
    if (t.broken) paintSplinters(ctx, x, y);
    else if (t.open) { ctx.fillStyle = COLORS.wood; ctx.fillRect(x - 2, y - 6, 8, T + 6); }   // lid swung up
    else {
      ctx.fillStyle = COLORS.wood; ctx.fillRect(x - 2, y, T + 4, T);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x - 2, y + 12, T + 4, 3); ctx.fillRect(x - 2, y + 26, T + 4, 3);
      ctx.fillStyle = '#3a3f41'; ctx.fillRect(x + T / 2 - 2, y + 18, 4, 4);
      paintCracks(ctx, x, y, integrity(t));
    }
    paintBars(ctx, x, y, t);
  },
};

function paintLadder(ctx, x, y) {
  ctx.fillStyle = COLORS.frame; ctx.fillRect(x + 10, y, 4, T); ctx.fillRect(x + 26, y, 4, T);
  for (let yy = y + 6; yy < y + T; yy += 12) ctx.fillRect(x + 10, yy, 20, 3);
}
function paintBars(ctx, x, y, t) {
  for (let i = 0; i < t.bars; i++) {
    const by = y + 10 + i * 14;
    ctx.fillStyle = COLORS.woodDark; ctx.fillRect(x - 4, by, T + 8, 9);
    ctx.fillStyle = '#3a3f41'; ctx.fillRect(x - 2, by + 3, 3, 3); ctx.fillRect(x + T - 1, by + 3, 3, 3);
  }
  if (t.bars > 0 && t.barHp < PORTAL.BAR_HP) paintCracks(ctx, x, y, t.barHp / PORTAL.BAR_HP);
}
export function paintCracks(ctx, x, y, ratio) {
  if (!(ratio < 0.99)) return;
  ctx.strokeStyle = 'rgba(20,20,20,0.7)'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 6); ctx.lineTo(x + 18, y + 18); ctx.lineTo(x + 14, y + 30);
  if (ratio < 0.66) { ctx.moveTo(x + 30, y + 8); ctx.lineTo(x + 22, y + 20); ctx.lineTo(x + 32, y + 34); }
  if (ratio < 0.33) { ctx.moveTo(x + 4, y + 24); ctx.lineTo(x + 20, y + 26); ctx.lineTo(x + 36, y + 20); }
  ctx.stroke();
}
function paintSplinters(ctx, x, y) {
  ctx.fillStyle = COLORS.woodDark;
  ctx.beginPath(); ctx.moveTo(x + 3, y + 2); ctx.lineTo(x + 14, y + 2); ctx.lineTo(x + 5, y + 16); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + T - 3, y + T - 2); ctx.lineTo(x + T - 15, y + T - 2); ctx.lineTo(x + T - 5, y + T - 15); ctx.closePath(); ctx.fill();
}
