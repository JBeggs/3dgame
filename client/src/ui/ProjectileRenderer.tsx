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
import { connect } from '../net/net';

export function ProjectileRenderer() {
  const projectileManager = getProjectileManager();
  const [projectiles, setProjectiles] = React.useState<Projectile[]>([]);
  const prevProjectileIds = useRef(new Set<string>());

  useFrame((_, deltaTime) => {
    // Update projectile manager
    projectileManager.update(deltaTime);
    
    // Check wall collisions and handle advanced projectile effects
    const grid = getGrid();
    if (grid) {
      const cellSize = 1.2; // Same as MapScene
      const { hits: wallHits, explosions } = projectileManager.checkWallCollisions(
        (x, y) => x >= 0 && y >= 0 && x < grid.w && y < grid.h && grid.cells[y * grid.w + x] === 0,
        cellSize
      );
      
      // Create impact particles for regular wall hits
      wallHits.forEach(projectile => {
        if (projectile.type === 'ricochet') {
          getParticleManager().createEffect(projectile.position, 'sparks');
          getAudio().play('ricochet');
        } else if (projectile.type !== 'explosive') { // Explosives handle their own effects
          getParticleManager().createEffect(projectile.position, 'impact');
        }
      });
      
      // Handle explosions
      explosions.forEach(explosion => {
        getParticleManager().createEffect(explosion.position, 'explosion');
        getAudio().play('explosion');
        
        // Apply area damage to nearby enemies and player
        handleExplosionDamage(explosion);
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
    const currentProjectiles = [...projectileManager.getAllProjectiles()];
    setProjectiles(currentProjectiles);
    
    // Detect destroyed projectiles for network sync
    const currentIds = new Set(currentProjectiles.map(p => p.id));
    const net = connect();
    
    // Find projectiles that were removed since last frame
    for (const prevId of prevProjectileIds.current) {
      if (!currentIds.has(prevId)) {
        // This projectile was destroyed, notify network
        net.sendProjectileDestroy(prevId);
      }
    }
    
    // Update previous set for next frame
    prevProjectileIds.current = currentIds;
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

// Handle explosion area damage
function handleExplosionDamage(explosion: { position: THREE.Vector3; radius: number; damage: number; ownerId?: string }) {
  const playerBody = getPhysics().playerBody;
  const playerPos = new THREE.Vector3(playerBody.position.x, playerBody.position.y, playerBody.position.z);
  
  // Check player damage (if not from player)
  if (explosion.ownerId !== 'player') {
    const playerDistance = explosion.position.distanceTo(playerPos);
    if (playerDistance <= explosion.radius) {
      const falloff = 1 - (playerDistance / explosion.radius);
      const damage = explosion.damage * falloff;
      playerHealth.damage(damage);
      getParticleManager().createEffect(playerPos, 'blood');
    }
  }
  
  // TODO: Add enemy damage when we have a centralized enemy system
  console.log(`💥 Explosion at ${explosion.position.x.toFixed(1)}, ${explosion.position.z.toFixed(1)} - Radius: ${explosion.radius}, Damage: ${explosion.damage}`);
}
