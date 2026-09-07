// AABB physics. No engine: move X, resolve; move Y, resolve. See DESIGN §6.
import { TILE } from './config.js';
import { isSolid, isClimbable } from './world/tiles.js';

export const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export function moveBody(b, solids, dt) {
  b.hitX = false; b.onGround = false;
  b.x += b.vx * dt;
  for (const s of solids) {
    if (!overlap(b, s)) continue;
    if (b.vx > 0) b.x = s.x - b.w; else if (b.vx < 0) b.x = s.x + s.w;
    b.hitX = true;
  }
  b.y += b.vy * dt;
  for (const s of solids) {
    if (!overlap(b, s)) continue;
    if (b.vy > 0) { b.y = s.y - b.h; b.onGround = true; } else if (b.vy < 0) { b.y = s.y + s.h; }
    b.vy = 0;
  }
}

// Sector test: closest point on the box to the pivot must be within reach and within the arc.
export function sectorHits(cx, cy, angle, reach, halfArc, b) {
  const px = Math.max(b.x, Math.min(cx, b.x + b.w)), py = Math.max(b.y, Math.min(cy, b.y + b.h));
  const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy);
  if (d > reach) return false;
  if (d < 1) return true;
  let da = Math.atan2(dy, dx) - angle; da = Math.atan2(Math.sin(da), Math.cos(da));
  return Math.abs(da) <= halfArc;
}

// Slab-method ray vs AABB. Returns distance along the ray or Infinity.
export function rayBox(ox, oy, dx, dy, b) {
  let tmin = 0, tmax = Infinity;
  for (const [o, d, lo, hi] of [[ox, dx, b.x, b.x + b.w], [oy, dy, b.y, b.y + b.h]]) {
    if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return Infinity; continue; }
    let t1 = (lo - o) / d, t2 = (hi - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return Infinity;
  }
  return tmin;
}

// A body is "on a ladder" if any climbable tile sits under its centre column.
export function onClimbable(world, b) {
  const cx = b.x + b.w / 2;
  for (let yy = b.y; yy < b.y + b.h; yy += TILE / 2) if (isClimbable(world.tileAtPx(cx, yy))) return true;
  return isClimbable(world.tileAtPx(cx, b.y + b.h - 1));
}

// One-tile step: a blocked body whose obstacle has a passable tile above it is lifted into that tile.
// Bodies are shorter than a tile, so x-motion then carries them through. Sills, open shutters, ladder tops.
export function tryClimb(world, b) {
  const c = world.colOf(b.vx > 0 ? b.x + b.w + 2 : b.x - 2);
  const r = world.rowOf(b.y + b.h - 1);
  if (!world.inBounds(c, r) || r - 1 < 0) return false;
  if (!isSolid(world.get(c, r)) || isSolid(world.get(c, r - 1))) return false;
  b.y = (r - 1) * TILE + TILE - b.h; b.vy = 0;
  return true;
}
