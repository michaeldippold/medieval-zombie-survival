// Inventory: a fixed number of slots, each null or { id, n }. One stack per item id, stacks are
// unlimited, so the slot count only bites when you carry many different things. These helpers
// are the only way to change it; `version` bumps on every change so UI can re-render lazily.
import { INVENTORY } from './config.js';
import { ITEMS, STARTER_LOADOUT, STARTER_EXTRA } from './items.js';

export function createInventory() {
  return { slots: Array(INVENTORY.SLOTS).fill(null), version: 0 };
}

// A fresh loadout: sword/bow/shovel/axe/pick fixed into the hotbar slots, arrows just after.
export function createStartInventory() {
  const inv = createInventory();
  STARTER_LOADOUT.forEach((id, i) => { inv.slots[i] = { id, n: 1 }; });
  inv.slots[STARTER_EXTRA.slot] = { id: STARTER_EXTRA.id, n: STARTER_EXTRA.n };
  return inv;
}

export const count = (inv, id) => inv.slots.reduce((s, x) => s + (x && x.id === id ? x.n : 0), 0);
// What the given hotbar slot index is holding, or null. `slot` is state.held.
export const heldId = (inv, slot) => inv.slots[slot]?.id ?? null;

// Adds n of id. Returns how many didn't fit (0 unless every slot is taken by other items).
export function give(inv, id, n = 1) {
  const stack = inv.slots.find(x => x && x.id === id);
  if (stack) { stack.n += n; inv.version++; return 0; }
  const i = inv.slots.indexOf(null);
  if (i < 0) return n;
  inv.slots[i] = { id, n }; inv.version++;
  return 0;
}

export const canAfford = (inv, cost) => Object.entries(cost).every(([id, n]) => count(inv, id) >= n);

export function take(inv, cost) {
  if (!canAfford(inv, cost)) return false;
  for (const [id, n] of Object.entries(cost)) {
    let left = n;
    for (let i = inv.slots.length - 1; i >= 0 && left > 0; i--) {
      const s = inv.slots[i];
      if (!s || s.id !== id) continue;
      const k = Math.min(s.n, left); s.n -= k; left -= k;
      if (s.n === 0) inv.slots[i] = null;
    }
  }
  inv.version++;
  return true;
}

export function swap(inv, a, b) {
  if (a === b || a < 0 || b < 0 || a >= inv.slots.length || b >= inv.slots.length) return;
  [inv.slots[a], inv.slots[b]] = [inv.slots[b], inv.slots[a]];
  inv.version++;
}

export const costLabel = cost => Object.entries(cost).map(([id, n]) => `${n} ${ITEMS[id].name.toLowerCase()}`).join(', ');
export const haveLabel = (inv, cost) => Object.entries(cost).map(([id, n]) => `${count(inv, id)}/${n} ${ITEMS[id].name.toLowerCase()}`).join(' · ');
