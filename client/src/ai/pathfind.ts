export type GridNav = { w: number; h: number; cells: Uint8Array };
export type NavPoint = { x: number; y: number };
export type NavPath = NavPoint[];

type Node = { x: number; y: number; g: number; f: number; parent?: Node };

// Enhanced A* with diagonal movement and better heuristics
export function aStar(grid: GridNav, sx: number, sy: number, gx: number, gy: number, allowDiagonal = true): NavPath {
  const w = grid.w, h = grid.h, cells = grid.cells;
  
  function walkable(x: number, y: number) {
    return x >= 0 && y >= 0 && x < w && y < h && cells[y * w + x] === 0;
  }
  
  if (!walkable(sx, sy) || !walkable(gx, gy)) return [];
  
  const open: Node[] = [];
  const key = (x: number, y: number) => `${x},${y}`;
  const openMap = new Map<string, Node>();
  const closed = new Set<string>();
  
  // Better heuristic for diagonal movement
  function heuristic(x: number, y: number) {
    const dx = Math.abs(x - gx);
    const dy = Math.abs(y - gy);
    return allowDiagonal ? Math.max(dx, dy) + (Math.sqrt(2) - 1) * Math.min(dx, dy) : dx + dy;
  }
  
  const start: Node = { x: sx, y: sy, g: 0, f: heuristic(sx, sy) };
  open.push(start);
  openMap.set(key(sx, sy), start);
  
  // Movement directions: 4-way or 8-way
  const dirs = allowDiagonal 
    ? [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]
    : [[1,0],[-1,0],[0,1],[0,-1]];
  
  while (open.length) {
    // Use binary heap for better performance
    open.sort((a, b) => a.f - b.f);
    const curr = open.shift()!;
    openMap.delete(key(curr.x, curr.y));
    
    const k = key(curr.x, curr.y);
    if (closed.has(k)) continue;
    closed.add(k);
    
    if (curr.x === gx && curr.y === gy) {
      const path: NavPath = [];
      let n: Node | undefined = curr;
      while (n) { 
        path.push({ x: n.x, y: n.y }); 
        n = n.parent; 
      }
      path.reverse();
      return smoothPath(grid, path);
    }
    
    for (const [dx, dy] of dirs) {
      const nx = curr.x + dx, ny = curr.y + dy;
      if (!walkable(nx, ny)) continue;
      
      // Check diagonal movement validity
      if (allowDiagonal && Math.abs(dx) + Math.abs(dy) === 2) {
        if (!walkable(curr.x + dx, curr.y) || !walkable(curr.x, curr.y + dy)) continue;
      }
      
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      
      const moveCost = (Math.abs(dx) + Math.abs(dy) === 2) ? Math.sqrt(2) : 1;
      const g = curr.g + moveCost;
      
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

// Path smoothing to reduce unnecessary waypoints
function smoothPath(grid: GridNav, path: NavPath): NavPath {
  if (path.length <= 2) return path;
  
  const smoothed: NavPath = [path[0]];
  let current = 0;
  
  while (current < path.length - 1) {
    let farthest = current + 1;
    
    // Find the farthest point we can reach directly
    for (let i = current + 2; i < path.length; i++) {
      if (hasLineOfSight(grid, path[current], path[i])) {
        farthest = i;
      } else {
        break;
      }
    }
    
    smoothed.push(path[farthest]);
    current = farthest;
  }
  
  return smoothed;
}

// Line of sight check for path smoothing
function hasLineOfSight(grid: GridNav, start: NavPoint, end: NavPoint): boolean {
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const sx = start.x < end.x ? 1 : -1;
  const sy = start.y < end.y ? 1 : -1;
  let err = dx - dy;
  
  let x = start.x;
  let y = start.y;
  
  while (true) {
    if (x < 0 || y < 0 || x >= grid.w || y >= grid.h || grid.cells[y * grid.w + x] === 1) {
      return false;
    }
    
    if (x === end.x && y === end.y) break;
    
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  
  return true;
}

// Find nearest walkable position to a target
export function findNearestWalkable(grid: GridNav, x: number, y: number, maxRadius = 10): NavPoint | null {
  const w = grid.w, h = grid.h, cells = grid.cells;
  
  function walkable(px: number, py: number) {
    return px >= 0 && py >= 0 && px < w && py < h && cells[py * w + px] === 0;
  }
  
  if (walkable(x, y)) return { x, y };
  
  // Spiral search outward
  for (let r = 1; r <= maxRadius; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) === r || Math.abs(dy) === r) {
          const nx = x + dx;
          const ny = y + dy;
          if (walkable(nx, ny)) {
            return { x: nx, y: ny };
          }
        }
      }
    }
  }
  
  return null;
}

// Get all walkable neighbors of a position
export function getWalkableNeighbors(grid: GridNav, x: number, y: number, includeDiagonal = true): NavPoint[] {
  const neighbors: NavPoint[] = [];
  const dirs = includeDiagonal 
    ? [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]
    : [[1,0],[-1,0],[0,1],[0,-1]];
  
  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < grid.w && ny < grid.h && grid.cells[ny * grid.w + nx] === 0) {
      neighbors.push({ x: nx, y: ny });
    }
  }
  
  return neighbors;
}


