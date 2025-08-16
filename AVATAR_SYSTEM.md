### Avatar System (Plan for next pass)

Scope implemented in this pass
- Placeholder modular avatar composed from primitives; color-customizable.
- Selection UI (color pickers) with localStorage persistence.

Next
- Swap body/head/outfit presets and lazy-load glTF assets. Loader added with `/assets/avatar/{id}.glb` lookup and primitive fallback. If the GLB contains animation clips named `Idle` and `Run/Walk`, they will auto‑blend based on movement speed.
- Host API: window.gameApi.setAvatar(config) updates the avatar at runtime.

Steps
1. Data schema: `{ bodyId, headId, outfitId, colors: { primary, secondary } }`.
2. Loader: lazy-import assets; default to placeholders to keep bundle small.
3. UI: small panel to select pieces; apply materials; save.
4. Replace `PlayerMesh` geometry with composed avatar root.

Files
- `client/src/avatar/store.ts`, `client/src/avatar/Avatar.tsx`, `client/src/avatar/loader.ts`, `client/src/ui/AvatarPanel.tsx`, `client/src/game/player.tsx` (uses `AvatarRoot`).

Usage
- Place optional GLB files at `/web/assets/avatar/{bodyId|headId|outfitId}.glb`. If absent, the placeholder primitives render instead.
 - From host/webview you can call: `window.gameApi.setAvatar({ bodyId: 'bodyB', colors: { primary: '#ffcc00' } })`.

Checklist to verify
- [ ] Copy `bodyA.glb`, `headA.glb`, and `robeA.glb` into `client/public/assets/avatar/`
- [ ] Start dev server; confirm GLBs load (warnings appear only if missing)
- [ ] Movement makes the avatar blend Idle↔Run when clips are present
- [ ] Use `window.gameApi.setAvatar({ bodyId: 'bodyB' })` to swap parts at runtime
- [ ] For cache issues during swaps, call `clearAvatarCache()` after updating files (dev only)

Notes
- Asset compression and real meshes come next; for now, this is the UI/system scaffold.


