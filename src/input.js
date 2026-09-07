// Keyboard + mouse → held keys, per-frame edge actions, and mouse position in screen space.
// World-space mouse coords are filled in by the game once the camera is known.
import { VIEW } from './config.js';

export function createInput(canvas) {
  const keys = new Set();
  const actions = { jump: false, jumpReleased: false, use: false, slot: null, restart: false, menuAt: null, closeMenu: false, escape: false };
  const mouse = { sx: VIEW.W / 2, sy: VIEW.H / 2, wx: 0, wy: 0 };

  const isJumpKey = code => code === 'Space';
  window.addEventListener('keydown', e => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (!keys.has(e.code)) {
      if (e.code === 'Escape') actions.escape = true;
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
    if (e.button === 0) { actions.closeMenu = true; actions.use = true; }
    if (e.button === 2) actions.menuAt = { clientX: e.clientX, clientY: e.clientY };
    e.preventDefault();
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  const held = (...codes) => codes.some(c => keys.has(c));
  const axis = () => ((held('KeyD', 'ArrowRight') ? 1 : 0) - (held('KeyA', 'ArrowLeft') ? 1 : 0));
  const endFrame = () => { for (const k of Object.keys(actions)) actions[k] = typeof actions[k] === 'boolean' ? false : null; };

  return { keys, actions, mouse, held, axis, endFrame };
}
