import { useSyncExternalStore } from 'react';

type HealthState = { hp: number; max: number };
const player: HealthState = { hp: 100, max: 100 };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export const playerHealth = {
  // Server-authoritative damage (local prediction disabled)
  damage(n: number) { 
    console.log(`⚠️ Local damage call blocked - health is server authoritative`); 
    // Don't apply local damage - wait for server
  },
  heal(n: number) { player.hp = Math.min(player.max, player.hp + n); emit(); },
  get() { return player; },
  // Server-only method to apply authoritative health
  setFromServer(hp: number, maxHp: number) {
    player.hp = hp;
    player.max = maxHp;
    emit();
  },
  reset() {
    player.hp = player.max;
    emit();
  }
};

// Listen for server damage events
if (typeof window !== 'undefined') {
  window.addEventListener('playerDamaged', (event: any) => {
    const { health, maxHealth, damage, source, projectileType } = event.detail;
    console.log(`💔 Server damage applied: ${damage} (${health}/${maxHealth})`);
    
    // Apply server-authoritative health
    playerHealth.setFromServer(health, maxHealth);
    
    // Play damage sound/effects
    try {
      import('./audio').then(({ getAudio }) => {
        getAudio().play('hit');
      });
    } catch {}
    
    // Visual damage indicator
    try {
      import('../effects/ParticleSystem').then(({ getParticleManager }) => {
        // Create damage particles at player position
        import('./physics').then(({ getPhysics }) => {
          const pos = getPhysics().playerBody.position;
          getParticleManager().createEffect(pos, 'blood');
        });
      });
    } catch {}
  });
}

export function usePlayerHealth() {
  const subscribe = (fn: () => void) => { subs.add(fn); return () => subs.delete(fn); };
  return useSyncExternalStore(subscribe, playerHealth.get, playerHealth.get);
}


