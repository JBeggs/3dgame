### Avatar System (Plan for next pass)

Scope for implementation
- Load a modular avatar (body/head/outfit) as lightweight glTF meshes (placeholder boxes initially).
- Selection UI to swap parts and color variants; persist to localStorage.
- Expose `setAvatar(config)` via `<GameCanvas />` API for host app.

Steps
1. Data schema: `{ bodyId, headId, outfitId, colors: { primary, secondary } }`.
2. Loader: lazy-import assets; default to placeholders to keep bundle small.
3. UI: small panel to select pieces; apply materials; save.
4. Replace `PlayerMesh` geometry with composed avatar root.

Notes
- Actual asset compression and art pass will come after system scaffolding.


