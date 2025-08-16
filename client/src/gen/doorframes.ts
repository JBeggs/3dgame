import { Grid, Room } from './mapGen';

export interface Doorway {
  x: number;
  y: number;
  direction: 'north' | 'south' | 'east' | 'west';
  roomIndex: number;
  room: Room;
}

/**
 * Find doorway positions where corridors connect to rooms
 */
export function findDoorways(grid: Grid): Doorway[] {
  const { w, h, cells, rooms } = grid;
  const doorways: Doorway[] = [];

  for (let roomIndex = 0; roomIndex < rooms.length; roomIndex++) {
    const room = rooms[roomIndex];
    
    // Check all positions on the room boundary
    for (let x = room.x; x < room.x + room.w; x++) {
      for (let y = room.y; y < room.y + room.h; y++) {
        // Skip interior cells
        const onBoundary = x === room.x || x === room.x + room.w - 1 || 
                          y === room.y || y === room.y + room.h - 1;
        if (!onBoundary) continue;
        
        const idx = y * w + x;
        if (cells[idx] !== 0) continue; // Not floor
        
        // Check for corridor connections in each direction
        const directions = [
          { name: 'north', dx: 0, dy: -1 },
          { name: 'south', dx: 0, dy: 1 },
          { name: 'east', dx: 1, dy: 0 },
          { name: 'west', dx: -1, dy: 0 }
        ] as const;
        
        for (const dir of directions) {
          const nx = x + dir.dx;
          const ny = y + dir.dy;
          
          // Check bounds
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          
          const nIdx = ny * w + nx;
          
          // If there's a floor outside the room (corridor), this is a doorway
          if (cells[nIdx] === 0 && !isInsideRoom(nx, ny, room)) {
            // Avoid duplicate doorways by checking if we already have one nearby
            const nearby = doorways.some(d => 
              Math.abs(d.x - x) <= 1 && Math.abs(d.y - y) <= 1 && 
              d.roomIndex === roomIndex && d.direction === dir.name
            );
            
            if (!nearby) {
              doorways.push({
                x,
                y,
                direction: dir.name,
                roomIndex,
                room
              });
            }
          }
        }
      }
    }
  }

  return doorways;
}

function isInsideRoom(x: number, y: number, room: Room): boolean {
  return x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h;
}

/**
 * Get doorframe style based on room type
 */
export function getDoorframeStyle(room: Room) {
  switch (room.tag) {
    case 'start':
      return {
        color: '#4ade80',      // Green
        emissive: '#22c55e',
        emissiveIntensity: 0.3,
        height: 1.8,
        width: 1.4,
        thickness: 0.15
      };
    case 'treasure':
      return {
        color: '#fbbf24',      // Gold
        emissive: '#f59e0b',
        emissiveIntensity: 0.4,
        height: 2.0,
        width: 1.6,
        thickness: 0.2
      };
    case 'lair':
      return {
        color: '#dc2626',      // Red
        emissive: '#991b1b',
        emissiveIntensity: 0.5,
        height: 1.9,
        width: 1.5,
        thickness: 0.18
      };
    default: // 'normal'
      return {
        color: '#6b7280',      // Gray
        emissive: '#374151',
        emissiveIntensity: 0.2,
        height: 1.6,
        width: 1.2,
        thickness: 0.12
      };
  }
}
