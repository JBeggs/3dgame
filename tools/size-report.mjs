#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(process.argv[2] || path.join(process.cwd(), 'client/public/assets'));

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

function fmt(n) { return (n / 1024).toFixed(1) + ' KB'; }

let total = 0, totalGz = 0;
const rows = [];
for (const file of fs.existsSync(root) ? walk(root) : []) {
  const buf = fs.readFileSync(file);
  const gz = zlib.gzipSync(buf);
  const rel = path.relative(root, file);
  rows.push({ file: rel, size: buf.length, gzip: gz.length });
  total += buf.length; totalGz += gz.length;
}

rows.sort((a,b) => b.gzip - a.gzip);
console.log(`Asset size report for ${root}`);
for (const r of rows) console.log(`${r.file.padEnd(40)} ${fmt(r.size).padStart(8)} | gz ${fmt(r.gzip).padStart(8)}`);
console.log('—'.repeat(64));
console.log(`TOTAL`.padEnd(40), fmt(total).padStart(8), '| gz', fmt(totalGz).padStart(8));


