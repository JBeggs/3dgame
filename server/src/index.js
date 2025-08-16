import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`[ws] listening on :${PORT}`);

const clients = new Map(); // id -> { ws, x,y,z }
let nextId = 1;

wss.on('connection', (ws) => {
  const id = nextId++;
  clients.set(id, { ws, x: 0, y: 0, z: 0 });
  ws.send(JSON.stringify({ t: 'welcome', id }));
  // send initial players snapshot
  ws.send(JSON.stringify({ t: 'players', list: [...clients.entries()].map(([pid, c]) => ({ id: pid, x: c.x, y: c.y, z: c.z })) }));

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
    }
  });

  ws.on('close', () => {
    clients.delete(id);
  });
});

setInterval(() => {
  // broadcast players snapshot at 10Hz
  const list = [...clients.entries()].map(([pid, c]) => ({ id: pid, x: c.x, y: c.y, z: c.z }));
  broadcast({ t: 'players', list });
}, 100);

function broadcast(obj) {
  const json = JSON.stringify(obj);
  for (const [, c] of clients) {
    if (c.ws.readyState === c.ws.OPEN) c.ws.send(json);
  }
}


