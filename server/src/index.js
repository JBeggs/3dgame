import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`[ws] listening on :${PORT}`);

const clients = new Map(); // id -> { ws, x,y,z, room, name, joinTime }
const rooms = new Map(); // room -> { name, playerCount, created, maxPlayers, createdBy }
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
    joinTime: Date.now()
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
      c.x = Number(msg.x)||0; c.y = Number(msg.y)||0; c.z = Number(msg.z)||0;
      if (msg.rotation !== undefined) {
        c.rotation = Number(msg.rotation)||0;
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
      
      // Update room count and notify others
      updateRoomCount(c.room);
      broadcastToRoom(c.room, { t: 'playerLeft', playerId: id, playerName: c.name });
      broadcastRoomList();
      console.log(`[disconnect] Player ${id} (${c.name}) left ${c.room}`);
    }
    clients.delete(id);
  });
});

setInterval(() => {
  // broadcast players snapshot per room at 10Hz
  for (const [id, c] of clients) {
    const list = [...clients.entries()]
      .filter(([pid, cc]) => cc.room === c.room)
      .map(([pid, cc]) => ({ id: pid, x: cc.x, y: cc.y, z: cc.z, rotation: cc.rotation }));
    sendTo(id, { t: 'players', list });
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


