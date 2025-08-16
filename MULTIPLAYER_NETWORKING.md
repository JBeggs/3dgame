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
- Client-side prediction/reconciliation: local movement is immediate; periodic server snapshots gently correct drift.
- Input-based client prediction with reconciliation.
- Per-room lobbies and presence (join/leave events).
- Replace spheres with avatar instances and nameplates.

Open for development (TODO)
- [x] Add nameplates over remote players and colorize by id
- [x] Implement simple client prediction (velocity-based) with periodic reconciliation
- [x] Add lobby/join flow and per-room presence system

Nameplate System Enhancements (v2)
- **Enhanced Nameplates**: Created dedicated `Nameplate` component with camera-facing behavior
- **Distance-Based Scaling**: Nameplates scale and fade based on distance from local player
- **Improved Color System**: 20 predefined colors for better visual distribution
- **Background Plates**: Semi-transparent backgrounds for better text readability
- **Status Indicators**: Green dot showing online/active status
- **Distance Display**: Shows distance in meters for far players (>8m)
- **Performance Optimized**: Proper depth handling and transparency settings

Features:
- **Camera Billboard**: Nameplates always face the camera for optimal readability
- **Adaptive Opacity**: Fades out distant players while maintaining visibility
- **Smart Scaling**: Reduces size at distance to prevent screen clutter
- **Color Consistency**: Each player ID maps to a consistent, vibrant color
- **Status Awareness**: Visual indicators for player state/activity

Lobby & Presence System (v3)
- **Multi-Room Support**: Server manages multiple predefined rooms (lobby, dungeons, arena)
- **Real-Time Presence**: Join/leave notifications with player names and timestamps
- **Room Management**: Dynamic player counts and room switching
- **Player Names**: Customizable player names with server validation (20 char limit)
- **Lobby UI**: Comprehensive lobby panel with room list, presence feed, and controls
- **Connection Status**: Visual connection indicators and player ID display
- **Activity Feed**: Recent join/leave/rename events with timestamps

Server Features:
- **Room Tracking**: Maintains room metadata (name, player count, creation time)
- **Presence Events**: Broadcasts join/leave/rename events to room members
- **Player Management**: Tracks player names, join times, and room assignments
- **Room Broadcasting**: Separate message channels per room

Client Features:
- **Room Selection**: Visual room browser with player counts and icons
- **Name Setting**: In-line name editor with validation
- **Presence Feed**: Scrollable activity log with color-coded events
- **Auto-Refresh**: Automatic room list updates on changes
- **Current Room Indicator**: Clear visual indication of active room

Files
- `server/src/index.js`
- `client/src/net/net.ts`
- `client/src/ui/Nameplate.tsx`
- `client/src/ui/GameCanvas.tsx`
- `client/src/ui/LobbyPanel.tsx`



