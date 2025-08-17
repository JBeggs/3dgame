#!/usr/bin/env node
// Interactive glTF Transform helper
// - Asks for quality/size goals
// - Runs @gltf-transform/cli optimize (+ optional KTX2) with sensible presets
// - Produces an optimized GLB in-place or to a custom path

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

function existsSync(p) { try { fs.accessSync(p); return true; } catch { return false; } }

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf8', ...opts });
  if (res.error) throw res.error;
  return res;
}

function which(bin) {
  const res = run(process.platform === 'win32' ? 'where' : 'bash', process.platform === 'win32' ? [bin] : ['-lc', `command -v ${bin} || true`]);
  const out = (res.stdout || '').trim();
  return out.length > 0;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function promptInteractive(presetHint = 'balanced') {
  const rl = readline.createInterface({ input, output });
  const answers = {};

  // Input file
  let inputPath = process.argv[2] || await rl.question('Input model path (.glb/.gltf): ');
  inputPath = path.resolve(inputPath.trim());
  if (!existsSync(inputPath)) {
    rl.close();
    throw new Error(`Input file not found: ${inputPath}`);
  }
  answers.inputPath = inputPath;

  const stat = fs.statSync(inputPath);
  console.log(`Detected input size: ${formatBytes(stat.size)}`);

  // Quality preset
  const preset = (await rl.question('Quality preset [high/balanced/small] (default balanced): ')).trim().toLowerCase() || presetHint;
  answers.preset = ['high', 'small'].includes(preset) ? preset : 'balanced';

  // Draco + Meshopt toggles
  const useDraco = ((await rl.question('Enable Draco mesh compression? [Y/n]: ')).trim().toLowerCase() || 'y').startsWith('y');
  const useMeshopt = ((await rl.question('Enable Meshopt compression? [Y/n]: ')).trim().toLowerCase() || 'y').startsWith('y');
  answers.useDraco = useDraco; answers.useMeshopt = useMeshopt;

  // Simplification amount
  const defaultSimp = answers.preset === 'high' ? 0.5 : answers.preset === 'small' ? 5 : 2;
  const simplifyPct = parseFloat((await rl.question(`Geometry simplification percent (0-10, default ${defaultSimp}%): `)).trim() || String(defaultSimp));
  answers.simplifyError = Math.min(10, Math.max(0, simplifyPct)) / 100; // CLI expects fraction

  // Max texture size
  const defaultMaxTex = answers.preset === 'high' ? 2048 : answers.preset === 'small' ? 1024 : 1536;
  const maxTexStr = (await rl.question(`Max texture dimension (px, 0 = keep) [default ${defaultMaxTex}]: `)).trim();
  const maxTexture = Math.max(0, parseInt(maxTexStr || String(defaultMaxTex), 10) || 0);
  answers.maxTexture = maxTexture;

  // KTX2 compression
  const hasToktx = which('toktx');
  const askKTX = hasToktx ? ((await rl.question('Compress textures to KTX2 (BasisU)? [y/N]: ')).trim().toLowerCase() || 'n').startsWith('y') : false;
  answers.ktx2 = askKTX && hasToktx;
  if (!hasToktx && askKTX) console.warn('toktx not found; skipping KTX2 step.');
  let ktxMode = 'etc1s';
  if (answers.ktx2) {
    ktxMode = (await rl.question('KTX2 mode [etc1s/uastc] (default etc1s): ')).trim().toLowerCase() || 'etc1s';
  }
  answers.ktxMode = ktxMode;

  // Output path
  const outDefault = path.join(path.dirname(inputPath), path.parse(inputPath).name + '.optimized.glb');
  answers.outputPath = path.resolve((await rl.question(`Output path [default ${outDefault}]: `)).trim() || outDefault);
  rl.close();
  return answers;
}

function buildOptimizeArgs(a) {
  // gltf-transform v4 'optimize' options
  const args = ['@gltf-transform/cli', 'optimize', a.inputPath, a.tmpPath];
  // Compression method
  if (a.useDraco) {
    args.push('--compress', 'draco');
  } else if (a.useMeshopt) {
    args.push('--compress', 'meshopt', '--meshopt-level', 'high');
  } else {
    args.push('--compress', 'quantize');
  }
  // Simplification
  if (a.simplifyError > 0) {
    args.push('--simplify', 'true', '--simplify-error', String(a.simplifyError));
  } else {
    args.push('--simplify', 'false');
  }
  // Texture size
  if (a.maxTexture > 0) args.push('--texture-size', String(a.maxTexture));
  // Let optimize handle prune/weld/resample defaults
  // Texture compress is handled by separate ktx2 step
  args.push('--texture-compress', 'false');
  return args;
}

function invokeGltfTransform(argv) {
  // Prefer local/global binary if available
  if (which('gltf-transform')) {
    const r = run('gltf-transform', argv);
    if (r.status === 0) return r;
  }
  // Fallback 1: npx with package spec + bin name
  let r = run('npx', ['-y', '-p', '@gltf-transform/cli', 'gltf-transform', ...argv]);
  if (r.status === 0) return r;
  // Fallback 2: npx package runner style
  r = run('npx', ['-y', '@gltf-transform/cli', ...argv]);
  return r;
}

function runGltfTransformOptimize(a) {
  const args = buildOptimizeArgs(a);
  // Replace first two items with just arguments for the binary call
  // buildOptimizeArgs returns ['@gltf-transform/cli','optimize', input, tmp, ...]
  // We need ['optimize', input, tmp, ...]
  const argv = args.slice(1); 
  const res = invokeGltfTransform(argv);
  if (res.status !== 0) {
    // Emit the last few lines of stderr to aid debugging
    const stderr = (res.stderr || '').split('\n').slice(-10).join('\n');
    throw new Error(`optimize failed. Exit ${res.status}.\n${stderr}`);
  }
}

function runGltfTransformKTX2(a) {
  if (!a.ktx2) return false;
  // Use gltf-transform ktx2 wrapper, which requires toktx on PATH
  const kArgs = ['@gltf-transform/cli', 'ktx2', a.tmpPath, a.outputPath];
  if (a.ktxMode === 'uastc') {
    kArgs.push('--uastc', '1', '--uastc-quality', '1');
  } else {
    kArgs.push('--etc1s', '1', '--quality', '128', '--compression', '5');
  }
  const argv = kArgs.slice(1); // drop package spec, use bin args
  const res = invokeGltfTransform(argv);
  if (res.status !== 0) {
    console.warn('KTX2 step failed; writing optimize output instead.');
    fs.copyFileSync(a.tmpPath, a.outputPath);
    return false;
  }
  return true;
}

async function main() {
  try {
    const answers = await promptInteractive();
    const tmpPath = path.join(os.tmpdir(), `gltf-opt-${Date.now()}.glb`);
    const a = { ...answers, tmpPath };

    // Ensure output dir exists
    fs.mkdirSync(path.dirname(a.outputPath), { recursive: true });

    console.log('\n▶️  Running optimize ...');
    runGltfTransformOptimize(a);
    const pre = fs.statSync(a.inputPath).size;
    const post = fs.statSync(a.tmpPath).size;
    console.log(`   ${formatBytes(pre)} → ${formatBytes(post)} after optimize`);

    let finalPath = a.tmpPath;
    if (a.ktx2) {
      console.log('▶️  Running KTX2 texture compression ...');
      const ok = runGltfTransformKTX2(a);
      finalPath = ok ? a.outputPath : a.tmpPath;
    } else {
      fs.copyFileSync(a.tmpPath, a.outputPath);
      finalPath = a.outputPath;
    }

    // Report
    const finalSize = fs.statSync(finalPath).size;
    console.log(`\n✅ Done: ${finalPath}`);
    console.log(`   Size: ${formatBytes(pre)} → ${formatBytes(finalSize)} (${(((1 - finalSize / pre) * 100) || 0).toFixed(1)}% smaller)`);

    // Cleanup
    try { fs.unlinkSync(a.tmpPath); } catch {}
  } catch (err) {
    console.error('❌ Error:', err.message || err);
    process.exit(1);
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}


