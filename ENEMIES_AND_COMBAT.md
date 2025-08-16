### Enemies and Combat (Spider MVP)

What was added
- `client/src/ai/spider.tsx`: simple enemy that seeks the player and applies contact damage.
- `client/src/game/health.ts`: player health store + HUD integration.
- `MapScene` spawns one spider to demonstrate.

How to try
```
cd client && npm run dev
```
- Approach the green spider; HP ticks down while in contact.

Next extensions
- Proper physics-based collisions, hit reactions, and attack cooldown.
- Multiple enemy types (bat/slime) and spawners from generator tags.
- Networked enemies (authoritative server).


