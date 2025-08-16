import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`[ws] listening on :${PORT}`);

const clients = new Map(); // id -> { ws, x,y,z, room }
let nextId = 1;

wss.on('connection', (ws) => {
  const id = nextId++;
  clients.set(id, { ws, x: 0, y: 0, z: 0, room: 'default' });
  ws.send(JSON.stringify({ t: 'welcome', id }));
  // send initial players snapshot for default room
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
      c.room = String(msg.room || 'default');
      sendPlayersFor(id);
    }
  });

  ws.on('close', () => {
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
    .map(([pid, cc]) => ({ id: pid, x: cc.x, y: cc.y, z: cc.z }));
  sendTo(id, { t: 'players', list });
}


