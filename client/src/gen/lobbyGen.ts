// Simple lobby generator - just one room for testing movement/controls
import { Grid } from './mapGen';

export interface LobbyConfig {
  size: 'small' | 'medium' | 'large';
  theme: 'simple' | 'garden' | 'arena';
  hasEnemies: boolean;
  hasPickups: boolean;
}

export function generateLobby(config: LobbyConfig): Grid {
  const sizes = {
    small: { w: 16, h: 16 },
    medium: { w: 24, h: 24 },
    large: { w: 32, h: 32 }
  };

  const { w, h } = sizes[config.size];
  const cells = new Array(w * h).fill(1); // Start with all walls
  
  // Create a single open room that fills most of the space
  const roomSize = Math.floor(Math.min(w, h) * 0.8); // 80% of the smallest dimension  
  const startX = Math.floor((w - roomSize) / 2);
  const startY = Math.floor((h - roomSize) / 2);
  
  // Clear the room area - NO DOORS, just solid walls around a room
  for (let y = startY; y < startY + roomSize; y++) {
    for (let x = startX; x < startX + roomSize; x++) {
      if (x >= 0 && x < w && y >= 0 && y < h) {
        cells[y * w + x] = 0; // Open space
      }
    }
  }
  
  // Add theme-specific decorations
  if (config.theme === 'garden') {
    // Add some decorative "pillars" - small walls that don't block much
    const pillarPositions = [
      [startX + 2, startY + 2],
      [startX + roomSize - 3, startY + 2],
      [startX + 2, startY + roomSize - 3],
      [startX + roomSize - 3, startY + roomSize - 3]
    ];
    
    pillarPositions.forEach(([px, py]) => {
      if (px >= 0 && px < w && py >= 0 && py < h) {
        cells[py * w + px] = 1;
      }
    });
  } else if (config.theme === 'arena') {
    // Add circular boundary
    const centerX = startX + roomSize / 2;
    const centerY = startY + roomSize / 2;
    const radius = roomSize / 2 - 1;
    
    for (let y = startY; y < startY + roomSize; y++) {
      for (let x = startX; x < startX + roomSize; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > radius) {
          cells[y * w + x] = 1; // Wall
        }
      }
    }
  }

  return {
    w,
    h,
    cells,
    rooms: [{
      x: startX,
      y: startY,
      w: roomSize,
      h: roomSize,
      cx: startX + roomSize / 2,
      cy: startY + roomSize / 2,
      tag: 'lobby' as any
    }]
  };
}

export const defaultLobbyConfig: LobbyConfig = {
  size: 'medium', // Make it bigger for easier testing
  theme: 'simple', // Keep it simple for movement testing
  hasEnemies: false, // No enemies for now
  hasPickups: false  // No pickups for now - just test movement
};
