### Mobile Controls and Movement Upgrades

What was added
- Upgraded input to a singleton with programmatic setters (`getInput()`), enabling shared keyboard + touch.
- `TouchControls` virtual joystick overlays on mobile and sets movement vector.
- Player jump (Space or tap/hold with future button) with basic ground check using vertical velocity.
- Files: `client/src/game/input.ts`, `client/src/ui/TouchControls.tsx`, `client/src/game/player.tsx`, `client/src/ui/GameCanvas.tsx`.

How to try
```
cd client && npm run dev
```
- Desktop: WASD + Space. Mobile: drag the left circle to move.

Next extensions
- Dedicated jump/action buttons; proper ground raycast; smoothing for joystick.
- Gamepad support and configurable bindings.


