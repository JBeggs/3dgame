import * as THREE from 'three';
import { getProjectileManager } from './projectiles';
import { getPhysics } from './physics';
import { getAudio } from './audio';

export type ProjectileType = 'magic' | 'ricochet' | 'explosive';

export interface PlayerCombat {
  canAttack: () => boolean;
  performAttack: (targetDirection: THREE.Vector3) => void;
  performRangedAttack: (targetPos: THREE.Vector3) => void;
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
