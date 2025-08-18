import { useEffect, useMemo } from 'react';
import { useSyncExternalStore } from 'react';

type PlayerSnapshot = { id: number; x: number; y: number; z: number; rotation?: number; name?: string };

type ProjectileSnapshot = {
  id: string;
  playerId: number;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  type: 'magic' | 'ricochet' | 'explosive';
  damage: number;
  lifetime: number;
  maxLifetime: number;
  bounces?: number;
  explosionRadius?: number;
  explosionDamage?: number;
};

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
  playerAvatars: Map<number, any>; // Avatar configurations by player ID
  tPrev: number;
  tCurr: number;
  selfPos: { x: number; y: number; z: number } | null;
  messages: { from: number; text: string }[];
  rooms: Room[];
  presenceMessages: { type: 'joined' | 'left' | 'renamed'; playerId: number; playerName: string; timestamp: number }[];
  
  // Multiplayer projectiles
  remoteProjectiles: Map<string, ProjectileSnapshot>;
  remoteProjectilesPrev: Map<string, ProjectileSnapshot>;
  
  subscribers: Set<() => void>;
};

const store: Store = {
  connected: false,
  selfId: null,
  currentRoom: 'lobby',
  players: new Map(),
  playersPrev: new Map(),
  playerAvatars: new Map(),
  tPrev: 0,
  tCurr: 0,
  selfPos: null,
  messages: [],
  rooms: [],
  presenceMessages: [],
  
  // Initialize projectile maps
  remoteProjectiles: new Map(),
  remoteProjectilesPrev: new Map(),
  
  subscribers: new Set(),
};

// Cached snapshot for useSyncExternalStore. Must only change during emit().
let snapshot: Readonly<Store> = store as unknown as Readonly<Store>;

function emit() {
  // Recompute a shallow snapshot so getSnapshot changes only when we emit
  snapshot = {
    ...store,
    players: store.players,
    playersPrev: store.playersPrev,
    remoteProjectiles: store.remoteProjectiles,
    remoteProjectilesPrev: store.remoteProjectilesPrev,
  } as Readonly<Store>;
  store.subscribers.forEach((fn) => fn());
}

export type NetAPI = {
  sendChat: (text: string) => void;
  sendPosition: (x: number, y: number, z: number, rotation?: number) => void;
  sendInputCommand: (input: any) => void;
  sendProjectileCreate: (projectile: Omit<ProjectileSnapshot, 'playerId'>) => void;
  sendProjectileDestroy: (projectileId: string) => void;
  sendAvatarConfig: (config: any) => void;
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
  ws = new WebSocket(url);
  ws.addEventListener('open', () => {
    store.connected = true;
    emit();
  });
  ws.addEventListener('error', (error) => {
    // quiet
  });
  ws.addEventListener('close', (event) => {
    store.connected = false;
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
          // full snapshot with simple timeline
          const now = performance.now();
          store.tPrev = store.tCurr || now;
          store.tCurr = now;
          store.playersPrev = new Map(store.players);
          const m = new Map<number, PlayerSnapshot>();
          
          // Reduced network logging to focus on input debugging
          const hasMovement = (msg.list as PlayerSnapshot[]).some(player => {
            const prevPlayer = store.players.get(player.id);
            return prevPlayer && (
              Math.abs(player.x - prevPlayer.x) > 0.1 || 
              Math.abs(player.z - prevPlayer.z) > 0.1
            );
          });
          
          // More detailed movement logging
          const totalPlayers = (msg.list as PlayerSnapshot[]).length;
          const otherPlayers = (msg.list as PlayerSnapshot[]).filter(p => p.id !== store.selfId);
          
          // quiet
          
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
        case 'projectiles': {
          // Handle multiplayer projectile updates
          store.remoteProjectilesPrev = store.remoteProjectiles;
          const m = new Map<string, ProjectileSnapshot>();
          
          if (msg.list && Array.isArray(msg.list)) {
            for (const proj of msg.list as ProjectileSnapshot[]) {
              // Don't render our own projectiles (we handle them locally)
              if (proj.playerId !== store.selfId) {
                m.set(proj.id, proj);
              }
            }
          }
          
          store.remoteProjectiles = m;
          emit();
          break;
        }
        case 'projectileDestroyed':
          if (msg.id && store.remoteProjectiles.has(msg.id)) {
            store.remoteProjectiles.delete(msg.id);
            emit();
          }
          break;
        case 'positionCorrection':
          // Server rejected our position - accept the correction
          // quiet
          // The physics system should handle this by updating player body position
          window.dispatchEvent(new CustomEvent('serverPositionCorrection', { 
            detail: { x: msg.x, y: msg.y, z: msg.z, reason: msg.reason }
          }));
          break;
        case 'combatError':
          // Server rejected our combat action
          // quiet
          // Show error to user
          window.dispatchEvent(new CustomEvent('combatError', {
            detail: { reason: msg.reason, cooldown: msg.cooldown }
          }));
          break;
        case 'playerDamaged':
          // We took damage from server authority
          // quiet
          // Update local health state
          window.dispatchEvent(new CustomEvent('playerDamaged', {
            detail: { 
              damage: msg.damage, 
              health: msg.health, 
              maxHealth: msg.maxHealth, 
              source: msg.source,
              projectileType: msg.projectileType 
            }
          }));
          break;
        case 'projectileHit':
          // Our projectile hit someone
          // quiet
          // Play hit sound or show hit indicator
          window.dispatchEvent(new CustomEvent('projectileHit', {
            detail: { 
              targetId: msg.targetId, 
              damage: msg.damage, 
              projectileId: msg.projectileId 
            }
          }));
          break;
        case 'hitEffect':
          // Someone got hit - show visual effect
          // quiet
          window.dispatchEvent(new CustomEvent('hitEffect', {
            detail: {
              x: msg.x, y: msg.y, z: msg.z,
              playerId: msg.playerId,
              damage: msg.damage,
              type: msg.type
            }
          }));
          break;
        case 'avatarUpdate':
          // Another player updated their avatar
          if (msg.playerId && msg.config) {
            store.playerAvatars.set(msg.playerId, msg.config);
            // quiet
            emit();
          }
          break;
        case 'inputAck':
          // Server acknowledged our input command - use for reconciliation
          if (msg.sequenceNumber && msg.position) {
            window.dispatchEvent(new CustomEvent('inputAcknowledged', {
              detail: {
                sequenceNumber: msg.sequenceNumber,
                position: msg.position,
                timestamp: msg.timestamp
              }
            }));
          }
          break;
        case 'stateUpdate':
          // Server sends authoritative state update for reconciliation
          if (msg.position && msg.sequenceNumber) {
            window.dispatchEvent(new CustomEvent('serverStateUpdate', {
              detail: {
                position: msg.position,
                velocity: msg.velocity,
                sequenceNumber: msg.sequenceNumber,
                timestamp: msg.timestamp
              }
            }));
          }
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
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      // quiet
      return;
    }
    const now = performance.now();
    if (now - lastPosSent < 1000 / 10) return; // 10Hz
    lastPosSent = now;
    const data: any = { t: 'pos', x, y, z };
    if (rotation !== undefined) {
      data.rotation = rotation;
    }
    
    // quiet
    
    ws.send(JSON.stringify(data));
  },
  sendProjectileCreate(projectile: Omit<ProjectileSnapshot, 'playerId'>) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    // quiet
    ws.send(JSON.stringify({ 
      t: 'projectileCreate', 
      projectile 
    }));
  },
  sendInputCommand(input: any) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    // Send input command with sequence number for prediction
    ws.send(JSON.stringify({ 
      t: 'inputCommand', 
      input 
    }));
  },
  sendProjectileDestroy(projectileId: string) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    // quiet
    ws.send(JSON.stringify({ 
      t: 'projectileDestroy', 
      id: projectileId 
    }));
  },
  sendAvatarConfig(config: any) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    // quiet
    ws.send(JSON.stringify({ 
      t: 'avatarUpdate', 
      config 
    }));
  },
  joinRoom(room: string) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      // quiet
      return;
    }
    // quiet
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
    // Return the cached snapshot to avoid infinite render loops
    return snapshot;
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


