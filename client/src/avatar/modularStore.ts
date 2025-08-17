import { useSyncExternalStore } from 'react';
import { ModularAvatarConfig, EquippedClothing } from '../types/clothing';

// New modular avatar configuration
const DEFAULT_CONFIG: ModularAvatarConfig = {
  baseModel: 'base_mesh',
  equipped: {
    shirt: 'basic_shirt',
    // pants: 'basic_pants',  // Start with just shirt
    // shoes: 'basic_shoes',
    // hat: 'basic_hat',
  },
  colors: {
    skin: '#fdbcb4',
    hair: '#8b4513',
    primary: '#a0c8ff',
    secondary: '#4a3070',
  },
};

const KEY = 'modularAvatarConfigV1';
const subs = new Set<() => void>();

const state: { config: ModularAvatarConfig } = { config: loadConfig() };

function loadConfig(): ModularAvatarConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return { 
      ...DEFAULT_CONFIG, 
      ...parsed,
      equipped: { ...DEFAULT_CONFIG.equipped, ...(parsed.equipped || {}) },
      colors: { ...DEFAULT_CONFIG.colors, ...(parsed.colors || {}) }
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(config: ModularAvatarConfig) {
  try { 
    localStorage.setItem(KEY, JSON.stringify(config)); 
  } catch {}
}

function emit() {
  subs.forEach((callback) => callback());
}

export const modularAvatarStore = {
  get(): ModularAvatarConfig { 
    return state.config; 
  },
  
  set(partial: Partial<ModularAvatarConfig>) {
    state.config = { 
      ...state.config, 
      ...partial,
      equipped: { ...state.config.equipped, ...(partial.equipped || {}) },
      colors: { ...state.config.colors, ...(partial.colors || {}) }
    };
    saveConfig(state.config);
    emit();
  },
  
  equipItem(slot: keyof EquippedClothing, itemId: string | undefined) {
    const equipped = { ...state.config.equipped };
    if (itemId) {
      equipped[slot] = itemId;
    } else {
      delete equipped[slot];
    }
    this.set({ equipped });
  },
  
  setColor(colorKey: keyof ModularAvatarConfig['colors'], color: string) {
    const colors = { ...state.config.colors };
    colors[colorKey] = color;
    this.set({ colors });
  },
};

export function useModularAvatar() {
  const subscribe = (callback: () => void) => {
    subs.add(callback);
    return () => subs.delete(callback);
  };
  return useSyncExternalStore(subscribe, modularAvatarStore.get, modularAvatarStore.get);
}
