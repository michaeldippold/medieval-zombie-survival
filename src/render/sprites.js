// Entity and item painters. Flat colours now; sprites later swap these functions only.
import { COLORS, ZOMBIE, SWORD, BOW, DROPS } from '../config.js';

// Draws a held item at the origin pointing +x.
export function drawWeapon(ctx, kind) {
  ctx.lineCap = 'round';
  switch (kind) {
    case 'sword':
      ctx.strokeStyle = COLORS.frame; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(10, 0); ctx.stroke();
      ctx.strokeStyle = '#d8b04a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(10, -6); ctx.lineTo(10, 6); ctx.stroke();
      ctx.strokeStyle = '#e6eaee'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(36, 0); ctx.stroke();
      break;
    case 'bow':
      ctx.strokeStyle = COLORS.frame; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(14, 0, 15, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      ctx.strokeStyle = COLORS.arrowFletch; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(14, -15); ctx.lineTo(14, 15); ctx.stroke();
      break;
    case 'shovel':
      ctx.strokeStyle = COLORS.frame; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(26, 0); ctx.stroke();
      ctx.fillStyle = COLORS.metal; ctx.beginPath(); ctx.moveTo(24, -6); ctx.lineTo(36, -4); ctx.lineTo(36, 4); ctx.lineTo(24, 6); ctx.closePath(); ctx.fill();
      break;
    case 'axe':
      ctx.strokeStyle = COLORS.frame; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(30, 0); ctx.stroke();
      ctx.fillStyle = COLORS.metal; ctx.beginPath(); ctx.moveTo(22, -2); ctx.lineTo(30, -10); ctx.lineTo(34, -8); ctx.lineTo(34, 2); ctx.lineTo(22, 3); ctx.closePath(); ctx.fill();
      break;
    case 'pick':
      ctx.strokeStyle = COLORS.frame; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(28, 0); ctx.stroke();
      ctx.strokeStyle = COLORS.metal; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(26, -10); ctx.quadraticCurveTo(34, 0, 26, 10); ctx.stroke();
      break;
  }
}

// Helmet band and visor as fractions of the body box rather than fixed pixels, so the flat-
// colour placeholder (DESIGN §16 — real art replaces this a tile at a time) still reads as a
// head near the top of a two-tall body instead of a thin stripe lost above a tall slab.
export function drawPlayer(ctx, p, aim, held) {
  ctx.fillStyle = p.hurt > 0 ? COLORS.playerHurt : p.dead ? COLORS.playerDead : COLORS.player;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  const helm = p.h * 0.16, visorW = p.w * 0.32, visorH = p.h * 0.05, visorY = p.h * 0.25, inset = p.w * 0.15;
  ctx.fillStyle = COLORS.playerHelm; ctx.fillRect(p.x, p.y, p.w, helm);
  ctx.fillStyle = COLORS.playerVisor; ctx.fillRect(p.facing > 0 ? p.x + p.w - inset - visorW : p.x + inset, p.y + visorY, visorW, visorH);
  if (!p.dead) { ctx.save(); ctx.translate(p.x + p.w / 2, p.y + p.h / 2); ctx.rotate(aim); drawWeapon(ctx, held); ctx.restore(); }
}

export function drawZombie(ctx, e) {
  const lx = e.scramble ? Math.sin(e.scramble.t * 22) * 2                            // clinging to the wall, scrabbling
    : e.lunge > 0 ? e.dir * 6 * Math.sin((e.lunge / ZOMBIE.LUNGE) * Math.PI) : 0;
  if (e.death > 0) {                                   // death pop: squash and drain to grey
    const k = e.death / ZOMBIE.DEATH_DUR, bump = Math.sin(k * Math.PI);
    ctx.save(); ctx.translate(e.x + e.w / 2, e.y + e.h); ctx.scale(1 + 0.45 * bump, 1 - 0.35 * bump);
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.color; ctx.fillRect(-e.w / 2, -e.h, e.w, e.h);
    ctx.globalAlpha = 1 - k; ctx.fillStyle = COLORS.corpse; ctx.fillRect(-e.w / 2, -e.h, e.w, e.h);
    ctx.restore(); return;
  }
  if (e.stunned) {
    const over = Math.max(0, e.dead - ZOMBIE.CORPSE_LINGER);
    ctx.globalAlpha = 0.6 * (1 - Math.min(1, over / ZOMBIE.CORPSE_FADE));
    ctx.fillStyle = COLORS.corpse; ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.strokeStyle = '#3a3f41'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(e.x + 8, e.y + 8); ctx.lineTo(e.x + e.w - 8, e.y + e.h - 8); ctx.moveTo(e.x + e.w - 8, e.y + 8); ctx.lineTo(e.x + 8, e.y + e.h - 8); ctx.stroke();
    ctx.globalAlpha = 1; return;
  }
  ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.color; ctx.fillRect(e.x + lx, e.y, e.w, e.h);
  if (e.flash > 0) return;
  // Brow/eyes near the top of the box, wounds near the bottom — as fractions of e.h so the
  // face doesn't end up stranded near the top of a much taller two-tall body (DESIGN §6.1).
  const browH = e.h * 0.08, eyeY = e.y + e.h * 0.15;
  ctx.fillStyle = COLORS.zombieBrow; ctx.fillRect(e.x + lx, e.y, e.w, browH);
  ctx.fillStyle = COLORS.zombieEye;
  const eyeX = e.x + lx + (e.dir < 0 ? 5 : e.dir > 0 ? e.w - 14 : 10);
  ctx.fillRect(eyeX, eyeY, 4, 4); ctx.fillRect(eyeX + 6, eyeY, 4, 4);
  ctx.fillStyle = COLORS.wound;
  for (let i = 0; i < ZOMBIE.HP - e.hp; i++) ctx.fillRect(e.x + lx + 4 + i * 8, e.y + e.h - 8, 5, 4);
  if (e.scramble) {                                     // claw marks toward the ledge it's fighting for
    ctx.strokeStyle = 'rgba(20,20,20,0.6)'; ctx.lineWidth = 1.5;
    const cx = e.x + lx + (e.dir >= 0 ? e.w - 4 : 4), sway = Math.sin(e.scramble.t * 22) * 3;
    ctx.beginPath();
    for (const dy of [-4, 2]) { ctx.moveTo(cx - 5 + sway, e.y + dy); ctx.lineTo(cx + 5 + sway, e.y + dy - 3); }
    ctx.stroke();
  }
  if (e.sees) { ctx.fillStyle = COLORS.alert; ctx.font = 'bold 14px "IBM Plex Mono", monospace'; ctx.fillText('!', e.x + e.w / 2 - 3, e.y - 6); }
}

export function drawSwing(ctx, pcx, pcy, s) {
  let alpha, fill;
  if (s.t < SWORD.WINDUP) { alpha = 0.6 * (s.t / SWORD.WINDUP); fill = false; }
  else { alpha = 0.9 * (1 - (s.t - SWORD.WINDUP) / (SWORD.ACTIVE + SWORD.RECOVER)); fill = true; }
  ctx.fillStyle = `rgba(242,177,52,${0.4 * alpha})`; ctx.strokeStyle = `rgba(242,177,52,${alpha})`; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(pcx, pcy); ctx.arc(pcx, pcy, SWORD.REACH, s.angle - SWORD.HALF_ARC, s.angle + SWORD.HALF_ARC); ctx.closePath();
  if (fill) ctx.fill(); ctx.stroke();
}

export function drawArrow(ctx, a) {
  ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.angle); ctx.globalAlpha = a.arrived ? 1 - a.stick / BOW.ARROW_STICK : 1;
  ctx.strokeStyle = COLORS.arrowShaft; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(0, 0); ctx.stroke();
  ctx.fillStyle = COLORS.arrowHead; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(-6, -3.5); ctx.lineTo(-6, 3.5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = COLORS.arrowFletch; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-26, -3); ctx.moveTo(-22, 0); ctx.lineTo(-26, 3); ctx.stroke();
  ctx.restore();
}

export function drawDrop(ctx, d) {
  const bob = Math.sin(d.age * 4) * 1.5;
  ctx.fillStyle = COLORS.items[d.id] || '#fff';
  ctx.fillRect(d.x, d.y + bob, d.w, d.h);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(d.x + 0.5, d.y + bob + 0.5, d.w - 1, d.h - 1);
  if (d.id === 'arrow') { ctx.strokeStyle = COLORS.arrowShaft; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(d.x + 2, d.y + bob + DROPS.SIZE - 2); ctx.lineTo(d.x + DROPS.SIZE - 2, d.y + bob + 2); ctx.stroke(); }
}
