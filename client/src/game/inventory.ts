import { useSyncExternalStore } from 'react';

type Item = 'key' | 'coin';
type InvState = { items: Record<Item, number> };

const state: InvState = { items: { key: 0, coin: 0 } };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export const inventory = {
  add(item: Item, n = 1) {
    state.items[item] = (state.items[item] || 0) + n;
    emit();
  },
  has(item: Item, n = 1) { return (state.items[item] || 0) >= n; },
  consume(item: Item, n = 1) {
    if (this.has(item, n)) { state.items[item] -= n; emit(); return true; }
    return false;
  },
  get() { return state; }
};

export function useInventory() {
  const subscribe = (fn: () => void) => { subs.add(fn); return () => subs.delete(fn); };
  return useSyncExternalStore(subscribe, inventory.get, inventory.get);
}


