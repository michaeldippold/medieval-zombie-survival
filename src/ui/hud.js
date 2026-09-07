// Screen-space HUD: health, enclosure label, hotbar, death screen.
import { VIEW, COLORS, UI, SWORD, BOW, PLAYER } from '../config.js';
import { drawWeapon } from '../render/sprites.js';
import { SLOTS } from '../combat.js';
import { isFeverish } from '../entities/player.js';

export function drawHud(ctx, state) {
  const { player: p, zombies, vision, attention } = state;
  const W = VIEW.W, H = VIEW.H;
  const feverish = isFeverish(p);

  ctx.fillStyle = COLORS.hud; ctx.fillRect(12, 12, 160, 14);
  ctx.fillStyle = feverish ? '#9aa83a' : p.hp > 30 ? COLORS.alert : COLORS.playerHurt;
  ctx.fillRect(14, 14, 156 * Math.max(0, p.hp / PLAYER.HP), 10);
  ctx.fillStyle = COLORS.hudText; ctx.font = '12px "IBM Plex Mono", monospace';
  ctx.fillText(`hp ${Math.ceil(p.hp)}${feverish ? '  · you feel feverish' : ''}`, 180, 23);

  const seen = zombies.filter(e => e.sees).length;
  const label = vision.exposed
    ? (seen ? `EXPOSED · ${seen} see you` : attention ? 'EXPOSED · they know where you are' : 'EXPOSED')
    : (attention ? 'SEALED · they remember' : 'SEALED · nothing can see you');
  ctx.font = 'bold 13px "IBM Plex Mono", monospace';
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = vision.exposed ? 'rgba(230,57,70,0.85)' : 'rgba(30,110,60,0.85)'; ctx.fillRect(W / 2 - tw / 2 - 10, 10, tw + 20, 22);
  ctx.fillStyle = '#fff'; ctx.fillText(label, W / 2 - tw / 2, 26);

  drawHotbar(ctx, state);

  if (p.dead) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 28px "Chakra Petch", sans-serif';
    ctx.fillText(p.cause, W / 2 - ctx.measureText(p.cause).width / 2, H / 2 - 10);
    ctx.font = '13px "IBM Plex Mono", monospace';
    const s = 'press R to restart'; ctx.fillText(s, W / 2 - ctx.measureText(s).width / 2, H / 2 + 18);
  }
}

function drawHotbar(ctx, state) {
  const size = UI.HOTBAR_SLOT, gap = UI.HOTBAR_GAP;
  const x0 = (VIEW.W - (SLOTS.length * size + (SLOTS.length - 1) * gap)) / 2, y0 = VIEW.H - size - 12;
  SLOTS.forEach((kind, i) => {
    const x = x0 + i * (size + gap), selected = kind === state.held;
    const s = 1 + 0.18 * Math.sin((selected ? state.hotbarAnim / UI.HOTBAR_POP : 0) * Math.PI);
    ctx.save(); ctx.translate(x + size / 2, y0 + size / 2); ctx.scale(s, s);
    ctx.fillStyle = COLORS.hud; ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.lineWidth = selected ? 3 : 1.5; ctx.strokeStyle = selected ? COLORS.accent : 'rgba(255,255,255,0.35)';
    ctx.strokeRect(-size / 2 + 1, -size / 2 + 1, size - 2, size - 2);
    ctx.save(); ctx.translate(-14, 10); ctx.rotate(-Math.PI / 4); drawWeapon(ctx, kind); ctx.restore();
    ctx.fillStyle = selected ? COLORS.accent : 'rgba(255,255,255,0.7)'; ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillText(String(i + 1), -size / 2 + 5, -size / 2 + 13);
    const cool = kind === 'sword' && state.swing ? 1 - state.swing.t / SWORD.TOTAL : kind === 'bow' ? state.bowCool / BOW.COOLDOWN : 0;
    if (cool > 0) { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(-size / 2, -size / 2, size * cool, size); }
    ctx.restore();
  });
}
