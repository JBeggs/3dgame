import { useEffect, useMemo } from 'react';
import { useSyncExternalStore } from 'react';

type PlayerSnapshot = { id: number; x: number; y: number; z: number; rotation?: number; name?: string };

type Room = {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  created: number;
  createdBy: string;
};

type Store = {
  connected: boolean;
  selfId: number | null;
  currentRoom: string;
  players: Map<number, PlayerSnapshot>;
  playersPrev: Map<number, PlayerSnapshot>;
  tPrev: number;
  tCurr: number;
  selfPos: { x: number; y: number; z: number } | null;
  messages: { from: number; text: string }[];
  rooms: Room[];
  presenceMessages: { type: 'joined' | 'left' | 'renamed'; playerId: number; playerName: string; timestamp: number }[];
  subscribers: Set<() => void>;
};

const store: Store = {
  connected: false,
  selfId: null,
  currentRoom: 'lobby',
  players: new Map(),
  playersPrev: new Map(),
  tPrev: 0,
  tCurr: 0,
  selfPos: null,
  messages: [],
  rooms: [],
  presenceMessages: [],
  subscribers: new Set(),
};

function emit() {
  store.subscribers.forEach((fn) => fn());
}

export type NetAPI = {
  sendChat: (text: string) => void;
  sendPosition: (x: number, y: number, z: number, rotation?: number) => void;
  joinRoom: (room: string) => void;
  setPlayerName: (name: string) => void;
  getRooms: () => void;
  createRoom: (name: string) => void;
  getState: () => Readonly<Store>;
};

let ws: WebSocket | null = null;
let lastPosSent = 0;
let lastRotationLog = 0;

export function connect(): NetAPI {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return api;
  }
  const url = (import.meta.env.VITE_WS_URL as string) || `ws://${location.hostname}:8080`;
  console.log('🔌 Connecting to WebSocket:', url);
  ws = new WebSocket(url);
  ws.addEventListener('open', () => {
    console.log('✅ WebSocket connected successfully');
    store.connected = true;
    emit();
  });
  ws.addEventListener('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
  ws.addEventListener('close', (event) => {
    console.log('🔌 WebSocket closed:', { code: event.code, reason: event.reason });
    store.connected = false;
    emit();
  });
  ws.addEventListener('message', (ev) => {
    try {
      const msg = JSON.parse(String(ev.data));
      switch (msg.t) {
        case 'welcome':
          console.log('🎉 Welcome message - assigned player ID:', msg.id);
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
          // full snapshot with simple timeline
          const now = performance.now();
          store.tPrev = store.tCurr || now;
          store.tCurr = now;
          store.playersPrev = store.players;
          const m = new Map<number, PlayerSnapshot>();
          
          // Reduced network logging to focus on input debugging
          const hasMovement = (msg.list as PlayerSnapshot[]).some(player => {
            const prevPlayer = store.players.get(player.id);
            return prevPlayer && (
              Math.abs(player.x - prevPlayer.x) > 0.1 || 
              Math.abs(player.z - prevPlayer.z) > 0.1
            );
          });
          
          if (hasMovement) {
            console.log(`👥 MOVEMENT DETECTED: ${(msg.list as PlayerSnapshot[]).length} players in ${store.currentRoom}`);
            for (const player of msg.list as PlayerSnapshot[]) {
              const isMe = player.id === store.selfId;
              const prevPlayer = store.players.get(player.id);
              const moved = prevPlayer && (
                Math.abs(player.x - prevPlayer.x) > 0.1 || 
                Math.abs(player.z - prevPlayer.z) > 0.1
              );
              
              if (moved || !prevPlayer) {
                console.log(`  Player ${player.id}${isMe ? ' (me)' : ''}:`, {
                  pos: `${player.x.toFixed(1)}, ${player.y.toFixed(1)}, ${player.z.toFixed(1)}`,
                  rot: player.rotation ? `${(player.rotation * 180 / Math.PI).toFixed(0)}°` : 'none',
                  name: player.name || 'unnamed',
                  moved: moved ? '✅ MOVED' : '🆕 NEW'
                });
              }
            }
          }
          
          for (const p of msg.list as PlayerSnapshot[]) {
            m.set(p.id, p);
          }
          
          if (store.selfId != null) {
            const me = (msg.list as PlayerSnapshot[]).find(p => p.id === store.selfId);
            if (me) store.selfPos = { x: me.x, y: me.y, z: me.z };
          }
          store.players = m;
          emit();
          break;
        }
        case 'roomList':
          store.rooms = msg.rooms || [];
          emit();
          break;
        case 'playerJoined':
          store.presenceMessages.push({
            type: 'joined',
            playerId: msg.playerId,
            playerName: msg.playerName,
            timestamp: Date.now()
          });
          // Keep only last 10 presence messages
          if (store.presenceMessages.length > 10) {
            store.presenceMessages = store.presenceMessages.slice(-10);
          }
          emit();
          break;
        case 'playerLeft':
          store.presenceMessages.push({
            type: 'left',
            playerId: msg.playerId,
            playerName: msg.playerName,
            timestamp: Date.now()
          });
          if (store.presenceMessages.length > 10) {
            store.presenceMessages = store.presenceMessages.slice(-10);
          }
          emit();
          break;
        case 'playerRenamed':
          store.presenceMessages.push({
            type: 'renamed',
            playerId: msg.playerId,
            playerName: msg.playerName,
            timestamp: Date.now()
          });
          if (store.presenceMessages.length > 10) {
            store.presenceMessages = store.presenceMessages.slice(-10);
          }
          emit();
          break;
        case 'createSuccess':
          store.currentRoom = msg.roomId;
          // Show success message
          store.presenceMessages.push({
            type: 'joined',
            playerId: store.selfId || 0,
            playerName: `Created room "${msg.roomName}"`,
            timestamp: Date.now()
          });
          emit();
          break;
        case 'createError':
        case 'joinError':
          // Show error message
          store.presenceMessages.push({
            type: 'left',
            playerId: 0,
            playerName: `Error: ${msg.error}`,
            timestamp: Date.now()
          });
          emit();
          break;
        case 'joinSuccess':
          store.currentRoom = msg.room;
          emit();
          break;
        case 'roomClosed':
          store.currentRoom = 'lobby';
          store.presenceMessages.push({
            type: 'left',
            playerId: 0,
            playerName: msg.message || 'Room was closed',
            timestamp: Date.now()
          });
          emit();
          break;
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
  sendPosition(x: number, y: number, z: number, rotation?: number) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const now = performance.now();
    if (now - lastPosSent < 1000 / 10) return; // 10Hz
    lastPosSent = now;
    const data: any = { t: 'pos', x, y, z };
    if (rotation !== undefined) {
      data.rotation = rotation;
      // Throttle debug logging to avoid spam
      if (now - lastRotationLog > 1000) { // Only log once per second
        lastRotationLog = now;
        console.log('📡 Sending position with rotation:', {
          position: `${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`,
          rotation: `${(rotation * 180 / Math.PI).toFixed(0)}°`
        });
      }
    }
    ws.send(JSON.stringify(data));
  },
  joinRoom(room: string) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error('❌ Cannot join room - WebSocket not connected');
      return;
    }
    console.log('🚪 Joining room:', room);
    store.currentRoom = room;
    ws.send(JSON.stringify({ t: 'join', room }));
    emit();
  },
  setPlayerName(name: string) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ t: 'setName', name }));
  },
  getRooms() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ t: 'getRooms' }));
  },
  createRoom(name: string) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ t: 'createRoom', name }));
  },
  getState() {
    // Return the single store reference so useSyncExternalStore can compare by reference
    return store;
  },
};

export function useNet() {
  const netApi = useMemo(() => connect(), []);
  const subscribe = (fn: () => void) => {
    store.subscribers.add(fn);
    return () => store.subscribers.delete(fn);
  };
  const state = useSyncExternalStore(subscribe, netApi.getState, netApi.getState);
  
  // Return both state and API methods
  return {
    ...state,
    sendChat: netApi.sendChat,
    sendPosition: netApi.sendPosition,
    joinRoom: netApi.joinRoom,
    setPlayerName: netApi.setPlayerName,
    getRooms: netApi.getRooms,
    createRoom: netApi.createRoom,
  };
}


