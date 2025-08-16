import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`[ws] listening on :${PORT}`);

const clients = new Map(); // id -> { ws, x,y,z, room, name, joinTime }
const rooms = new Map(); // room -> { name, playerCount, created, maxPlayers, createdBy }
const projectiles = new Map(); // projectileId -> { ...projectile data, room }
let nextId = 1;
let nextRoomId = 1;

// Initialize default rooms (no player limit for lobby)
rooms.set('lobby', { 
  name: 'Main Lobby', 
  playerCount: 0, 
  created: Date.now(), 
  maxPlayers: -1, // No limit for lobby
  createdBy: 'system'
});

wss.on('connection', (ws) => {
  const id = nextId++;
  const defaultRoom = 'lobby';
  clients.set(id, { 
    ws, 
    x: 0, 
    y: 0, 
    z: 0, 
    rotation: 0,
    room: defaultRoom, 
    name: `Player${id}`,
    joinTime: Date.now(),
    
    // Server authority fields
    health: 100,
    maxHealth: 100,
    lastPosUpdate: Date.now(),
    lastCombatAction: 0,
    speed: 0, // Current movement speed
    
    // Anti-cheat tracking
    invalidMoveCount: 0,
    lastKnownValidPos: { x: 0, y: 0, z: 0 }
  });
  
  // Update room count
  updateRoomCount(defaultRoom);
  
  ws.send(JSON.stringify({ t: 'welcome', id }));
  // Send room list and initial players
  sendRoomList(id);
  sendPlayersFor(id);

  ws.on('message', (data) => {
    let msg = null;
    try { msg = JSON.parse(String(data)); } catch {}
    if (!msg) return;
    if (msg.t === 'chat') {
      broadcast({ t: 'chat', from: id, text: String(msg.text || '') });
          } else if (msg.t === 'pos') {
        const c = clients.get(id);
        if (!c) return;
        
        // Server-side movement validation
        const newPos = {
          x: Number(msg.x) || 0,
          y: Number(msg.y) || 0, 
          z: Number(msg.z) || 0
        };
        const newRotation = msg.rotation !== undefined ? Number(msg.rotation) || 0 : c.rotation;
        
        const now = Date.now();
        const deltaTime = (now - c.lastPosUpdate) / 1000; // Convert to seconds
        c.lastPosUpdate = now;
        
        // Calculate movement distance and speed
        const distance = Math.sqrt(
          Math.pow(newPos.x - c.x, 2) + 
          Math.pow(newPos.y - c.y, 2) + 
          Math.pow(newPos.z - c.z, 2)
        );
        const speed = deltaTime > 0 ? distance / deltaTime : 0;
        
        // Movement validation
        const MAX_SPEED = 12; // Maximum allowed speed (slightly above normal movement)
        const MAX_Y_DIFF = 8; // Maximum Y change per update (jumping/falling)
        const isValidMove = 
          speed <= MAX_SPEED && 
          Math.abs(newPos.y - c.y) <= MAX_Y_DIFF &&
          deltaTime >= 0.01; // Minimum time between updates (100 FPS max)
        
        if (isValidMove) {
          // Accept the movement
          c.x = newPos.x;
          c.y = newPos.y;
          c.z = newPos.z;
          c.rotation = newRotation;
          c.speed = speed;
          c.lastKnownValidPos = { x: newPos.x, y: newPos.y, z: newPos.z };
          c.invalidMoveCount = Math.max(0, c.invalidMoveCount - 1); // Decay invalid count
          
          // Basic boundary validation (lobby is roughly 24x24)
          const BOUNDARY = 15;
          if (c.room === 'lobby') {
            if (Math.abs(c.x) > BOUNDARY || Math.abs(c.z) > BOUNDARY) {
              console.log(`[anticheat] Player ${id} hit boundary at ${c.x.toFixed(1)}, ${c.z.toFixed(1)}`);
              // Clamp to boundary
              c.x = Math.max(-BOUNDARY, Math.min(BOUNDARY, c.x));
              c.z = Math.max(-BOUNDARY, Math.min(BOUNDARY, c.z));
            }
          }
        } else {
          // Reject the movement - use server authority
          c.invalidMoveCount++;
          console.log(`[anticheat] Player ${id} invalid move: speed=${speed.toFixed(1)} (max=${MAX_SPEED}), dt=${deltaTime.toFixed(3)}s, count=${c.invalidMoveCount}`);
          
          if (c.invalidMoveCount > 5) {
            // Too many invalid moves - reset to last known good position
            console.log(`[anticheat] Player ${id} position reset - too many invalid moves`);
            c.x = c.lastKnownValidPos.x;
            c.y = c.lastKnownValidPos.y; 
            c.z = c.lastKnownValidPos.z;
            c.invalidMoveCount = 0;
            
            // Send position correction to client
            sendTo(id, { 
              t: 'positionCorrection', 
              x: c.x, 
              y: c.y, 
              z: c.z,
              reason: 'Invalid movement detected'
            });
          }
        }
      } else if (msg.t === 'projectileCreate') {
        const c = clients.get(id);
        if (!c || !msg.projectile) return;
        
        // Server-side projectile validation
        const now = Date.now();
        const timeSinceLastCombat = now - c.lastCombatAction;
        const MIN_COMBAT_INTERVAL = 300; // Minimum 300ms between projectiles (anti-spam)
        
        // Rate limiting
        if (timeSinceLastCombat < MIN_COMBAT_INTERVAL) {
          console.log(`[anticheat] Player ${id} projectile spam blocked - ${timeSinceLastCombat}ms since last`);
          sendTo(id, { 
            t: 'combatError', 
            reason: 'Rate limited',
            cooldown: MIN_COMBAT_INTERVAL - timeSinceLastCombat
          });
          return;
        }
        
        // Position validation - projectile must originate near player
        const proj = msg.projectile;
        const distance = Math.sqrt(
          Math.pow(proj.x - c.x, 2) + 
          Math.pow(proj.y - (c.y + 1.2), 2) + // Account for head height
          Math.pow(proj.z - c.z, 2)
        );
        
        if (distance > 3) {
          console.log(`[anticheat] Player ${id} invalid projectile origin - distance ${distance.toFixed(1)}`);
          sendTo(id, { 
            t: 'combatError', 
            reason: 'Invalid projectile origin'
          });
          return;
        }
        
        // Velocity validation - prevent unrealistic projectile speeds
        const velocity = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy + proj.vz * proj.vz);
        const MAX_PROJECTILE_SPEED = 20; // Maximum projectile velocity
        
        if (velocity > MAX_PROJECTILE_SPEED) {
          console.log(`[anticheat] Player ${id} invalid projectile speed - ${velocity.toFixed(1)}`);
          sendTo(id, { 
            t: 'combatError', 
            reason: 'Invalid projectile velocity'
          });
          return;
        }
        
        // Accept the projectile
        c.lastCombatAction = now;
        
        const projectile = {
          ...msg.projectile,
          playerId: id,
          room: c.room,
          createdAt: now,
          // Server adds authoritative data
          validated: true
        };
        
        projectiles.set(msg.projectile.id, projectile);
        console.log(`[combat] Player ${id} fired ${msg.projectile.type} projectile ${msg.projectile.id} (speed: ${velocity.toFixed(1)})`);
        
        // Broadcast to all players in the same room
        broadcastToRoom(c.room, { 
          t: 'projectileCreated', 
          projectile 
        });
      } else if (msg.t === 'projectileDestroy') {
        const c = clients.get(id);
        if (!c || !msg.id) return;
        
        const projectile = projectiles.get(msg.id);
        if (projectile && projectile.playerId === id) {
          projectiles.delete(msg.id);
          console.log(`[projectile] Player ${id} destroyed projectile ${msg.id}`);
          
          // Broadcast destruction to all players in the same room
          broadcastToRoom(c.room, { 
            t: 'projectileDestroyed', 
            id: msg.id 
          });
        }
    } else if (msg.t === 'join') {
      const c = clients.get(id);
      if (!c) return;
      const oldRoom = c.room;
      const newRoom = String(msg.room || 'lobby');
      
      // Check if room exists and has space
      const room = rooms.get(newRoom);
      if (!room) {
        sendTo(id, { t: 'joinError', error: 'Room does not exist' });
        return;
      }
      
      // Check player limit (skip check for lobby)
      if (room.maxPlayers > 0 && room.playerCount >= room.maxPlayers) {
        sendTo(id, { t: 'joinError', error: 'Room is full' });
        return;
      }
      
      // Only change if different
      if (oldRoom !== newRoom) {
        c.room = newRoom;
        
        // Update room counts
        updateRoomCount(oldRoom);
        updateRoomCount(newRoom);
        
        // Broadcast room list update to all clients
        broadcastRoomList();
        
        // Send presence notifications
        broadcastToRoom(oldRoom, { t: 'playerLeft', playerId: id, playerName: c.name });
        broadcastToRoom(newRoom, { t: 'playerJoined', playerId: id, playerName: c.name });
        
        sendPlayersFor(id);
        sendTo(id, { t: 'joinSuccess', room: newRoom });
        console.log(`[room] Player ${id} (${c.name}) moved from ${oldRoom} to ${newRoom}`);
      }
    } else if (msg.t === 'setName') {
      const c = clients.get(id);
      if (!c) return;
      c.name = String(msg.name || `Player${id}`).substring(0, 20); // Limit name length
      broadcastToRoom(c.room, { t: 'playerRenamed', playerId: id, playerName: c.name });
    } else if (msg.t === 'getRooms') {
      sendRoomList(id);
    } else if (msg.t === 'createRoom') {
      const c = clients.get(id);
      if (!c) return;
      
      const roomName = String(msg.name || '').trim();
      if (roomName.length < 3 || roomName.length > 30) {
        sendTo(id, { t: 'createError', error: 'Room name must be 3-30 characters' });
        return;
      }
      
      // Check if player already created a room
      const existingRoom = [...rooms.values()].find(room => room.createdBy === id);
      if (existingRoom) {
        sendTo(id, { t: 'createError', error: 'You can only create one room at a time' });
        return;
      }
      
      // Create new room
      const roomId = `room_${nextRoomId++}`;
      rooms.set(roomId, {
        name: roomName,
        playerCount: 0,
        created: Date.now(),
        maxPlayers: 4,
        createdBy: id
      });
      
      // Move player to the new room
      const oldRoom = c.room;
      c.room = roomId;
      
      // Update room counts
      updateRoomCount(oldRoom);
      updateRoomCount(roomId);
      
      // Broadcast updates
      broadcastRoomList();
      broadcastToRoom(oldRoom, { t: 'playerLeft', playerId: id, playerName: c.name });
      broadcastToRoom(roomId, { t: 'playerJoined', playerId: id, playerName: c.name });
      
      sendPlayersFor(id);
      sendTo(id, { t: 'createSuccess', roomId, roomName });
      console.log(`[room] Player ${id} (${c.name}) created room "${roomName}" (${roomId})`);
    }
  });

  ws.on('close', () => {
    const c = clients.get(id);
    if (c) {
      // Check if player created a room and delete it if empty
      const createdRoom = [...rooms.entries()].find(([roomId, room]) => room.createdBy === id);
      if (createdRoom) {
        const [roomId, room] = createdRoom;
        // Move remaining players to lobby
        const playersInRoom = [...clients.values()].filter(client => client.room === roomId);
        for (const player of playersInRoom) {
          if (player.ws !== ws) { // Don't move the disconnecting player
            player.room = 'lobby';
            updateRoomCount('lobby');
            broadcastToRoom('lobby', { t: 'playerJoined', playerId: player.ws.id, playerName: player.name });
            sendTo(player.ws.id, { t: 'roomClosed', message: 'Room creator left, moved to lobby' });
          }
        }
        // Delete the room
        rooms.delete(roomId);
        console.log(`[room] Deleted room "${room.name}" (${roomId}) - creator left`);
      }
      
      // Clean up player's projectiles
      for (const [projId, proj] of projectiles) {
        if (proj.playerId === id) {
          projectiles.delete(projId);
          // Broadcast projectile destruction to room
          broadcastToRoom(c.room, { t: 'projectileDestroyed', id: projId });
        }
      }
      
      // Update room count and notify others
      updateRoomCount(c.room);
      broadcastToRoom(c.room, { t: 'playerLeft', playerId: id, playerName: c.name });
      broadcastRoomList();
      console.log(`[disconnect] Player ${id} (${c.name}) left ${c.room}`);
    }
    clients.delete(id);
  });
});

// Server-side projectile and game state update loop
setInterval(() => {
  const deltaTime = 0.1; // 100ms update interval
  const now = Date.now();
  
  // Update server-side projectiles
  for (const [projId, proj] of projectiles) {
    proj.lifetime += deltaTime;
    
    // Move projectile
    proj.x += proj.vx * deltaTime;
    proj.y += proj.vy * deltaTime;
    proj.z += proj.vz * deltaTime;
    
    // Check if projectile expired
    if (proj.lifetime >= proj.maxLifetime) {
      projectiles.delete(projId);
      broadcastToRoom(proj.room, { t: 'projectileDestroyed', id: projId });
      continue;
    }
    
    // Server-side hit detection against players
    const playersInRoom = [...clients.values()].filter(c => c.room === proj.room && c.ws.id !== proj.playerId);
    
    for (const target of playersInRoom) {
      const hitDistance = Math.sqrt(
        Math.pow(proj.x - target.x, 2) + 
        Math.pow(proj.y - (target.y + 1), 2) + // Center mass hit
        Math.pow(proj.z - target.z, 2)
      );
      
      // Hit detection (0.8 unit hit radius)
      if (hitDistance < 0.8) {
        // Projectile hit a player!
        const damage = proj.damage;
        target.health = Math.max(0, target.health - damage);
        
        console.log(`[combat] Projectile ${projId} hit player ${target.ws.id} for ${damage} damage (health: ${target.health}/${target.maxHealth})`);
        
        // Notify the hit player about damage
        sendTo(target.ws.id, { 
          t: 'playerDamaged', 
          damage, 
          health: target.health,
          maxHealth: target.maxHealth,
          source: proj.playerId,
          projectileType: proj.type
        });
        
        // Notify the shooter about the hit
        sendTo(proj.playerId, { 
          t: 'projectileHit', 
          targetId: target.ws.id,
          damage,
          projectileId: projId
        });
        
        // Broadcast hit effect to all players in room
        broadcastToRoom(proj.room, { 
          t: 'hitEffect', 
          x: proj.x, 
          y: proj.y, 
          z: proj.z,
          playerId: target.ws.id,
          damage,
          type: proj.type
        });
        
        // Remove projectile after hit (unless it's ricochet and has bounces)
        if (proj.type !== 'ricochet' || !proj.bounces || proj.bounces <= 0) {
          projectiles.delete(projId);
          broadcastToRoom(proj.room, { t: 'projectileDestroyed', id: projId });
        }
        break; // One hit per projectile per update
      }
    }
  }
  
  // Broadcast players and projectiles snapshot per room at 10Hz
  for (const [id, c] of clients) {
    // Player list with health
    const playerList = [...clients.entries()]
      .filter(([pid, cc]) => cc.room === c.room)
      .map(([pid, cc]) => ({ 
        id: pid, 
        x: cc.x, 
        y: cc.y, 
        z: cc.z, 
        rotation: cc.rotation,
        health: cc.health,
        maxHealth: cc.maxHealth
      }));
    sendTo(id, { t: 'players', list: playerList });
    
    // Projectile list for the same room
    const projectileList = [...projectiles.values()]
      .filter(proj => proj.room === c.room)
      .map(proj => ({
        id: proj.id,
        playerId: proj.playerId,
        x: proj.x, y: proj.y, z: proj.z,
        vx: proj.vx, vy: proj.vy, vz: proj.vz,
        type: proj.type,
        damage: proj.damage,
        lifetime: proj.lifetime,
        maxLifetime: proj.maxLifetime,
        bounces: proj.bounces,
        explosionRadius: proj.explosionRadius,
        explosionDamage: proj.explosionDamage
      }));
    
    if (projectileList.length > 0) {
      sendTo(id, { t: 'projectiles', list: projectileList });
    }
  }
}, 100);

function broadcast(obj) {
  const json = JSON.stringify(obj);
  for (const [, c] of clients) {
    if (c.ws.readyState === c.ws.OPEN) c.ws.send(json);
  }
}

function sendTo(id, obj) {
  const c = clients.get(id);
  if (!c) return;
  if (c.ws.readyState === c.ws.OPEN) c.ws.send(JSON.stringify(obj));
}

function sendPlayersFor(id) {
  const c = clients.get(id);
  if (!c) return;
  const list = [...clients.entries()]
    .filter(([pid, cc]) => cc.room === c.room)
    .map(([pid, cc]) => ({ id: pid, x: cc.x, y: cc.y, z: cc.z, rotation: cc.rotation, name: cc.name }));
  sendTo(id, { t: 'players', list });
}

function updateRoomCount(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const count = [...clients.values()].filter(c => c.room === roomId).length;
  room.playerCount = count;
}

function sendRoomList(playerId) {
  const roomList = [...rooms.entries()].map(([id, room]) => ({
    id,
    name: room.name,
    playerCount: room.playerCount,
    maxPlayers: room.maxPlayers,
    created: room.created,
    createdBy: room.createdBy
  }));
  sendTo(playerId, { t: 'roomList', rooms: roomList });
}

function broadcastRoomList() {
  const roomList = [...rooms.entries()].map(([id, room]) => ({
    id,
    name: room.name,
    playerCount: room.playerCount,
    maxPlayers: room.maxPlayers,
    created: room.created,
    createdBy: room.createdBy
  }));
  broadcast({ t: 'roomList', rooms: roomList });
}

function broadcastToRoom(roomId, message) {
  const json = JSON.stringify(message);
  for (const [, c] of clients) {
    if (c.room === roomId && c.ws.readyState === c.ws.OPEN) {
      c.ws.send(json);
    }
  }
}


