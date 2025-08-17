import * as THREE from 'three';

export interface Projectile {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  damage: number;
  lifetime: number;
  maxLifetime: number;
  radius: number;
  type: 'arrow' | 'fireball' | 'spit' | 'magic' | 'ricochet' | 'explosive' | 'grenade';
  ownerId?: string; // To prevent self-damage
  
  // Advanced projectile properties
  bounces?: number;        // Remaining bounces for ricochet
  maxBounces?: number;     // Maximum bounces
  explosionRadius?: number; // For explosive projectiles
  explosionDamage?: number; // Explosion damage
  hasExploded?: boolean;   // Prevent double explosions
}

export class ProjectileManager {
  private projectiles: Map<string, Projectile> = new Map();
  private nextId = 0;

  createProjectile(
    startPos: THREE.Vector3,
    targetPos: THREE.Vector3,
    speed: number,
    damage: number,
    type: Projectile['type'] = 'arrow',
    ownerId?: string,
    options?: {
      bounces?: number;
      explosionRadius?: number;
      explosionDamage?: number;
    }
  ): string {
    const id = `proj_${this.nextId++}`;
    
    const direction = targetPos.clone().sub(startPos).normalize();
    const velocity = direction.multiplyScalar(speed);
    
    const projectile: Projectile = {
      id,
      position: startPos.clone(),
      velocity,
      damage,
      lifetime: 0,
      maxLifetime: type === 'explosive' ? 8 : 5, // Explosives live longer
      radius: type === 'explosive' ? 0.15 : 0.1,
      type,
      ownerId,
      
      // Advanced properties
      bounces: options?.bounces,
      maxBounces: options?.bounces,
      explosionRadius: options?.explosionRadius,
      explosionDamage: options?.explosionDamage || damage * 1.5,
      hasExploded: false
    };
    
    this.projectiles.set(id, projectile);
    return id;
  }

  update(deltaTime: number): void {
    const toRemove: string[] = [];
    
    for (const [id, projectile] of this.projectiles) {
      // Update position
      const movement = projectile.velocity.clone().multiplyScalar(deltaTime);
      projectile.position.add(movement);
      
      // Update lifetime
      projectile.lifetime += deltaTime;
      
      // Check if projectile should be removed
      if (projectile.lifetime >= projectile.maxLifetime) {
        toRemove.push(id);
        continue;
      }
      
      // Check bounds (remove if too far from origin)
      if (projectile.position.length() > 100) {
        toRemove.push(id);
        continue;
      }
    }
    
    // Remove expired projectiles
    for (const id of toRemove) {
      this.projectiles.delete(id);
    }
  }

  checkCollisions(
    targetPosition: THREE.Vector3,
    targetRadius: number,
    targetId?: string
  ): { projectile: Projectile; damage: number }[] {
    const hits: { projectile: Projectile; damage: number }[] = [];
    const toRemove: string[] = [];
    
    for (const [id, projectile] of this.projectiles) {
      // Skip if this projectile belongs to the target
      if (projectile.ownerId === targetId) continue;
      
      // Check collision
      const distance = projectile.position.distanceTo(targetPosition);
      if (distance <= projectile.radius + targetRadius) {
        hits.push({ projectile, damage: projectile.damage });
        toRemove.push(id);
      }
    }
    
    // Remove hit projectiles
    for (const id of toRemove) {
      this.projectiles.delete(id);
    }
    
    return hits;
  }

  checkWallCollisions(
    isWalkable: (x: number, y: number) => boolean,
    cellSize: number
  ): { hits: Projectile[]; explosions: Array<{ position: THREE.Vector3; radius: number; damage: number; ownerId?: string }> } {
    const toRemove: string[] = [];
    const wallHits: Projectile[] = [];
    const explosions: Array<{ position: THREE.Vector3; radius: number; damage: number; ownerId?: string }> = [];
    
    for (const [id, projectile] of this.projectiles) {
      const gridX = Math.floor(projectile.position.x / cellSize);
      const gridZ = Math.floor(projectile.position.z / cellSize);
      
      if (!isWalkable(gridX, gridZ)) {
        // Handle ricochet projectiles
        if (projectile.type === 'ricochet' && projectile.bounces && projectile.bounces > 0) {
          this.handleRicochet(projectile, gridX, gridZ, isWalkable, cellSize);
          continue; // Don't remove, just bounce
        }
        
        // Handle explosive projectiles
        if (projectile.type === 'explosive' && !projectile.hasExploded) {
          explosions.push({
            position: projectile.position.clone(),
            radius: projectile.explosionRadius || 2.0,
            damage: projectile.explosionDamage || projectile.damage * 1.5,
            ownerId: projectile.ownerId
          });
          projectile.hasExploded = true;
        }
        
        toRemove.push(id);
        wallHits.push({ ...projectile }); // Clone projectile data before removal
      }
    }
    
    // Remove projectiles that hit walls (non-ricochet or out of bounces)
    for (const id of toRemove) {
      this.projectiles.delete(id);
    }
    
    return { hits: wallHits, explosions };
  }

  private handleRicochet(
    projectile: Projectile, 
    gridX: number, 
    gridZ: number, 
    isWalkable: (x: number, y: number) => boolean,
    cellSize: number
  ): void {
    // Simple ricochet: reverse velocity component that hit the wall
    const pos = projectile.position;
    const vel = projectile.velocity;
    
    // Check which direction we hit the wall from
    const leftWalkable = isWalkable(gridX - 1, gridZ);
    const rightWalkable = isWalkable(gridX + 1, gridZ);
    const topWalkable = isWalkable(gridX, gridZ - 1);
    const bottomWalkable = isWalkable(gridX, gridZ + 1);
    
    // Reverse appropriate velocity component
    if (!leftWalkable && vel.x < 0) vel.x = -vel.x;
    if (!rightWalkable && vel.x > 0) vel.x = -vel.x;
    if (!topWalkable && vel.z < 0) vel.z = -vel.z;
    if (!bottomWalkable && vel.z > 0) vel.z = -vel.z;
    
    // Reduce velocity slightly and decrease bounces
    projectile.velocity.multiplyScalar(0.8); // 20% energy loss per bounce
    projectile.bounces! -= 1;
    
    // Move projectile away from wall
    const cellCenterX = (gridX + 0.5) * cellSize;
    const cellCenterZ = (gridZ + 0.5) * cellSize;
    const awayFromWall = pos.clone().sub(new THREE.Vector3(cellCenterX, pos.y, cellCenterZ)).normalize();
    projectile.position.add(awayFromWall.multiplyScalar(0.2));
  }

  getAllProjectiles(): Projectile[] {
    return Array.from(this.projectiles.values());
  }

  removeProjectile(id: string): void {
    this.projectiles.delete(id);
  }

  clear(): void {
    this.projectiles.clear();
  }

  getProjectileVisualData(projectile: Projectile) {
    // Player projectiles get special cyan/blue appearance
    if (projectile.ownerId === 'player') {
      return {
        color: '#00ffff',
        emissive: '#0088ff',
        emissiveIntensity: 0.6,
        scale: [0.15, 0.15, 0.15] as [number, number, number],
        geometry: 'sphere'
      };
    }
    
    switch (projectile.type) {
      case 'arrow':
        return {
          color: '#8b4513',
          emissive: '#000000',
          emissiveIntensity: 0,
          scale: [0.05, 0.05, 0.3] as [number, number, number],
          geometry: 'cylinder'
        };
      case 'fireball':
        return {
          color: '#ff4500',
          emissive: '#ff6600',
          emissiveIntensity: 0.5,
          scale: [0.15, 0.15, 0.15] as [number, number, number],
          geometry: 'sphere'
        };
      case 'spit':
        return {
          color: '#9acd32',
          emissive: '#556b2f',
          emissiveIntensity: 0.2,
          scale: [0.08, 0.08, 0.08] as [number, number, number],
          geometry: 'sphere'
        };
      case 'magic':
        return {
          color: '#9370db',
          emissive: '#8a2be2',
          emissiveIntensity: 0.4,
          scale: [0.12, 0.12, 0.12] as [number, number, number],
          geometry: 'sphere'
        };
      case 'ricochet':
        return {
          color: '#c0c0c0', // Metallic silver
          emissive: '#ffffff',
          emissiveIntensity: 0.3,
          scale: [0.08, 0.08, 0.08] as [number, number, number],
          geometry: 'sphere'
        };
      case 'explosive':
        return {
          color: '#ff6600', // Bright orange
          emissive: '#ffaa00',
          emissiveIntensity: 0.6,
          scale: [0.18, 0.18, 0.18] as [number, number, number],
          geometry: 'sphere'
        };
      default:
        return {
          color: '#ffffff',
          emissive: '#000000',
          emissiveIntensity: 0,
          scale: [0.1, 0.1, 0.1] as [number, number, number],
          geometry: 'sphere'
        };
    }
  }
}

// Global projectile manager instance
let projectileManager: ProjectileManager | null = null;

export function getProjectileManager(): ProjectileManager {
  if (!projectileManager) {
    projectileManager = new ProjectileManager();
  }
  return projectileManager;
}
