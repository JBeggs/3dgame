#!/usr/bin/env node
// Compress all GLB/GLTF files in a directory using glTF-Transform CLI
// Usage: node tools/glb-compress.mjs <inputDir> <outputDir>

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const inDir = path.resolve(process.argv[2] || path.join(process.cwd(), 'client/public/assets'));
const outDir = path.resolve(process.argv[3] || path.join(process.cwd(), 'dist-assets'));
fs.mkdirSync(outDir, { recursive: true });

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (/\.(glb|gltf)$/i.test(entry.name)) yield p;
  }
}

let count = 0;
for (const file of walk(inDir)) {
  const rel = path.relative(inDir, file);
  const out = path.join(outDir, rel.replace(/\.gltf$/i, '.glb'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  // use gltf-transform optimize with meshopt + draco; skip texture compression (handled by KTX2)
  const args = [
    '-y', '@gltf-transform/cli', 'optimize', file, out,
    '--meshopt', '--draco', '--texture-compress', 'ktx2', '--texture-resize', '1024',
  ];
  const result = spawnSync('npx', args, { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error('Compression failed for', file);
    process.exitCode = result.status || 1;
  } else {
    count++;
  }
}

console.log(`Compressed ${count} glTF assets from ${inDir} -> ${outDir}`);


