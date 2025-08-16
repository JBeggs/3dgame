import * as THREE from 'three';

export interface Projectile {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  damage: number;
  lifetime: number;
  maxLifetime: number;
  radius: number;
  type: 'arrow' | 'fireball' | 'spit' | 'magic';
  ownerId?: string; // To prevent self-damage
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
    ownerId?: string
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
      maxLifetime: 5, // 5 seconds max flight time
      radius: 0.1,
      type,
      ownerId
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
  ): void {
    const toRemove: string[] = [];
    
    for (const [id, projectile] of this.projectiles) {
      const gridX = Math.floor(projectile.position.x / cellSize);
      const gridZ = Math.floor(projectile.position.z / cellSize);
      
      if (!isWalkable(gridX, gridZ)) {
        toRemove.push(id);
      }
    }
    
    // Remove projectiles that hit walls
    for (const id of toRemove) {
      this.projectiles.delete(id);
    }
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
