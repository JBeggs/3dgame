### Mobile Controls and Movement Upgrades — Completed

What was added
- Upgraded input to a singleton with programmatic setters (`getInput()`), enabling shared keyboard + touch.
- `TouchControls` virtual joystick overlays on mobile and sets movement vector; supports mouse/trackpad drag.
- Grounded jump: proper raycast ground check in physics (`isGrounded()`), used by player controller.
- Keyboard handlers attached with `passive: false` and `preventDefault` for Space/Arrows to avoid page scroll.
- Joystick listeners marked `passive`, drag requires press-and-hold; context menu disabled; high z-index so it stays interactive.
- OrbitControls: pan disabled, zoom disabled (to avoid non-passive wheel handler).
- Files: `client/src/game/input.ts`, `client/src/ui/TouchControls.tsx`, `client/src/game/player.tsx`, `client/src/ui/GameCanvas.tsx`.

How to try
```
cd client && npm run dev
```
- Desktop: WASD + Space. Trackpad/mouse: click and drag inside the left circle. Mobile: press and drag inside the left circle.

Next extensions
- Smoothing curve for joystick vector; deadzone tuning.
- Gamepad support and configurable bindings.

Files touched
- `client/src/game/input.ts`
- `client/src/ui/TouchControls.tsx`
- `client/src/game/player.tsx`
- `client/src/ui/GameCanvas.tsx`


