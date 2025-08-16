export type Cell = 0 | 1; // 0 floor, 1 wall
export type Room = { x: number; y: number; w: number; h: number; cx: number; cy: number };
export type Grid = { w: number; h: number; cells: Uint8Array; rooms: Room[] };

export function generateDungeon(seed = 1, w = 48, h = 36, roomTarget = 10): Grid {
  const rnd = mulberry32(seed);
  const cells = new Uint8Array(w * h).fill(1);
  const rooms: Room[] = [];

  function carveRoom(x: number, y: number, rw: number, rh: number) {
    for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) cells[j * w + i] = 0;
  }
  function rectsOverlap(a: Room, b: Room) {
    return !(a.x + a.w + 1 < b.x || b.x + b.w + 1 < a.x || a.y + a.h + 1 < b.y || b.y + b.h + 1 < a.y);
  }

  // Place non-overlapping rooms
  for (let attempts = 0; attempts < roomTarget * 20 && rooms.length < roomTarget; attempts++) {
    const rw = Math.floor(4 + rnd() * 8);
    const rh = Math.floor(4 + rnd() * 8);
    const x = Math.floor(1 + rnd() * (w - rw - 2));
    const y = Math.floor(1 + rnd() * (h - rh - 2));
    const cand: Room = { x, y, w: rw, h: rh, cx: Math.floor(x + rw / 2), cy: Math.floor(y + rh / 2) };
    if (rooms.some(r => rectsOverlap(r, cand))) continue;
    rooms.push(cand);
    carveRoom(x, y, rw, rh);
  }

  // Connect rooms with corridors (MST-ish via nearest neighbor)
  const connected = new Set<number>();
  let current = 0;
  connected.add(current);
  while (connected.size < rooms.length) {
    let bestA = -1, bestB = -1, bestD = Infinity;
    for (const a of connected) for (let b = 0; b < rooms.length; b++) if (!connected.has(b)) {
      const ra = rooms[a], rb = rooms[b];
      const dx = rb.cx - ra.cx, dy = rb.cy - ra.cy;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; bestA = a; bestB = b; }
    }
    carveCorridor(rooms[bestA], rooms[bestB]);
    connected.add(bestB);
  }

  // Add a few extra connections for loops
  for (let n = 0; n < Math.min(rooms.length, 4); n++) {
    const a = Math.floor(rnd() * rooms.length);
    const b = Math.floor(rnd() * rooms.length);
    if (a !== b) carveCorridor(rooms[a], rooms[b]);
  }

  function carveCorridor(a: Room, b: Room) {
    const x1 = a.cx, y1 = a.cy, x2 = b.cx, y2 = b.cy;
    // Randomly decide horizontal-first or vertical-first
    if (rnd() < 0.5) {
      const xs = Math.min(x1, x2), xe = Math.max(x1, x2);
      for (let x = xs; x <= xe; x++) cells[y1 * w + x] = 0;
      const ys = Math.min(y1, y2), ye = Math.max(y1, y2);
      for (let y = ys; y <= ye; y++) cells[y * w + x2] = 0;
    } else {
      const ys = Math.min(y1, y2), ye = Math.max(y1, y2);
      for (let y = ys; y <= ye; y++) cells[y * w + x1] = 0;
      const xs = Math.min(x1, x2), xe = Math.max(x1, x2);
      for (let x = xs; x <= xe; x++) cells[y2 * w + x] = 0;
    }
  }

  // Slightly widen corridors
  const widened = cells.slice();
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (cells[y * w + x] === 0) {
        widened[(y - 1) * w + x] = 0; widened[(y + 1) * w + x] = 0; widened[y * w + (x - 1)] = 0; widened[y * w + (x + 1)] = 0;
      }
    }
  }

  return { w, h, cells: widened, rooms };
}

export function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


