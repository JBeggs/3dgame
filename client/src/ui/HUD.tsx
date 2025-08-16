import React, { useState } from 'react';
import { useInventory } from '../game/inventory';
import { usePlayerHealth } from '../game/health';
import { getCoinTarget } from '../game/config';

export function HUD() {
  const inv = useInventory();
  const hp = usePlayerHealth();
  const [msg, setMsg] = useState('');
  return (
    <div style={{ position: 'absolute', top: 10, left: 10, color: '#fff', fontFamily: 'monospace' }}>
      <div>HP: {Math.round(hp.hp)} / {hp.max}</div>
      <div>Keys: {inv.items.key} | Coins: {inv.items.coin}/{getCoinTarget()} ({Math.max(0, getCoinTarget() - inv.items.coin)} left)</div>
      {msg && <div>{msg}</div>}
    </div>
  );
}


