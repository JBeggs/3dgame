// Difficulty scaling system based on room depth/distance from start
import type { Room } from '../gen/mapGen';

export interface DifficultyModifiers {
  healthMultiplier: number;
  damageMultiplier: number;
  spawnCount: number;
  alertnessBonus: number;
  speedMultiplier: number;
}

export function calculateRoomDepth(rooms: Room[], targetRoom: Room): number {
  // Find the start room
  const startRoom = rooms.find(r => r.tag === 'start');
  if (!startRoom || startRoom === targetRoom) return 0;
  
  // Calculate Manhattan distance from start to target room
  const dx = Math.abs(targetRoom.cx - startRoom.cx);
  const dy = Math.abs(targetRoom.cy - startRoom.cy);
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Normalize to a depth scale (0-10)
  const maxDistance = Math.max(
    ...rooms.map(r => {
      const rdx = Math.abs(r.cx - startRoom.cx);
      const rdy = Math.abs(r.cy - startRoom.cy);
      return Math.sqrt(rdx * rdx + rdy * rdy);
    })
  );
  
  return Math.min(10, Math.floor((distance / maxDistance) * 10));
}

export function getDifficultyModifiers(roomDepth: number): DifficultyModifiers {
  // Base values at depth 0, scaling up exponentially but capped
  const depthRatio = Math.min(1, roomDepth / 10);
  
  return {
    // Health increases 50% to 250% based on depth
    healthMultiplier: 1 + (depthRatio * 1.5),
    
    // Damage increases 25% to 100% based on depth  
    damageMultiplier: 1 + (depthRatio * 0.75),
    
    // Spawn count: 1 at depth 0, up to 3 at max depth
    spawnCount: Math.max(1, Math.floor(1 + (depthRatio * 2))),
    
    // Enemies are more alert in deeper areas (0% to 50% bonus)
    alertnessBonus: depthRatio * 0.5,
    
    // Slight speed increase (10% to 30% faster)
    speedMultiplier: 1 + (depthRatio * 0.2)
  };
}

export function getScaledEnemyStats(baseHealth: number, baseDamage: number, roomDepth: number) {
  const modifiers = getDifficultyModifiers(roomDepth);
  
  return {
    health: Math.floor(baseHealth * modifiers.healthMultiplier),
    damage: Math.floor(baseDamage * modifiers.damageMultiplier),
    spawnCount: modifiers.spawnCount,
    alertnessBonus: modifiers.alertnessBonus,
    speedMultiplier: modifiers.speedMultiplier
  };
}

export function getDifficultyLevel(roomDepth: number): string {
  if (roomDepth === 0) return 'Safe';
  if (roomDepth <= 2) return 'Easy';
  if (roomDepth <= 4) return 'Normal';
  if (roomDepth <= 6) return 'Hard';
  if (roomDepth <= 8) return 'Very Hard';
  return 'Extreme';
}

