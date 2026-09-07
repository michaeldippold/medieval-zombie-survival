// A palette of choices with thumbnails and have/need counts. Serves Build and Craft; knows nothing
// about the game. entries: [{ id, label, have, enabled, paint(ctx) }]. onPick(id) on an enabled entry.
import { TILE } from '../config.js';

export class Palette {
  constructor(el, canvas) {
    this.el = el; this.canvas = canvas; this.justClosed = false;
    el.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('mousedown', e => { if (!el.hidden && !el.contains(e.target)) { this.close(); this.justClosed = true; } });
  }
  get isOpen() { return !this.el.hidden; }
  consumeJustClosed() { const j = this.justClosed; this.justClosed = false; return j; }

  open({ title, entries, clientX, clientY, onPick }) {
    this.el.innerHTML = '';
    const head = document.createElement('div'); head.className = 'pal-title'; head.textContent = title; this.el.appendChild(head);
    const grid = document.createElement('div'); grid.className = 'pal-grid'; this.el.appendChild(grid);
    for (const en of entries) {
      const cell = document.createElement('button');
      cell.className = 'pal-cell'; cell.disabled = !en.enabled; cell.title = en.enabled ? en.label : 'not enough materials';
      const thumb = document.createElement('canvas'); thumb.width = TILE; thumb.height = TILE; thumb.className = 'pal-thumb';
      en.paint(thumb.getContext('2d'));
      const name = document.createElement('div'); name.className = 'pal-name'; name.textContent = en.label;
      const have = document.createElement('div'); have.className = 'pal-have'; have.textContent = en.have;
      cell.append(thumb, name, have);
      if (en.enabled) cell.addEventListener('click', () => onPick(en.id));
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
