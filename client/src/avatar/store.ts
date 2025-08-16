import { useSyncExternalStore } from 'react';

export type AvatarConfig = {
  bodyId: string;
  headId: string;
  outfitId: string;
  colors: { primary: string; secondary: string };
};

const DEFAULT: AvatarConfig = {
  bodyId: 'bodyA',
  headId: 'headA',
  outfitId: 'robeA',
  colors: { primary: '#a0c8ff', secondary: '#4a3070' },
};

const KEY = 'avatarConfigV1';
const subs = new Set<() => void>();

const state: { cfg: AvatarConfig } = { cfg: load() };

function load(): AvatarConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT, ...parsed, colors: { ...DEFAULT.colors, ...(parsed.colors || {}) } };
  } catch {
    return DEFAULT;
  }
}
function save(cfg: AvatarConfig) {
  try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch {}
}

export const avatarStore = {
  get() { return state.cfg; },
  set(partial: Partial<AvatarConfig>) {
    state.cfg = { ...state.cfg, ...partial, colors: { ...state.cfg.colors, ...(partial.colors || {}) } };
    save(state.cfg);
    subs.forEach((f) => f());
  },
};

export function useAvatar() {
  const subscribe = (fn: () => void) => { subs.add(fn); return () => subs.delete(fn); };
  return useSyncExternalStore(subscribe, avatarStore.get, avatarStore.get);
}


