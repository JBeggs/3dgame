### Doors and Pickups (Unlock Flow)

What was added
- Door physics blocker now created via `addStaticBox()` and removed on unlock.
- Clicking the door consumes 1 key from inventory and opens it (changes material and removes physics body).
- Files touched: `client/src/ui/Interactables.tsx`, `client/src/game/physics.ts` (add/remove helpers).

How to try
1. Run the client dev server.
2. Click the key to collect it, then click the door to unlock; you can walk through afterward.

Next extensions
- Replace click with proximity + `E` interaction prompt.
- Network authority: server validates pickups and door state; broadcast state changes.
- Multiple doors/keys; keyed doors by color or id.


