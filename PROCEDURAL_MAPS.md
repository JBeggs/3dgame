### Procedural Map Generator (Skeleton)

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

Next extensions
- Real BSP recursion, variable room sizes, loops, props pass.
- Nav grid export for AI; seed parameter UI; lazy-loaded tileset materials.
- Replace click pickups with proximity triggers and server authority.


