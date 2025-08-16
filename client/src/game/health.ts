import { useSyncExternalStore } from 'react';

type HealthState = { hp: number; max: number };
const player: HealthState = { hp: 100, max: 100 };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export const playerHealth = {
  damage(n: number) { player.hp = Math.max(0, player.hp - n); emit(); },
  heal(n: number) { player.hp = Math.min(player.max, player.hp + n); emit(); },
  get() { return player; },
};

export function usePlayerHealth() {
  const subscribe = (fn: () => void) => { subs.add(fn); return () => subs.delete(fn); };
  return useSyncExternalStore(subscribe, playerHealth.get, playerHealth.get);
}


