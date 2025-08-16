import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`[ws] listening on :${PORT}`);

const clients = new Map();
let nextId = 1;

wss.on('connection', (ws) => {
  const id = nextId++;
  clients.set(id, ws);
  ws.send(JSON.stringify({ t: 'welcome', id }));

  ws.on('message', (data) => {
    // naive broadcast
    for (const [otherId, otherWs] of clients) {
      if (otherWs.readyState === otherWs.OPEN) {
        otherWs.send(JSON.stringify({ t: 'echo', from: id, m: String(data) }));
      }
    }
  });

  ws.on('close', () => {
    clients.delete(id);
  });
});


