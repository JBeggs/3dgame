### Interactions and HUD (Collect + Door)

What was added
- `client/src/game/inventory.ts`: tiny inventory store with hooks.
- `client/src/ui/HUD.tsx`: overlay showing key/coin counts.
- `client/src/ui/Interactables.tsx`: clickable key collectible and a locked door visual with matching physics blocker.
- Integrated HUD and interactables in `GameCanvas`.

How to try
```
cd client && npm run dev
```
- Click the torus “key” to collect; HUD updates. Door turns green when you have a key (visual only for now).

Next extensions
- Door interaction to remove physics blocker upon unlock.
- Coin pickups now placed per room by the generator; HUD shows target count from config.
- Goal gate: opens automatically when coin target is met; win overlay shown.
- Prompts (E/ tap) rather than clicks; controller/gamepad input.


