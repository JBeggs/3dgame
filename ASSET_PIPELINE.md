### Asset Pipeline (Compression + Size Budget)

Goals
- Keep first meaningful play under 10MB gzipped.
- Compress textures to KTX2 when we add them; compress glTF to Draco/Meshopt.

Included now
- `tools/size-report.mjs`: prints per-file and total sizes (and gzip) for assets directory.
 - NPM script: `npm run assets:report` from `client/` to quickly audit sizes.

Usage
```
node tools/size-report.mjs client/public/assets
```

Next additions (when assets land)
- Scripts to run `gltf-transform` (draco, meshopt) and `toktx` for KTX2.
- Vite plugin to prefer `.ktx2` when available.

Open for development (TODO)
- [ ] Add `tools/glb-compress.mjs` using `gltf-transform` (prune, dedup, draco, meshopt)
- [ ] Add `tools/ktx2-textures.sh` wrapper around `toktx` for batch texture conversion
- [ ] Wire CI job to run size report and fail if over budget


