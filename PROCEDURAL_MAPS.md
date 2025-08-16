### Procedural Map Generator — Completed (v1)

What was added
- `client/src/gen/mapGen.ts`: upgraded to a small dungeon generator: non-overlapping rooms, corridors via nearest-neighbor connections, plus extra links for loops; widened corridors.
- `client/src/ui/MapScene.tsx`: renders grid as boxes and builds matching static physics walls.
- Physics upgraded to a singleton with `addStaticBox()` so the map can register colliders.
- Integrated into scene in `GameCanvas`.

Update
- Added seeded coin placement and click-to-collect. Collecting increments the HUD counter.

How to try
```
cd client && npm run dev
```
- A multi-room dungeon with corridors and a few loops appears. Player collides with walls.

Controls for regeneration (modernized)
- Open the right-side panel (always visible): set `Seed` and `Rooms`, then click Regenerate. These preferences persist via `localStorage` and are read on load.

Skeleton for next moves
- [ ] Add room tags (start/treasure/lair) to drive spawners/props
- [ ] Export a nav grid and simple navmesh for AI pathing
- [ ] Add decorator pass for props/torches and room connectors with doors
- [ ] Hot-reload generation without page refresh

Next extensions
- Real BSP recursion and variable room sizes
- Nav grid export for AI; lazy-loaded tileset materials
- Replace click pickups with proximity triggers and server authority


