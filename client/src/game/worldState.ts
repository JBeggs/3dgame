import { useSyncExternalStore } from 'react';

export type GridState = { w: number; h: number; cells: Uint8Array; rooms?: any[] } | null;

type State = {
  grid: GridState;
  player: { x: number; z: number };
};

const state: State = { grid: null, player: { x: 0, z: 0 } };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function setGrid(grid: GridState) { state.grid = grid; emit(); }
export function setPlayerPos(x: number, z: number) { state.player.x = x; state.player.z = z; emit(); }
export function getState(): Readonly<State> { return state; }

export function useWorldState() {
  const subscribe = (fn: () => void) => { subs.add(fn); return () => subs.delete(fn); };
  return useSyncExternalStore(subscribe, getState, getState);
}


