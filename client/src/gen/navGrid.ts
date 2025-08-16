import { Grid, Room } from './mapGen';
import { GridNav, NavPoint, getWalkableNeighbors } from '../ai/pathfind';

export interface NavGrid extends GridNav {
  rooms: Room[];
  roomConnections: Map<number, number[]>;
  chokePoints: NavPoint[];
  safeZones: NavPoint[];
}

export interface NavMesh {
  nodes: NavNode[];
  connections: NavConnection[];
}

export interface NavNode {
  id: number;
  position: NavPoint;
  roomId?: number;
  type: 'room' | 'corridor' | 'junction';
  radius: number;
}

export interface NavConnection {
  from: number;
  to: number;
  cost: number;
  type: 'normal' | 'door' | 'narrow';
}

// Enhanced nav grid with additional pathfinding data
export function createNavGrid(grid: Grid): NavGrid {
  const navGrid: NavGrid = {
    w: grid.w,
    h: grid.h,
    cells: grid.cells,
    rooms: grid.rooms,
    roomConnections: new Map(),
    chokePoints: [],
    safeZones: []
  };

  // Analyze room connections
  analyzeRoomConnections(navGrid);
  
  // Find choke points (narrow passages)
  findChokePoints(navGrid);
  
  // Identify safe zones (large open areas)
  findSafeZones(navGrid);

  return navGrid;
}

// Generate a simplified navmesh for high-level pathfinding
export function generateNavMesh(navGrid: NavGrid): NavMesh {
  const nodes: NavNode[] = [];
  const connections: NavConnection[] = [];
  let nodeId = 0;

  // Create nodes for room centers
  for (let i = 0; i < navGrid.rooms.length; i++) {
    const room = navGrid.rooms[i];
    nodes.push({
      id: nodeId++,
      position: { x: room.cx, y: room.cy },
      roomId: i,
      type: 'room',
      radius: Math.min(room.w, room.h) / 2
    });
  }

  // Create nodes for major junctions and choke points
  for (const choke of navGrid.chokePoints) {
    nodes.push({
      id: nodeId++,
      position: choke,
      type: 'junction',
      radius: 1
    });
  }

  // Create connections between nearby nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];
      const distance = Math.hypot(nodeA.position.x - nodeB.position.x, nodeA.position.y - nodeB.position.y);
      
      // Connect if within reasonable distance and have line of sight
      if (distance < 15 && hasLineOfSight(navGrid, nodeA.position, nodeB.position)) {
        const cost = distance;
        const type = isNarrowPath(navGrid, nodeA.position, nodeB.position) ? 'narrow' : 'normal';
        
        connections.push({ from: nodeA.id, to: nodeB.id, cost, type });
        connections.push({ from: nodeB.id, to: nodeA.id, cost, type });
      }
    }
  }

  return { nodes, connections };
}

function analyzeRoomConnections(navGrid: NavGrid) {
  const { rooms, w, h, cells } = navGrid;
  
  for (let i = 0; i < rooms.length; i++) {
    const connections: number[] = [];
    const roomA = rooms[i];
    
    for (let j = 0; j < rooms.length; j++) {
      if (i === j) continue;
      
      const roomB = rooms[j];
      
      // Check if rooms are connected by tracing paths
      if (areRoomsConnected(navGrid, roomA, roomB)) {
        connections.push(j);
      }
    }
    
    navGrid.roomConnections.set(i, connections);
  }
}

function areRoomsConnected(navGrid: NavGrid, roomA: Room, roomB: Room): boolean {
  // Simple flood fill to check connectivity
  const visited = new Set<string>();
  const queue: NavPoint[] = [{ x: roomA.cx, y: roomA.cy }];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.x},${current.y}`;
    
    if (visited.has(key)) continue;
    visited.add(key);
    
    // Check if we reached room B
    if (current.x >= roomB.x && current.x < roomB.x + roomB.w &&
        current.y >= roomB.y && current.y < roomB.y + roomB.h) {
      return true;
    }
    
    // Add walkable neighbors
    const neighbors = getWalkableNeighbors(navGrid, current.x, current.y, false);
    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      if (!visited.has(neighborKey)) {
        queue.push(neighbor);
      }
    }
    
    // Limit search to prevent infinite loops
    if (visited.size > 500) break;
  }
  
  return false;
}

function findChokePoints(navGrid: NavGrid) {
  const { w, h, cells } = navGrid;
  
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (cells[y * w + x] !== 0) continue; // Not walkable
      
      // Count walkable neighbors
      const neighbors = getWalkableNeighbors(navGrid, x, y, false);
      
      // A choke point has exactly 2 walkable neighbors (corridor)
      // or is surrounded by walls on most sides
      if (neighbors.length === 2) {
        const [n1, n2] = neighbors;
        // Check if neighbors are opposite (straight corridor)
        const dx1 = n1.x - x, dy1 = n1.y - y;
        const dx2 = n2.x - x, dy2 = n2.y - y;
        
        if ((dx1 === -dx2 && dy1 === -dy2)) {
          navGrid.chokePoints.push({ x, y });
        }
      }
    }
  }
}

function findSafeZones(navGrid: NavGrid) {
  const { rooms } = navGrid;
  
  // Safe zones are centers of large rooms
  for (const room of rooms) {
    if (room.w >= 6 && room.h >= 6) {
      navGrid.safeZones.push({ x: room.cx, y: room.cy });
    }
  }
}

function hasLineOfSight(navGrid: GridNav, start: NavPoint, end: NavPoint): boolean {
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const sx = start.x < end.x ? 1 : -1;
  const sy = start.y < end.y ? 1 : -1;
  let err = dx - dy;
  
  let x = start.x;
  let y = start.y;
  
  while (true) {
    if (x < 0 || y < 0 || x >= navGrid.w || y >= navGrid.h || navGrid.cells[y * navGrid.w + x] === 1) {
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

function isNarrowPath(navGrid: GridNav, start: NavPoint, end: NavPoint): boolean {
  // Check if the path between two points goes through narrow areas
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const sx = start.x < end.x ? 1 : -1;
  const sy = start.y < end.y ? 1 : -1;
  let err = dx - dy;
  
  let x = start.x;
  let y = start.y;
  let narrowCount = 0;
  let totalSteps = 0;
  
  while (true) {
    if (x === end.x && y === end.y) break;
    
    // Count walkable neighbors at this position
    const neighbors = getWalkableNeighbors(navGrid, x, y, false);
    if (neighbors.length <= 2) {
      narrowCount++;
    }
    totalSteps++;
    
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
  
  return totalSteps > 0 && (narrowCount / totalSteps) > 0.5;
}

// Export nav data for debugging or external tools
export function exportNavData(navGrid: NavGrid): string {
  const data = {
    dimensions: { w: navGrid.w, h: navGrid.h },
    rooms: navGrid.rooms.map((r, i) => ({
      id: i,
      bounds: { x: r.x, y: r.y, w: r.w, h: r.h },
      center: { x: r.cx, y: r.cy },
      tag: r.tag,
      connections: navGrid.roomConnections.get(i) || []
    })),
    chokePoints: navGrid.chokePoints,
    safeZones: navGrid.safeZones,
    walkableCells: Array.from(navGrid.cells).map((cell, i) => ({
      x: i % navGrid.w,
      y: Math.floor(i / navGrid.w),
      walkable: cell === 0
    })).filter(cell => cell.walkable)
  };
  
  return JSON.stringify(data, null, 2);
}
