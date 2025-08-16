#!/usr/bin/env bash
set -euo pipefail
IN_DIR=${1:-client/public/assets}
OUT_DIR=${2:-dist-assets}
mkdir -p "$OUT_DIR"
shopt -s globstar nullglob
for f in "$IN_DIR"/**/**/*.{png,jpg,jpeg}; do
  rel=${f#${IN_DIR}/}
  out="$OUT_DIR/${rel%.*}.ktx2"
  mkdir -p "$(dirname "$out")"
  toktx --genmipmap --bcmp --clevel 5 --qlevel 128 "$out" "$f"
done
echo "Converted textures to KTX2 into $OUT_DIR"


