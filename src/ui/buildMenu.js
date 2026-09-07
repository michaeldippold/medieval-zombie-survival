// The build palette: every placeable as a tile thumbnail with have/need counts. Lit if affordable.
// Clicking an affordable one hands its id to onPick. Knows nothing about the game beyond that.
import { TILE } from '../config.js';
import { paintTile } from '../render/tiles.js';
import { ITEMS } from '../items.js';
import { canAfford, count } from '../inventory.js';

export class BuildMenu {
  constructor(el, canvas) {
    this.el = el; this.canvas = canvas; this.justClosed = false;
    el.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('mousedown', e => { if (!el.hidden && !el.contains(e.target)) { this.close(); this.justClosed = true; } });
  }
  get isOpen() { return !this.el.hidden; }
  consumeJustClosed() { const j = this.justClosed; this.justClosed = false; return j; }

  open(builds, inventory, clientX, clientY, onPick) {
    this.el.innerHTML = '';
    const title = document.createElement('div'); title.className = 'build-title'; title.textContent = 'Build'; this.el.appendChild(title);
    const grid = document.createElement('div'); grid.className = 'build-grid'; this.el.appendChild(grid);
    for (const b of builds) {
      const afford = canAfford(inventory, b.cost);
      const cell = document.createElement('button');
      cell.className = 'build-cell'; cell.disabled = !afford; cell.title = afford ? `Build ${b.label.toLowerCase()}` : 'not enough materials';
      const thumb = document.createElement('canvas'); thumb.width = TILE; thumb.height = TILE; thumb.className = 'build-thumb';
      paintTile(thumb.getContext('2d'), 0, 0, b.make(1));
      const name = document.createElement('div'); name.className = 'build-name'; name.textContent = b.label;
      const have = document.createElement('div'); have.className = 'build-have';
      have.textContent = Object.entries(b.cost).map(([id, n]) => `${count(inventory, id)}/${n} ${ITEMS[id].name.toLowerCase()}`).join(' · ');
      cell.append(thumb, name, have);
      if (afford) cell.addEventListener('click', () => { this.close(); onPick(b.id); });
      grid.appendChild(cell);
    }
    const r = this.canvas.getBoundingClientRect();
    this.el.hidden = false;
    this.el.style.left = Math.max(4, Math.min(clientX - r.left, r.width - this.el.offsetWidth - 4)) + 'px';
    this.el.style.top = Math.max(4, Math.min(clientY - r.top, r.height - this.el.offsetHeight - 4)) + 'px';
    this.el.querySelector('button:not([disabled])')?.focus();
  }
  close() { if (!this.el.hidden) { this.el.hidden = true; this.canvas.focus(); } }
}
