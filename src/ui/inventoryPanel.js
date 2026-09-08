// The inventory window: a grid of slots. Click-and-hold a stack to drag it; release on another slot to swap.
import { TILE, INVENTORY } from '../config.js';
import { ITEMS } from '../items.js';
import { paintItemIcon } from '../render/icons.js';

export class InventoryPanel {
  constructor(el, canvas, onSwap) {
    this.el = el; this.canvas = canvas; this.onSwap = onSwap;
    this.renderedVersion = -1; this.drag = null;
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.style.setProperty('--inv-cols', INVENTORY.COLS);
    document.addEventListener('mousemove', e => this.moveDrag(e));
    document.addEventListener('mouseup', e => this.endDrag(e));
  }
  get isOpen() { return !this.el.hidden; }

  open(inv) { this.el.hidden = false; this.renderedVersion = -1; this.refresh(inv); }
  close() { if (!this.el.hidden) { this.el.hidden = true; this.cancelDrag(); this.canvas.focus(); } }

  // Cheap to call every frame: only re-renders when the inventory changed.
  refresh(inv) {
    if (this.el.hidden || inv.version === this.renderedVersion) return;
    this.renderedVersion = inv.version;
    this.el.innerHTML = '';
    const head = document.createElement('div'); head.className = 'pal-title'; head.textContent = 'Inventory'; this.el.appendChild(head);
    const grid = document.createElement('div'); grid.className = 'inv-grid'; this.el.appendChild(grid);
    inv.slots.forEach((s, i) => {
      const slot = document.createElement('div'); slot.className = 'inv-slot'; slot.dataset.i = i;
      if (i < INVENTORY.HOTBAR_SIZE) slot.classList.add('inv-slot--hotbar');
      if (s) {
        const c = document.createElement('canvas'); c.width = TILE; c.height = TILE; c.className = 'inv-icon';
        paintItemIcon(c.getContext('2d'), s.id);
        const n = document.createElement('div'); n.className = 'inv-count'; n.textContent = s.n;
        slot.title = ITEMS[s.id]?.name ?? s.id;
        slot.append(c, n);
        slot.addEventListener('mousedown', e => { if (e.button === 0) { e.preventDefault(); this.startDrag(i, s.id, e); } });
      }
      grid.appendChild(slot);
    });
    const foot = document.createElement('div'); foot.className = 'inv-foot'; foot.textContent = 'top row is your hotbar · drag to rearrange · I or Esc to close'; this.el.appendChild(foot);
  }

  startDrag(i, id, e) {
    const ghost = document.createElement('canvas'); ghost.width = TILE; ghost.height = TILE; ghost.className = 'inv-ghost';
    paintItemIcon(ghost.getContext('2d'), id);
    document.body.appendChild(ghost);
    this.drag = { from: i, ghost };
    this.moveDrag(e);
  }
  moveDrag(e) { if (this.drag) { this.drag.ghost.style.left = e.clientX - TILE / 2 + 'px'; this.drag.ghost.style.top = e.clientY - TILE / 2 + 'px'; } }
  endDrag(e) {
    if (!this.drag) return;
    const slot = document.elementFromPoint(e.clientX, e.clientY)?.closest('.inv-slot');
    if (slot) this.onSwap(this.drag.from, Number(slot.dataset.i));
    this.cancelDrag();
  }
  cancelDrag() { if (this.drag) { this.drag.ghost.remove(); this.drag = null; } }
}
