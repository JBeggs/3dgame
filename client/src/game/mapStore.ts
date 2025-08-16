// Map generation state management for hot-reload
import { useSyncExternalStore } from 'react';

type MapState = {
  seed: number;
  rooms: number;
  generation: number; // Increment this to force regeneration
};

const state: MapState = {
  seed: Number(localStorage.getItem('genSeed') || 1),
  rooms: Number(localStorage.getItem('genRooms') || 10),
  generation: 0
};

const subscribers = new Set<() => void>();

function emit() {
  subscribers.forEach(fn => fn());
}

export const mapStore = {
  get() {
    return state;
  },
  
  updateSettings(newSeed: number, newRooms: number) {
    state.seed = Math.max(1, Math.floor(newSeed));
    state.rooms = Math.max(3, Math.floor(newRooms));
    state.generation += 1;
    
    // Persist to localStorage
    localStorage.setItem('genSeed', String(state.seed));
    localStorage.setItem('genRooms', String(state.rooms));
    
    emit();
  },
  
  regenerate() {
    state.generation += 1;
    emit();
  }
};

export function useMapState() {
  const subscribe = (fn: () => void) => {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  };
  
  return useSyncExternalStore(subscribe, mapStore.get);
}
