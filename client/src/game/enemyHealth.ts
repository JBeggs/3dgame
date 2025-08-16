// Enemy health management system
export interface EnemyHealth {
  hp: number;
  maxHp: number;
  isDead: boolean;
  deathTime?: number;
}

export class EnemyHealthManager {
  private enemies = new Map<string, EnemyHealth>();

  createEnemy(id: string, maxHp: number = 30): EnemyHealth {
    const health: EnemyHealth = {
      hp: maxHp,
      maxHp,
      isDead: false
    };
    this.enemies.set(id, health);
    return health;
  }

  getEnemy(id: string): EnemyHealth | undefined {
    return this.enemies.get(id);
  }

  damageEnemy(id: string, damage: number): boolean {
    const enemy = this.enemies.get(id);
    if (!enemy || enemy.isDead) return false;

    enemy.hp = Math.max(0, enemy.hp - damage);
    
    if (enemy.hp <= 0 && !enemy.isDead) {
      enemy.isDead = true;
      enemy.deathTime = Date.now();
      return true; // Enemy just died
    }
    
    return false; // Enemy damaged but still alive
  }

  removeEnemy(id: string) {
    this.enemies.delete(id);
  }

  getAllEnemies(): Map<string, EnemyHealth> {
    return this.enemies;
  }

  // Clean up enemies that have been dead for too long
  cleanupDeadEnemies(maxDeadTime: number = 3000) {
    const now = Date.now();
    for (const [id, enemy] of this.enemies.entries()) {
      if (enemy.isDead && enemy.deathTime && (now - enemy.deathTime) > maxDeadTime) {
        this.removeEnemy(id);
      }
    }
  }
}

// Singleton instance
let enemyHealthManager: EnemyHealthManager | null = null;

export function getEnemyHealthManager(): EnemyHealthManager {
  if (!enemyHealthManager) {
    enemyHealthManager = new EnemyHealthManager();
  }
  return enemyHealthManager;
}
