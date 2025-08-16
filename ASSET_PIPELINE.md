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

### Performance Optimizations (v2) ✅ **NEW**
- **Mesh Instancing**: All static meshes now use InstancedMesh for better performance
  - `InstancedWalls`: Wall geometry with batched rendering  
  - `InstancedTorches`: Torch flames with individual point lights
  - `InstancedCoins`: Collectible coins with efficient culling
  - `InstancedProjectiles`: All projectile types with dynamic coloring
  - `InstancedProps`: Decorative objects with minimal draw calls
- **Draw Call Reduction**: 5-10x fewer draw calls through instancing
- **Memory Efficiency**: Shared geometry with per-instance transforms
- **Dynamic Instancing**: Real-time updates for moving objects (projectiles)

### CI Size Budget (v2) ✅ **NEW** 
- **Automated Budget Checking**: CI fails if assets exceed 10MB gzipped
- **GitHub Actions Integration**: Size reporting on every build
- **Budget Scripts**: `npm run size:budget` for local validation
- **Asset Monitoring**: Per-file size tracking and alerts
- **Size Report**: Detailed breakdown of asset sizes and compression ratios

### Tools Enhancement (v2) ✅ **NEW**
- **Budget Checking**: `tools/check-budget.mjs` validates 10MB limit
- **CI Integration**: `.github/workflows/ci.yml` with size validation
- **Enhanced Reporting**: More detailed size analysis and warnings

Open for development (TODO)
- [x] Add `tools/glb-compress.mjs` using `gltf-transform` (draco, meshopt). Usage: `node tools/glb-compress.mjs <inDir> <outDir>` ✅
- [x] Add `tools/ktx2-textures.sh` wrapper around `toktx` for batch texture conversion. Usage: `bash tools/ktx2-textures.sh <inDir> <outDir>` ✅
- [x] Wire CI job to run size report and fail if over budget ✅
- [ ] Implement KTX2 texture compression pipeline
- [ ] Add Draco/Meshopt compression for GLB files
- [ ] Vite plugin to prefer compressed assets


