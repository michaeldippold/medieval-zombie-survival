// Tile painters. One function per kind, plus shared decorations (bars, cracks, splinters).
import { TILE as T, COLORS, PORTAL } from '../config.js';
import { integrity, TILE_DEFS } from '../world/tiles.js';
import { spriteFor } from './assets.js';

export function paintTile(ctx, c, r, t) {
  const x = c * T, y = r * T;
  // A `part` cell (DESIGN §5.8) draws nothing of its own — the anchor (below it, at `footAt`)
  // paints one continuous image spanning every cell of the footprint, itself included. Two
  // stacked copies of the same 1-tile door picture read as two doors; one image the height of
  // both cells reads as a door.
  if (t.kind === 'part') { if (t.anchor.back) paintBack(ctx, x, y, t.anchor.back, c); return; }
  if (t.back) paintBack(ctx, x, y, t.back, c);
  // Only a *placed* anchor (one that's actually gone through `stampMulti` and so has `footAt`)
  // spans its full footprint here — an icon preview's tile (built straight off `item.make()`,
  // no placement involved) has no `footAt` and stays single-cell on purpose: an icon is always
  // one small square, never the full-size multi-cell picture (see icons.js/interactions.js).
  // The placement ghost gets a synthetic `footAt` for exactly this reason (see renderer.js).
  const footprint = t.footAt ? (TILE_DEFS[t.kind].footprint || []) : [];
  const minDr = footprint.reduce((m, [, dr]) => Math.min(m, dr), 0);
  const hTiles = 1 - minDr, topY = y + minDr * T;
  const sprite = spriteFor(t.kind);
  if (sprite) { ctx.drawImage(sprite, x, topY, T, hTiles * T); return; }
  const fn = PAINTERS[t.kind];
  if (fn) fn(ctx, x, topY, t, c, r, hTiles, y);
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
  trunk(ctx, x, y) { paintBark(ctx, x, y); },   // shared by natural trunks and a placed log item — same tile, same rules
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
  // `y` here is the TOP of the whole footprint (may be a tile or more above the anchor's own
  // row); `baseY` is the anchor's own row, used for the details that read best near the bottom
  // (lock, cracks, bars) rather than stretched across the full height. One frame, one leaf,
  // one door — not two 1-tile doors stacked. See paintTile's footprint handling above.
  door(ctx, x, y, t, c, r, hTiles = 1, baseY = y) {
    const H = T * hTiles;
    ctx.fillStyle = COLORS.frame; ctx.fillRect(x, y - 3, 3, H + 3); ctx.fillRect(x + T - 3, y - 3, 3, H + 3); ctx.fillRect(x, y - 3, T, 3);
    if (t.broken) { ctx.fillStyle = COLORS.opening; ctx.fillRect(x + 3, y, T - 6, H); paintSplinters(ctx, x, baseY); }
    else if (t.open) { ctx.fillStyle = COLORS.opening; ctx.fillRect(x + 3, y, T - 6, H); ctx.fillStyle = COLORS.doorLeaf; ctx.fillRect(x + 3, y, 6, H); }
    else {
      ctx.fillStyle = COLORS.doorLeaf; ctx.fillRect(x + 3, y, T - 6, H);
      ctx.fillStyle = COLORS.frame; ctx.fillRect(x + 3, y + H * 0.32, T - 6, 3); ctx.fillRect(x + 3, y + H * 0.68, T - 6, 3);
      ctx.fillStyle = '#3a3f41'; ctx.fillRect(x + T - 12, baseY + T / 2 - 2, 4, 4);
      paintCracks(ctx, x, baseY, integrity(t));
    }
    paintBars(ctx, x, y, t, H);
  },
  shutter(ctx, x, y, t, c, r, hTiles = 1, baseY = y) {
    const H = T * hTiles;
    ctx.fillStyle = COLORS.frame; ctx.fillRect(x, y, T, H);
    if (t.broken) { ctx.fillStyle = COLORS.opening; ctx.fillRect(x + 4, y + 4, T - 8, H - 8); paintSplinters(ctx, x + 2, baseY + 2); }
    else if (t.open) {
      ctx.fillStyle = COLORS.opening; ctx.fillRect(x + 4, y + 4, T - 8, H - 8);
      ctx.fillStyle = COLORS.doorLeaf; ctx.fillRect(x - 6, y + 2, 8, H - 4); ctx.fillRect(x + T - 2, y + 2, 8, H - 4);   // panels swung wide
    } else {
      ctx.fillStyle = COLORS.doorLeaf; ctx.fillRect(x + 4, y + 4, T - 8, H - 8);
      ctx.fillStyle = COLORS.frame; ctx.fillRect(x + T / 2 - 1, y + 4, 2, H - 8);
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(x + 4, y + H * 0.38, T - 8, 2); ctx.fillRect(x + 4, y + H * 0.76, T - 8, 2);
      paintCracks(ctx, x, baseY, integrity(t));
    }
    paintBars(ctx, x, y, t, H);
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
// `H` is the full drawn height (a multi-cell door/shutter passes its whole footprint's height;
// everything else defaults to one tile) — bars space themselves out across whatever that is.
function paintBars(ctx, x, y, t, H = T) {
  for (let i = 0; i < t.bars; i++) {
    const by = y + (H * (i + 1)) / (PORTAL.MAX_BARS + 1) - 4;
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
