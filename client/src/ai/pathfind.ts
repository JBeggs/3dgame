export type GridNav = { w: number; h: number; cells: Uint8Array };

type Node = { x: number; y: number; g: number; f: number; parent?: Node };

export function aStar(grid: GridNav, sx: number, sy: number, gx: number, gy: number): { x: number; y: number }[] {
  const w = grid.w, h = grid.h, cells = grid.cells;
  function walkable(x: number, y: number) {
    return x >= 0 && y >= 0 && x < w && y < h && cells[y * w + x] === 0;
  }
  if (!walkable(sx, sy) || !walkable(gx, gy)) return [];
  const open: Node[] = [];
  const key = (x: number, y: number) => `${x},${y}`;
  const openMap = new Map<string, Node>();
  const closed = new Set<string>();
  function heuristic(x: number, y: number) { return Math.abs(x - gx) + Math.abs(y - gy); }
  const start: Node = { x: sx, y: sy, g: 0, f: heuristic(sx, sy) };
  open.push(start); openMap.set(key(sx, sy), start);
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  while (open.length) {
    open.sort((a,b) => a.f - b.f);
    const curr = open.shift()!;
    openMap.delete(key(curr.x, curr.y));
    const k = key(curr.x, curr.y);
    if (closed.has(k)) continue;
    closed.add(k);
    if (curr.x === gx && curr.y === gy) {
      const path: { x:number;y:number }[] = [];
      let n: Node | undefined = curr;
      while (n) { path.push({ x: n.x, y: n.y }); n = n.parent; }
      path.reverse();
      return path;
    }
    for (const [dx, dy] of dirs) {
      const nx = curr.x + dx, ny = curr.y + dy;
      if (!walkable(nx, ny)) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const g = curr.g + 1;
      let node = openMap.get(nk);
      if (!node || g < node.g) {
        node = { x: nx, y: ny, g, f: g + heuristic(nx, ny), parent: curr };
        openMap.set(nk, node);
        open.push(node);
      }
    }
  }
  return [];
}


