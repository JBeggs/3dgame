import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getProjectileManager, Projectile } from '../game/projectiles';
import { getPhysics } from '../game/physics';
import { playerHealth } from '../game/health';
import { getGrid } from '../game/worldState';
import { getAudio } from '../game/audio';
import { getParticleManager } from '../effects/ParticleSystem';
import { InstancedProjectiles } from './InstancedMeshes';

export function ProjectileRenderer() {
  const projectileManager = getProjectileManager();
  const [projectiles, setProjectiles] = React.useState<Projectile[]>([]);

  useFrame((_, deltaTime) => {
    // Update projectile manager
    projectileManager.update(deltaTime);
    
    // Check wall collisions and create impact particles
    const grid = getGrid();
    if (grid) {
      const cellSize = 1.2; // Same as MapScene
      const wallHits = projectileManager.checkWallCollisions(
        (x, y) => x >= 0 && y >= 0 && x < grid.w && y < grid.h && grid.cells[y * grid.w + x] === 0,
        cellSize
      );
      
      // Create impact particles for wall hits
      wallHits.forEach(projectile => {
        getParticleManager().createEffect(projectile.position, 'impact');
      });
    }
    
    // Check player collisions
    const playerBody = getPhysics().playerBody;
    const playerPos = new THREE.Vector3(playerBody.position.x, playerBody.position.y, playerBody.position.z);
    const hits = projectileManager.checkCollisions(playerPos, 0.5, 'player');
    
          for (const hit of hits) {
        playerHealth.damage(hit.damage);
        getAudio().play('hit');
        // Create blood particle effect on player hit
        getParticleManager().createEffect(hit.position, 'blood');
      }
    
    // Update React state
    setProjectiles([...projectileManager.getAllProjectiles()]);
  });

  // Convert projectiles to instanced format
  const instancedProjectileData = projectiles.map(projectile => {
    const visualData = projectileManager.getProjectileVisualData(projectile);
    
    return {
      position: [projectile.position.x, projectile.position.y, projectile.position.z] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number], // Could add rotation based on velocity
      scale: visualData.scale,
      color: visualData.color,
      emissive: visualData.emissive,
      emissiveIntensity: visualData.emissiveIntensity,
      type: `${projectile.type}-${projectile.ownerId || 'enemy'}`
    };
  });

  return <InstancedProjectiles projectiles={instancedProjectileData} />;
}
