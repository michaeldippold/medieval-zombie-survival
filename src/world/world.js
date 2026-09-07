// The tile grid and spatial queries on it. Nothing here knows about players or zombies.
import { TILE } from '../config.js';
import { isSolid, isClimbable } from './tiles.js';

export class World {
  constructor(cols, rows) {
    this.cols = cols; this.rows = rows;
    this.grid = Array.from({ length: rows }, () => Array(cols).fill(null));
    this.version = 0;          // bumped on any structural change; caches key off it
    this._climbCols = null; this._climbVersion = -1;
    this.surface = new Int16Array(cols);   // per column: the row where the ground starts, set by the generator
  }
  isUnderground(c, r) { return this.inBounds(c, r) && r >= this.surface[c]; }
  get pxWidth() { return this.cols * TILE; }
  get pxHeight() { return this.rows * TILE; }

  inBounds(c, r) { return c >= 0 && c < this.cols && r >= 0 && r < this.rows; }
  get(c, r) { return this.inBounds(c, r) ? this.grid[r][c] : null; }
  set(c, r, t) { if (this.inBounds(c, r)) { this.grid[r][c] = t; this.version++; } }
  touch() { this.version++; }   // call after mutating a tile's state in place (open/close/bar/damage)

  colOf(x) { return Math.floor(x / TILE); }
  rowOf(y) { return Math.floor(y / TILE); }
  tileAtPx(x, y) { return this.get(this.colOf(x), this.rowOf(y)); }
  idxAtPx(x, y) { return this.rowOf(y) * this.cols + this.colOf(x); }
  idx(c, r) { return r * this.cols + c; }
  rectOf(c, r) { return { x: c * TILE, y: r * TILE, w: TILE, h: TILE }; }

  // Solid rects near a body, plus invisible walls at the world's left/right edges.
  solidsNear(b) {
    const out = [
      { x: -TILE, y: -TILE * 4, w: TILE, h: this.pxHeight + TILE * 8 },
      { x: this.pxWidth, y: -TILE * 4, w: TILE, h: this.pxHeight + TILE * 8 },
    ];
    const c0 = Math.max(0, this.colOf(b.x) - 1), c1 = Math.min(this.cols - 1, this.colOf(b.x + b.w) + 1);
    const r0 = Math.max(0, this.rowOf(b.y) - 1), r1 = Math.min(this.rows - 1, this.rowOf(b.y + b.h) + 1);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (isSolid(this.grid[r][c])) out.push(this.rectOf(c, r));
    return out;
  }

  allSolidRects() {
    const out = [];
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) if (isSolid(this.grid[r][c])) out.push(this.rectOf(c, r));
    return out;
  }

  // Columns that contain at least one climbable tile. Zombies path to these when their target is above.
  climbableColumns() {
    if (this._climbVersion === this.version) return this._climbCols;
    const cols = [];
    for (let c = 0; c < this.cols; c++) for (let r = 0; r < this.rows; r++) if (isClimbable(this.grid[r][c])) { cols.push(c); break; }
    this._climbCols = cols; this._climbVersion = this.version;
    return cols;
  }
}
