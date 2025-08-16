### Avatar System (Plan for next pass)

Scope implemented in this pass
- Placeholder modular avatar composed from primitives; color-customizable.
- Selection UI (color pickers) with localStorage persistence.

Next
- Swap body/head/outfit presets and lazy-load glTF assets.
- Expose `setAvatar(config)` API for host app integration.

Steps
1. Data schema: `{ bodyId, headId, outfitId, colors: { primary, secondary } }`.
2. Loader: lazy-import assets; default to placeholders to keep bundle small.
3. UI: small panel to select pieces; apply materials; save.
4. Replace `PlayerMesh` geometry with composed avatar root.

Files
- `client/src/avatar/store.ts`, `client/src/avatar/Avatar.tsx`, `client/src/ui/AvatarPanel.tsx`, `client/src/game/player.tsx` (uses `AvatarRoot`).

Notes
- Asset compression and real meshes come next; for now, this is the UI/system scaffold.


