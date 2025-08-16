import { useEffect, useMemo } from 'react';
import { useSyncExternalStore } from 'react';

type PlayerSnapshot = { id: number; x: number; y: number; z: number };

type Store = {
  connected: boolean;
  selfId: number | null;
  players: Map<number, PlayerSnapshot>;
  messages: { from: number; text: string }[];
  subscribers: Set<() => void>;
};

const store: Store = {
  connected: false,
  selfId: null,
  players: new Map(),
  messages: [],
  subscribers: new Set(),
};

function emit() {
  store.subscribers.forEach((fn) => fn());
}

export type NetAPI = {
  sendChat: (text: string) => void;
  sendPosition: (x: number, y: number, z: number) => void;
  getState: () => Readonly<{ connected: boolean; selfId: number | null; players: Map<number, PlayerSnapshot>; messages: { from: number; text: string }[] }>;
};

let ws: WebSocket | null = null;
let lastPosSent = 0;

export function connect(): NetAPI {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return api;
  }
  const url = (import.meta.env.VITE_WS_URL as string) || `ws://${location.hostname}:8080`;
  ws = new WebSocket(url);
  ws.addEventListener('open', () => {
    store.connected = true;
    emit();
  });
  ws.addEventListener('message', (ev) => {
    try {
      const msg = JSON.parse(String(ev.data));
      switch (msg.t) {
        case 'welcome':
          store.selfId = msg.id;
          emit();
          break;
        case 'echo':
        case 'chat':
          store.messages.push({ from: msg.from ?? 0, text: String(msg.m ?? msg.text ?? '') });
          if (store.messages.length > 50) store.messages.shift();
          emit();
          break;
        case 'players': {
          // full snapshot
          const m = new Map<number, PlayerSnapshot>();
          for (const p of msg.list as PlayerSnapshot[]) m.set(p.id, p);
          store.players = m;
          emit();
          break;
        }
      }
    } catch {}
  });
  ws.addEventListener('close', () => {
    store.connected = false;
    emit();
    ws = null;
  });
  return api;
}

const api: NetAPI = {
  sendChat(text: string) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ t: 'chat', text }));
  },
  sendPosition(x: number, y: number, z: number) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const now = performance.now();
    if (now - lastPosSent < 1000 / 10) return; // 10Hz
    lastPosSent = now;
    ws.send(JSON.stringify({ t: 'pos', x, y, z }));
  },
  getState() {
    return { connected: store.connected, selfId: store.selfId, players: store.players, messages: store.messages };
  },
};

export function useNet() {
  useEffect(() => {
    connect();
  }, []);
  const subscribe = (fn: () => void) => {
    store.subscribers.add(fn);
    return () => store.subscribers.delete(fn);
  };
  return useSyncExternalStore(subscribe, api.getState, api.getState);
}


