### Player Controller (Core)

What was added
- WASD keyboard input and jump flag scaffold (`client/src/game/input.ts`).
- Physics world using `cannon-es` with a sphere body for the player (`client/src/game/physics.ts`).
- Simple third‑person chase camera and a placeholder player mesh (`client/src/game/player.tsx`).
- Integrated into scene via `<PlayerMesh />` in `GameCanvas`.

How to run
```
cd client
npm i
npm run dev
```
- Use WASD/Arrow keys to move; camera follows behind.

Next extensions
- Replace sphere with capsule kinematic controller (slope handling, step offset).
- Ground detection + jump.
- Touch joystick for mobile.
- Convert to ECS components (Transform, Controller, PhysicsBody) and systems.


