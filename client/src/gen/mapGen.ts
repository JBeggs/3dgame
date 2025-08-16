export type Cell = 0 | 1; // 0 floor, 1 wall
export type Grid = { w: number; h: number; cells: Uint8Array };

export function generateBSP(seed = 1, w = 40, h = 40): Grid {
  const rnd = mulberry32(seed);
  const cells = new Uint8Array(w * h).fill(1);

  function carveRoom(x: number, y: number, rw: number, rh: number) {
    for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) cells[j * w + i] = 0;
  }

  // simple split: two rooms connected by a corridor
  const r1 = { x: 2, y: 2, w: Math.floor(w * 0.4), h: Math.floor(h * 0.4) };
  const r2 = { x: w - Math.floor(w * 0.4) - 2, y: h - Math.floor(h * 0.4) - 2, w: Math.floor(w * 0.4), h: Math.floor(h * 0.4) };
  carveRoom(r1.x, r1.y, r1.w, r1.h);
  carveRoom(r2.x, r2.y, r2.w, r2.h);
  // corridor
  for (let i = Math.min(r1.x + r1.w, r2.x); i <= Math.max(r1.x + r1.w, r2.x); i++) cells[(r1.y + Math.floor(r1.h / 2)) * w + i] = 0;
  for (let j = Math.min(r1.y + Math.floor(r1.h / 2), r2.y + Math.floor(r2.h / 2)); j <= Math.max(r1.y + Math.floor(r1.h / 2), r2.y + Math.floor(r2.h / 2)); j++) cells[j * w + r2.x] = 0;

  return { w, h, cells };
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


