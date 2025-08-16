import { GridNav, aStar, findNearestWalkable, NavPath, NavPoint } from './pathfind';
import * as THREE from 'three';

export type AIState = 'idle' | 'patrol' | 'chase' | 'attack' | 'flee' | 'search';

export interface AIBehavior {
  state: AIState;
  target?: THREE.Vector3;
  path: NavPath;
  pathIndex: number;
  lastPathUpdate: number;
  patrolPoints: NavPoint[];
  currentPatrolIndex: number;
  alertLevel: number;
  lastPlayerSeen?: THREE.Vector3;
  searchTimer: number;
  attackCooldown: number;
}

export class AIController {
  private grid: GridNav;
  private cellSize: number;
  private behavior: AIBehavior;
  private position: THREE.Vector3;
  private playerPosition: THREE.Vector3;
  
  constructor(grid: GridNav, cellSize: number, startPos: THREE.Vector3) {
    this.grid = grid;
    this.cellSize = cellSize;
    this.position = startPos.clone();
    this.playerPosition = new THREE.Vector3();
    
    this.behavior = {
      state: 'idle',
      path: [],
      pathIndex: 0,
      lastPathUpdate: 0,
      patrolPoints: this.generatePatrolPoints(),
      currentPatrolIndex: 0,
      alertLevel: 0,
      searchTimer: 0,
      attackCooldown: 0
    };
  }
  
  private generatePatrolPoints(): NavPoint[] {
    const points: NavPoint[] = [];
    const centerX = Math.floor(this.position.x / this.cellSize);
    const centerY = Math.floor(this.position.z / this.cellSize);
    
    // Generate 3-5 patrol points in a radius around spawn
    const numPoints = 3 + Math.floor(Math.random() * 3);
    const radius = 5 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      const walkable = findNearestWalkable(this.grid, Math.floor(x), Math.floor(y));
      if (walkable) {
        points.push(walkable);
      }
    }
    
    return points.length > 0 ? points : [{ x: centerX, y: centerY }];
  }
  
  update(deltaTime: number, playerPos: THREE.Vector3): THREE.Vector3 {
    this.playerPosition.copy(playerPos);
    const now = Date.now();
    
    // Update timers
    this.behavior.searchTimer = Math.max(0, this.behavior.searchTimer - deltaTime);
    this.behavior.attackCooldown = Math.max(0, this.behavior.attackCooldown - deltaTime);
    
    // Check line of sight to player
    const canSeePlayer = this.hasLineOfSightToPlayer();
    const distanceToPlayer = this.position.distanceTo(playerPos);
    
    // State transitions
    this.updateState(canSeePlayer, distanceToPlayer);
    
    // Execute current behavior
    const moveVector = this.executeBehavior(deltaTime, now);
    
    // Update alert level
    if (canSeePlayer && distanceToPlayer < 8) {
      this.behavior.alertLevel = Math.min(1, this.behavior.alertLevel + deltaTime * 0.5);
      this.behavior.lastPlayerSeen = playerPos.clone();
    } else {
      this.behavior.alertLevel = Math.max(0, this.behavior.alertLevel - deltaTime * 0.2);
    }
    
    return moveVector;
  }
  
  private updateState(canSeePlayer: boolean, distanceToPlayer: number) {
    switch (this.behavior.state) {
      case 'idle':
      case 'patrol':
        if (canSeePlayer && distanceToPlayer < 6) {
          this.behavior.state = 'chase';
          this.behavior.path = [];
        } else if (this.behavior.state === 'idle' && Math.random() < 0.01) {
          this.behavior.state = 'patrol';
        }
        break;
        
      case 'chase':
        if (!canSeePlayer && distanceToPlayer > 8) {
          this.behavior.state = 'search';
          this.behavior.searchTimer = 5000; // 5 seconds
        } else if (distanceToPlayer < 1.5 && this.behavior.attackCooldown <= 0) {
          this.behavior.state = 'attack';
          this.behavior.attackCooldown = 1000; // 1 second cooldown
        }
        break;
        
      case 'search':
        if (canSeePlayer) {
          this.behavior.state = 'chase';
        } else if (this.behavior.searchTimer <= 0) {
          this.behavior.state = 'patrol';
        }
        break;
        
      case 'attack':
        if (distanceToPlayer > 2) {
          this.behavior.state = 'chase';
        } else if (this.behavior.attackCooldown <= 0) {
          this.behavior.state = 'chase';
        }
        break;
    }
  }
  
  private executeBehavior(deltaTime: number, now: number): THREE.Vector3 {
    const moveVector = new THREE.Vector3();
    
    switch (this.behavior.state) {
      case 'idle':
        // Occasionally look around
        if (Math.random() < 0.005) {
          const randomDir = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            0,
            (Math.random() - 0.5) * 0.1
          );
          return randomDir;
        }
        break;
        
      case 'patrol':
        return this.executePatrol(now);
        
      case 'chase':
        return this.executeChase(now);
        
      case 'search':
        return this.executeSearch(now);
        
      case 'attack':
        // Stop moving during attack
        return new THREE.Vector3();
    }
    
    return moveVector;
  }
  
  private executePatrol(now: number): THREE.Vector3 {
    if (this.behavior.patrolPoints.length === 0) return new THREE.Vector3();
    
    const target = this.behavior.patrolPoints[this.behavior.currentPatrolIndex];
    const targetWorld = new THREE.Vector3(
      (target.x + 0.5) * this.cellSize,
      this.position.y,
      (target.y + 0.5) * this.cellSize
    );
    
    const distance = this.position.distanceTo(targetWorld);
    
    if (distance < 0.5) {
      // Reached patrol point, move to next
      this.behavior.currentPatrolIndex = (this.behavior.currentPatrolIndex + 1) % this.behavior.patrolPoints.length;
      this.behavior.path = [];
      return new THREE.Vector3();
    }
    
    return this.moveAlongPath(targetWorld, now, 1.0);
  }
  
  private executeChase(now: number): THREE.Vector3 {
    return this.moveAlongPath(this.playerPosition, now, 2.0);
  }
  
  private executeSearch(now: number): THREE.Vector3 {
    if (!this.behavior.lastPlayerSeen) return new THREE.Vector3();
    
    return this.moveAlongPath(this.behavior.lastPlayerSeen, now, 1.5);
  }
  
  private moveAlongPath(target: THREE.Vector3, now: number, speed: number): THREE.Vector3 {
    // Update path if needed
    if (this.behavior.path.length === 0 || now - this.behavior.lastPathUpdate > 500) {
      this.updatePath(target);
      this.behavior.lastPathUpdate = now;
    }
    
    if (this.behavior.path.length <= 1) return new THREE.Vector3();
    
    // Get current target waypoint
    const currentWaypoint = this.behavior.path[this.behavior.pathIndex];
    const waypointWorld = new THREE.Vector3(
      (currentWaypoint.x + 0.5) * this.cellSize,
      this.position.y,
      (currentWaypoint.y + 0.5) * this.cellSize
    );
    
    const distanceToWaypoint = this.position.distanceTo(waypointWorld);
    
    // Check if reached current waypoint
    if (distanceToWaypoint < 0.3) {
      this.behavior.pathIndex++;
      if (this.behavior.pathIndex >= this.behavior.path.length) {
        this.behavior.path = [];
        this.behavior.pathIndex = 0;
        return new THREE.Vector3();
      }
    }
    
    // Move toward current waypoint
    const direction = waypointWorld.clone().sub(this.position).normalize();
    return direction.multiplyScalar(speed);
  }
  
  private updatePath(target: THREE.Vector3) {
    const startX = Math.floor(this.position.x / this.cellSize);
    const startY = Math.floor(this.position.z / this.cellSize);
    const endX = Math.floor(target.x / this.cellSize);
    const endY = Math.floor(target.z / this.cellSize);
    
    const path = aStar(this.grid, startX, startY, endX, endY, true);
    
    if (path.length > 0) {
      this.behavior.path = path;
      this.behavior.pathIndex = 0;
    }
  }
  
  private hasLineOfSightToPlayer(): boolean {
    const startX = Math.floor(this.position.x / this.cellSize);
    const startY = Math.floor(this.position.z / this.cellSize);
    const endX = Math.floor(this.playerPosition.x / this.cellSize);
    const endY = Math.floor(this.playerPosition.z / this.cellSize);
    
    return this.hasLineOfSight(startX, startY, endX, endY);
  }
  
  private hasLineOfSight(startX: number, startY: number, endX: number, endY: number): boolean {
    const dx = Math.abs(endX - startX);
    const dy = Math.abs(endY - startY);
    const sx = startX < endX ? 1 : -1;
    const sy = startY < endY ? 1 : -1;
    let err = dx - dy;
    
    let x = startX;
    let y = startY;
    
    while (true) {
      if (x < 0 || y < 0 || x >= this.grid.w || y >= this.grid.h || this.grid.cells[y * this.grid.w + x] === 1) {
        return false;
      }
      
      if (x === endX && y === endY) break;
      
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
  
  getState(): AIState {
    return this.behavior.state;
  }
  
  getAlertLevel(): number {
    return this.behavior.alertLevel;
  }
  
  canAttack(): boolean {
    return this.behavior.state === 'attack' && this.behavior.attackCooldown <= 0;
  }
  
  updatePosition(newPos: THREE.Vector3) {
    this.position.copy(newPos);
  }
}
