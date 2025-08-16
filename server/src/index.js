import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`[ws] listening on :${PORT}`);

const clients = new Map(); // id -> { ws, x,y,z, room, name, joinTime }
const rooms = new Map(); // room -> { name, playerCount, created }
let nextId = 1;

// Initialize default rooms
rooms.set('lobby', { name: 'Main Lobby', playerCount: 0, created: Date.now() });
rooms.set('dungeon1', { name: 'Dungeon Alpha', playerCount: 0, created: Date.now() });
rooms.set('dungeon2', { name: 'Dungeon Beta', playerCount: 0, created: Date.now() });
rooms.set('arena', { name: 'PvP Arena', playerCount: 0, created: Date.now() });

wss.on('connection', (ws) => {
  const id = nextId++;
  const defaultRoom = 'lobby';
  clients.set(id, { 
    ws, 
    x: 0, 
    y: 0, 
    z: 0, 
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
    } else if (msg.t === 'join') {
      const c = clients.get(id);
      if (!c) return;
      const oldRoom = c.room;
      const newRoom = String(msg.room || 'lobby');
      
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
        console.log(`[room] Player ${id} (${c.name}) moved from ${oldRoom} to ${newRoom}`);
      }
    } else if (msg.t === 'setName') {
      const c = clients.get(id);
      if (!c) return;
      c.name = String(msg.name || `Player${id}`).substring(0, 20); // Limit name length
      broadcastToRoom(c.room, { t: 'playerRenamed', playerId: id, playerName: c.name });
    } else if (msg.t === 'getRooms') {
      sendRoomList(id);
    }
  });

  ws.on('close', () => {
    const c = clients.get(id);
    if (c) {
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
      .map(([pid, cc]) => ({ id: pid, x: cc.x, y: cc.y, z: cc.z }));
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
    .map(([pid, cc]) => ({ id: pid, x: cc.x, y: cc.y, z: cc.z, name: cc.name }));
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
    created: room.created
  }));
  sendTo(playerId, { t: 'roomList', rooms: roomList });
}

function broadcastRoomList() {
  const roomList = [...rooms.entries()].map(([id, room]) => ({
    id,
    name: room.name,
    playerCount: room.playerCount,
    created: room.created
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


