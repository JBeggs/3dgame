import * as THREE from 'three';
import { getProjectileManager } from './projectiles';
import { getPhysics } from './physics';
import { getAudio } from './audio';
import { connect } from '../net/net';

export type ProjectileType = 'magic' | 'ricochet' | 'explosive' | 'grenade';

export interface PlayerCombat {
  canAttack: () => boolean;
  performAttack: (targetDirection: THREE.Vector3) => void;
  performRangedAttack: (targetPos: THREE.Vector3) => void;
  throwGrenade: (targetPos: THREE.Vector3) => void;
  startBlocking: () => void;
  stopBlocking: () => void;
  isBlocking: () => boolean;
  getCooldownProgress: () => number; // 0-1 for UI
  getAmmo: () => number;
  reload: () => void;
  setProjectileType: (type: ProjectileType) => void;
  getProjectileType: () => ProjectileType;
}

class PlayerCombatManager {
  private lastAttackTime = 0;
  private attackCooldown = 400; // 400ms between attacks
  private rangedCooldown = 800; // 800ms between ranged attacks
  private lastRangedAttackTime = 0;
  
  // Ammo system for ranged attacks
  private maxAmmo = 20;
  private currentAmmo = 20;
  private reloadTime = 2000; // 2 seconds to reload
  private isReloading = false;
  private reloadStartTime = 0;
  
  // Projectile type system
  private currentProjectileType: ProjectileType = 'magic';
  
  // Pan blocking system
  private isBlockingState = false;
  private blockCooldown = 1000; // 1 second cooldown after blocking
  private lastBlockTime = 0;
  
  // Grenade system
  private grenadeCount = 3;
  private maxGrenades = 3;
  private grenadeCooldown = 2000; // 2 seconds between grenades
  private lastGrenadeTime = 0;

  canAttack(): boolean {
    const now = Date.now();
    return now - this.lastAttackTime > this.attackCooldown && !this.isReloading;
  }

  canRangedAttack(): boolean {
    const now = Date.now();
    return now - this.lastRangedAttackTime > this.rangedCooldown && 
           this.currentAmmo > 0 && !this.isReloading;
  }

  performAttack(targetDirection: THREE.Vector3): void {
    if (!this.canAttack()) return;
    
    this.lastAttackTime = Date.now();
    getAudio().play('swing'); // Melee swing sound
    
    // Visual effect for melee attack could go here
    console.log('🗡️ Melee attack!');
  }

  performRangedAttack(targetPos: THREE.Vector3): void {
    if (!this.canRangedAttack()) return;
    
    const playerPos = getPhysics().playerBody.position;
    const shootPos = new THREE.Vector3(playerPos.x, playerPos.y + 0.8, playerPos.z);
    
    // Create player projectile with advanced properties
    const projectileManager = getProjectileManager();
    let options = {};
    let damage = 25;
    let speed = 12;
    
    switch (this.currentProjectileType) {
      case 'ricochet':
        options = { bounces: 3 };
        damage = 20; // Slightly less damage but bounces
        speed = 14; // Faster
        break;
      case 'explosive':
        options = { explosionRadius: 2.5, explosionDamage: 40 };
        damage = 15; // Lower direct hit damage, but area effect
        speed = 10; // Slower
        break;
      case 'grenade':
        options = { explosionRadius: 3.0, explosionDamage: 50 };
        damage = 5; // Very low direct hit damage, mainly area effect
        speed = 8; // Arc trajectory
        break;
      case 'magic':
      default:
        // Default magic projectile
        break;
    }
    
    const projectileId = projectileManager.createProjectile(
      shootPos,
      targetPos,
      speed,
      damage,
      this.currentProjectileType,
      'player', // Player ID to prevent self-damage
      options
    );
    
    // Send projectile creation to network for multiplayer sync
    const net = connect();
    const direction = targetPos.clone().sub(shootPos).normalize();
    const velocity = direction.multiplyScalar(speed);
    
    net.sendProjectileCreate({
      id: projectileId,
      x: shootPos.x, y: shootPos.y, z: shootPos.z,
      vx: velocity.x, vy: velocity.y, vz: velocity.z,
      type: this.currentProjectileType,
      damage: damage,
      lifetime: 0,
      maxLifetime: this.currentProjectileType === 'explosive' ? 8 : 5,
      bounces: this.currentProjectileType === 'ricochet' ? 3 : undefined,
      explosionRadius: options.explosionRadius,
      explosionDamage: options.explosionDamage
    });
    
    this.currentAmmo--;
    this.lastRangedAttackTime = Date.now();
    
    const audioClip = this.currentProjectileType === 'explosive' ? 'launch' : 'shoot';
    getAudio().play(audioClip);
    console.log(`🏹 ${this.currentProjectileType} projectile! Ammo: ${this.currentAmmo}/${this.maxAmmo}`);
    
    // Auto-reload when empty
    if (this.currentAmmo === 0) {
      this.reload();
    }
  }

  setProjectileType(type: ProjectileType): void {
    this.currentProjectileType = type;
    console.log(`🔄 Switched to ${type} projectiles`);
  }

  getProjectileType(): ProjectileType {
    return this.currentProjectileType;
  }
  
  // Grenade throwing system
  throwGrenade(targetPos: THREE.Vector3): void {
    const now = Date.now();
    if (now - this.lastGrenadeTime < this.grenadeCooldown || this.grenadeCount <= 0 || this.isBlockingState) {
      console.log('💣 Cannot throw grenade - on cooldown, out of grenades, or blocking');
      return;
    }
    
    const playerPos = getPhysics().playerBody.position;
    const throwPos = new THREE.Vector3(playerPos.x, playerPos.y + 1.0, playerPos.z);
    
    // Create grenade projectile with arc trajectory
    const projectileManager = getProjectileManager();
    const direction = targetPos.clone().sub(throwPos).normalize();
    direction.y += 0.3; // Add upward arc for grenade trajectory
    
    const projectileId = projectileManager.createProjectile(
      throwPos,
      targetPos,
      8, // Slower speed for grenades
      5, // Low direct damage
      'grenade',
      'player',
      { explosionRadius: 3.0, explosionDamage: 50 }
    );
    
    // Send grenade to network
    const net = connect();
    const velocity = direction.multiplyScalar(8);
    
    net.sendProjectileCreate({
      id: projectileId,
      x: throwPos.x, y: throwPos.y, z: throwPos.z,
      vx: velocity.x, vy: velocity.y, vz: velocity.z,
      type: 'grenade',
      damage: 5,
      lifetime: 0,
      maxLifetime: 4, // Grenades explode after 4 seconds
      explosionRadius: 3.0,
      explosionDamage: 50
    });
    
    this.grenadeCount--;
    this.lastGrenadeTime = now;
    getAudio().play('throw');
    console.log(`💣 Grenade thrown! Remaining: ${this.grenadeCount}/${this.maxGrenades}`);
  }
  
  // Pan blocking system
  startBlocking(): void {
    const now = Date.now();
    if (now - this.lastBlockTime < this.blockCooldown) {
      console.log('🛡️ Block on cooldown');
      return;
    }
    
    this.isBlockingState = true;
    getAudio().play('block_start');
    console.log('🛡️ Blocking started!');
  }
  
  stopBlocking(): void {
    if (this.isBlockingState) {
      this.isBlockingState = false;
      this.lastBlockTime = Date.now();
      getAudio().play('block_end');
      console.log('🛡️ Blocking stopped!');
    }
  }
  
  isBlocking(): boolean {
    return this.isBlockingState;
  }

  reload(): void {
    if (this.isReloading || this.currentAmmo === this.maxAmmo) return;
    
    this.isReloading = true;
    this.reloadStartTime = Date.now();
    
    getAudio().play('reload');
    console.log('🔄 Reloading...');
    
    setTimeout(() => {
      this.currentAmmo = this.maxAmmo;
      this.isReloading = false;
      console.log('✅ Reload complete!');
      getAudio().play('reload_complete');
    }, this.reloadTime);
  }

  getCooldownProgress(): number {
    const now = Date.now();
    const timeSinceAttack = now - this.lastRangedAttackTime;
    return Math.min(1, timeSinceAttack / this.rangedCooldown);
  }

  getAmmo(): number {
    return this.currentAmmo;
  }

  getMaxAmmo(): number {
    return this.maxAmmo;
  }

  isPlayerReloading(): boolean {
    return this.isReloading;
  }

  getReloadProgress(): number {
    if (!this.isReloading) return 1;
    const now = Date.now();
    const elapsed = now - this.reloadStartTime;
    return Math.min(1, elapsed / this.reloadTime);
  }

  // Update method to handle reload completion
  update(): void {
    if (this.isReloading) {
      const now = Date.now();
      if (now - this.reloadStartTime >= this.reloadTime) {
        this.currentAmmo = this.maxAmmo;
        this.isReloading = false;
      }
    }
  }
}

let combatManager: PlayerCombatManager | null = null;

export function getPlayerCombat(): PlayerCombat {
  if (!combatManager) {
    combatManager = new PlayerCombatManager();
  }
  
  return {
    canAttack: () => combatManager!.canAttack(),
    performAttack: (dir) => combatManager!.performAttack(dir),
    performRangedAttack: (pos) => combatManager!.performRangedAttack(pos),
    throwGrenade: (pos) => combatManager!.throwGrenade(pos),
    startBlocking: () => combatManager!.startBlocking(),
    stopBlocking: () => combatManager!.stopBlocking(),
    isBlocking: () => combatManager!.isBlocking(),
    getCooldownProgress: () => combatManager!.getCooldownProgress(),
    getAmmo: () => combatManager!.getAmmo(),
    reload: () => combatManager!.reload(),
    setProjectileType: (type) => combatManager!.setProjectileType(type),
    getProjectileType: () => combatManager!.getProjectileType()
  };
}

// Export for debugging and updates
export function updatePlayerCombat(): void {
  if (combatManager) {
    combatManager.update();
  }
}
