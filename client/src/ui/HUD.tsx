import React, { useState, useEffect } from 'react';
import { useInventory } from '../game/inventory';
import { usePlayerHealth } from '../game/health';
import { getCoinTarget } from '../game/config';
import { getPhysics } from '../game/physics';
import { getGrid } from '../game/worldState';
import { calculateRoomDepth, getDifficultyLevel } from '../game/difficultyScaling';

export function HUD() {
  const inv = useInventory();
  const hp = usePlayerHealth();
  const [msg, setMsg] = useState('');
  const [currentDifficulty, setCurrentDifficulty] = useState<string>('Safe');
  const [roomDepth, setRoomDepth] = useState<number>(0);

  // Update difficulty based on player position
  useEffect(() => {
    const updateDifficulty = () => {
      const grid = getGrid();
      if (!grid) return;

      const playerBody = getPhysics().playerBody;
      const cellSize = 1.2; // Same as MapScene
      
      // Convert world position to grid position
      const gridX = Math.floor(playerBody.position.x / cellSize);
      const gridY = Math.floor(playerBody.position.z / cellSize);
      
      // Find which room the player is in
      const currentRoom = grid.rooms.find(r => 
        gridX >= r.x && gridX < r.x + r.w &&
        gridY >= r.y && gridY < r.y + r.h
      );
      
      if (currentRoom) {
        const depth = calculateRoomDepth(grid.rooms, currentRoom);
        const difficultyName = getDifficultyLevel(depth);
        setCurrentDifficulty(difficultyName);
        setRoomDepth(depth);
      }
    };

    const interval = setInterval(updateDifficulty, 500); // Update twice per second
    return () => clearInterval(interval);
  }, []);
  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Safe': return '#4ade80';        // Green
      case 'Easy': return '#22d3ee';        // Cyan
      case 'Normal': return '#fbbf24';      // Amber
      case 'Hard': return '#f97316';        // Orange
      case 'Very Hard': return '#ef4444';   // Red
      case 'Extreme': return '#dc2626';     // Dark Red
      default: return '#9ca3af';            // Gray
    }
  };

  return (
    <div style={{ position: 'absolute', top: 10, left: 10, color: '#fff', fontFamily: 'monospace' }}>
      <div>HP: {Math.round(hp.hp)} / {hp.max}</div>
      <div>Keys: {inv.items.key} | Coins: {inv.items.coin}/{getCoinTarget()} ({Math.max(0, getCoinTarget() - inv.items.coin)} left)</div>
      <div style={{ color: getDifficultyColor(currentDifficulty) }}>
        Area: {currentDifficulty} (Depth {roomDepth})
      </div>
      {msg && <div>{msg}</div>}
    </div>
  );
}


