### Multiplayer Networking (MVP) — Completed

What was added
- **Server** (`server/src/index.js`): WebSocket server broadcasting player snapshots at 10Hz; chat messages; assigns `id` per client.
- **Client** (`client/src/net/net.ts`): connection hook `useNet()` exposing connection state, player snapshots, and chat send.
- **Position sync**: Player sends position at 10Hz; scene renders other players as orange spheres.

How to run
```
cd server && npm i && npm run start
# new terminal
cd client && npm i && npm run dev
```
- Open two browser tabs; move with WASD and observe the other sphere updating.

Config
- Client auto-connects to `ws://<host>:8080`. Override with `VITE_WS_URL`.

Next extensions
- Snapshot interpolation buffer (implemented simple linear interpolation between last two snapshots).
- Input-based client prediction with reconciliation.
- Per-room lobbies and presence (join/leave events).
- Replace spheres with avatar instances and nameplates.

Files
- `server/src/index.js`
- `client/src/net/net.ts`



