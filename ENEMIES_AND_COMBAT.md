### Enemies and Combat (Spider MVP)

What was added
- `client/src/ai/spider.tsx`: simple enemy that seeks the player and applies contact damage.
- `client/src/game/health.ts`: player health store + HUD integration.
- `MapScene` spawns one spider to demonstrate.
 - Pathing: `client/src/ai/pathfind.ts` provides A* on the grid; `PathSpider` uses it to move room-to-room.

How to try
```
cd client && npm run dev
```
- Approach the green spider; HP ticks down while in contact.

Next extensions
- Proper physics-based collisions, hit reactions, and attack cooldown.
- Multiple enemy types (bat/slime) and spawners from generator tags.
- Networked enemies (authoritative server).

Open for development (TODO)
- [ ] Build grid-based pathfinding using exported nav grid
- [ ] Add ranged attack enemy and simple projectile handling
- [ ] Health pickups and difficulty curve by room depth


