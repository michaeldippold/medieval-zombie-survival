// Keyboard + mouse → held keys, per-frame edge actions, and mouse position in screen space.
// World-space mouse coords are filled in by the game once the camera is known.
import { VIEW } from './config.js';

export function createInput(canvas) {
  const keys = new Set();
  const actions = { jump: false, jumpReleased: false, use: false, slot: null, restart: false, menuAt: null, closeMenu: false, escape: false, inventory: false };
  // `down`: left button currently held (DESIGN §7.1 hold-to-use). Tools and placement repeat
  // while it's true, on their own cooldowns; weapons only ever read the per-click `use` edge.
  const mouse = { sx: VIEW.W / 2, sy: VIEW.H / 2, wx: 0, wy: 0, down: false };

  const isJumpKey = code => code === 'Space';
  window.addEventListener('keydown', e => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    if (!keys.has(e.code)) {
      if (e.code === 'Escape') actions.escape = true;
      if (e.code === 'KeyI' || e.code === 'Tab') actions.inventory = true;
      if (isJumpKey(e.code)) actions.jump = true;
      if (/^(Digit|Numpad)[1-9]$/.test(e.code)) actions.slot = Number(e.code.slice(-1));
      if (e.code === 'KeyJ') actions.use = true;
      if (e.code === 'KeyR') actions.restart = true;
    }
    keys.add(e.code);
  });
  window.addEventListener('keyup', e => {
    keys.delete(e.code);
    if (isJumpKey(e.code)) actions.jumpReleased = true;
  });
  window.addEventListener('blur', () => keys.clear());

  function updateMouse(e) {
    const r = canvas.getBoundingClientRect();
    mouse.sx = (e.clientX - r.left) * (VIEW.W / r.width);
    mouse.sy = (e.clientY - r.top) * (VIEW.H / r.height);
  }
  canvas.addEventListener('mousemove', updateMouse);
  canvas.addEventListener('mousedown', e => {
    updateMouse(e); canvas.focus();
    if (e.button === 0) { actions.closeMenu = true; actions.use = true; mouse.down = true; }
    if (e.button === 2) actions.menuAt = { clientX: e.clientX, clientY: e.clientY };
    e.preventDefault();
  });
  // Release is tracked on the window, not the canvas, so dragging off the edge still lets go.
  window.addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });
  window.addEventListener('blur', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  const held = (...codes) => codes.some(c => keys.has(c));
  const axis = () => ((held('KeyD', 'ArrowRight') ? 1 : 0) - (held('KeyA', 'ArrowLeft') ? 1 : 0));
  const endFrame = () => { for (const k of Object.keys(actions)) actions[k] = typeof actions[k] === 'boolean' ? false : null; };

  return { keys, actions, mouse, held, axis, endFrame };
}
