// A DOM context menu positioned over the canvas. Knows nothing about the game.
export class ContextMenu {
  constructor(el, canvas) {
    this.el = el; this.canvas = canvas;
    el.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('mousedown', e => { if (!el.hidden && !el.contains(e.target) && e.target !== canvas) this.close(); });
  }
  get isOpen() { return !this.el.hidden; }

  // items: [{ label, primary?, disabled?, run? }]; clientX/Y from the triggering mouse event
  open(items, clientX, clientY) {
    this.el.innerHTML = '';
    for (const it of items) {
      const b = document.createElement('button');
      b.textContent = it.label;
      if (it.primary) b.classList.add('primary');
      if (it.disabled) b.disabled = true;
      b.addEventListener('click', () => { this.close(); it.run?.(); });
      this.el.appendChild(b);
    }
    const r = this.canvas.getBoundingClientRect();
    const px = clientX - r.left, py = clientY - r.top;
    this.el.hidden = false;
    this.el.style.left = Math.min(px, r.width - this.el.offsetWidth - 4) + 'px';
    this.el.style.top = Math.min(py, r.height - this.el.offsetHeight - 4) + 'px';
    this.el.querySelector('button:not([disabled])')?.focus();
  }
  close() { if (!this.el.hidden) { this.el.hidden = true; this.canvas.focus(); } }
}
