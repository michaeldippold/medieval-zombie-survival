// Inventory is a flat { itemId: count } object. These helpers are the only way to change it.
import { ITEMS } from './items.js';

export const count = (inv, id) => inv[id] || 0;
export const give = (inv, id, n = 1) => { inv[id] = count(inv, id) + n; };
export const canAfford = (inv, cost) => Object.entries(cost).every(([id, n]) => count(inv, id) >= n);
export function take(inv, cost) {
  if (!canAfford(inv, cost)) return false;
  for (const [id, n] of Object.entries(cost)) inv[id] -= n;
  return true;
}
export const costLabel = cost => Object.entries(cost).map(([id, n]) => `${n} ${ITEMS[id].name.toLowerCase()}`).join(', ');
