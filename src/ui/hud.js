// Screen-space HUD: health, enclosure label, inventory readout, hotbar, hints, death screen.
import { VIEW, TILE, COLORS, UI, SWORD, BOW, TOOLS, PLAYER, INVENTORY } from '../config.js';
import { paintItemIcon } from '../render/icons.js';
import { ITEMS } from '../items.js';
import { count } from '../inventory.js';
import { isFeverish } from '../entities/player.js';

const MONO = '"IBM Plex Mono", monospace';

export function drawHud(ctx, state) {
  const { player: p, zombies, vision, attention, inventory } = state;
  const W = VIEW.W, H = VIEW.H;
  const feverish = isFeverish(p);

  ctx.fillStyle = COLORS.hud; ctx.fillRect(12, 12, 160, 14);
  ctx.fillStyle = feverish ? '#9aa83a' : p.hp > 30 ? COLORS.alert : COLORS.playerHurt;
  ctx.fillRect(14, 14, 156 * Math.max(0, p.hp / PLAYER.HP), 10);
  ctx.fillStyle = COLORS.hudText; ctx.font = `12px ${MONO}`;
  ctx.fillText(`hp ${Math.ceil(p.hp)}${feverish ? '  · you feel feverish' : ''}`, 180, 23);

  const seen = zombies.filter(e => e.sees).length;
  const label = vision.exposed
    ? (seen ? `EXPOSED · ${seen} see you` : attention ? 'EXPOSED · they know where you are' : 'EXPOSED')
    : (attention ? 'SEALED · they remember' : 'SEALED · nothing can see you');
  ctx.font = `bold 13px ${MONO}`;
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = vision.exposed ? 'rgba(230,57,70,0.85)' : 'rgba(30,110,60,0.85)'; ctx.fillRect(W / 2 - tw / 2 - 10, 10, tw + 20, 22);
  ctx.fillStyle = '#fff'; ctx.fillText(label, W / 2 - tw / 2, 26);

  // inventory readout, top right — just the raw materials, since tools/weapons/placeables live on the bar
  ctx.font = `12px ${MONO}`; ctx.textAlign = 'right';
  const inv = ['log', 'plank', 'stone'].filter(id => count(inventory, id) > 0).map(id => `${ITEMS[id].name.toLowerCase()} ${count(inventory, id)}`).join('  ·  ') || 'I · inventory';
  ctx.fillStyle = COLORS.hud; ctx.fillRect(W - 12 - ctx.measureText(inv).width - 16, 12, ctx.measureText(inv).width + 16, 18);
  ctx.fillStyle = '#fff'; ctx.fillText(inv, W - 20, 25);
  ctx.textAlign = 'left';

  drawHotbar(ctx, state);

  if (state.ghost) {
    const label = `${ITEMS[state.ghost.itemId].name} selected · click to place`;
    ctx.font = `bold 12px ${MONO}`; ctx.textAlign = 'center';
    const bw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(30,110,60,0.85)'; ctx.fillRect(W / 2 - bw / 2 - 10, H - UI.HOTBAR_SLOT - 40, bw + 20, 20);
    ctx.fillStyle = '#fff'; ctx.fillText(label, W / 2, H - UI.HOTBAR_SLOT - 26);
    ctx.textAlign = 'left';
  }
  if (state.hint) {
    ctx.font = `12px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, state.hint.t / 0.4)})`;
    ctx.fillText(state.hint.text, W / 2, H - UI.HOTBAR_SLOT - (state.ghost ? 48 : 22));
    ctx.textAlign = 'left';
  }

  if (p.dead) overlay(ctx, p.cause, 'press R to restart');
  else if (state.paused) overlay(ctx, 'Paused', 'Esc to resume · R to restart');
}

function overlay(ctx, title, sub) {
  const W = VIEW.W, H = VIEW.H;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 28px "Chakra Petch", sans-serif';
  ctx.fillText(title, W / 2 - ctx.measureText(title).width / 2, H / 2 - 10);
  ctx.font = `13px ${MONO}`;
  ctx.fillText(sub, W / 2 - ctx.measureText(sub).width / 2, H / 2 + 18);
}

function drawHotbar(ctx, state) {
  const size = UI.HOTBAR_SLOT, gap = UI.HOTBAR_GAP, n = INVENTORY.HOTBAR_SIZE;
  const x0 = (VIEW.W - (n * size + (n - 1) * gap)) / 2, y0 = VIEW.H - size - 12;
  for (let i = 0; i < n; i++) {
    const stack = state.inventory.slots[i];
    const item = stack && ITEMS[stack.id];
    const x = x0 + i * (size + gap), selected = i === state.held;
    const s = 1 + 0.18 * Math.sin((selected ? state.hotbarAnim / UI.HOTBAR_POP : 0) * Math.PI);
    ctx.save(); ctx.translate(x + size / 2, y0 + size / 2); ctx.scale(s, s);
    ctx.fillStyle = COLORS.hud; ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.lineWidth = selected ? 3 : 1.5; ctx.strokeStyle = selected ? COLORS.accent : 'rgba(255,255,255,0.35)';
    ctx.strokeRect(-size / 2 + 1, -size / 2 + 1, size - 2, size - 2);

    if (stack) {
      ctx.save(); ctx.translate(-TILE / 2, -TILE / 2); paintItemIcon(ctx, stack.id); ctx.restore();
      ctx.textAlign = 'right';
      if (item.kind !== 'weapon' && item.kind !== 'tool') { ctx.fillStyle = '#fff'; ctx.font = `11px ${MONO}`; ctx.fillText(String(stack.n), size / 2 - 4, size / 2 - 5); }
      if (item.ammo) { ctx.fillStyle = count(state.inventory, item.ammo) > 0 ? '#fff' : COLORS.alert; ctx.font = `11px ${MONO}`; ctx.fillText(String(count(state.inventory, item.ammo)), size / 2 - 4, size / 2 - 5); }
      ctx.textAlign = 'left';
    }

    ctx.fillStyle = selected ? COLORS.accent : 'rgba(255,255,255,0.7)'; ctx.font = `11px ${MONO}`;
    ctx.fillText(String(i + 1), -size / 2 + 5, -size / 2 + 13);

    const cool = !stack ? 0
      : stack.id === 'sword' && state.swing ? 1 - state.swing.t / SWORD.TOTAL
      : stack.id === 'bow' ? state.bowCool / BOW.COOLDOWN
      : item.kind === 'tool' ? state.toolCool / TOOLS.COOLDOWN : 0;
    if (cool > 0) { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(-size / 2, -size / 2, size * cool, size); }
    ctx.restore();
  }
}
