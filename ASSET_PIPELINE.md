### Asset Pipeline (Compression + Size Budget)

Goals
- Keep first meaningful play under 10MB gzipped.
- Compress textures to KTX2 when we add them; compress glTF to Draco/Meshopt.

Included now
- `tools/size-report.mjs`: prints per-file and total sizes (and gzip) for assets directory.

Usage
```
node tools/size-report.mjs client/public/assets
```

Next additions (when assets land)
- Scripts to run `gltf-transform` (draco, meshopt) and `toktx` for KTX2.
- Vite plugin to prefer `.ktx2` when available.


