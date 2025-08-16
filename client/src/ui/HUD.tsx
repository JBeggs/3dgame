import React, { useState } from 'react';
import { useInventory } from '../game/inventory';

export function HUD() {
  const inv = useInventory();
  const [msg, setMsg] = useState('');
  return (
    <div style={{ position: 'absolute', top: 10, left: 10, color: '#fff', fontFamily: 'monospace' }}>
      <div>Keys: {inv.items.key} | Coins: {inv.items.coin}</div>
      {msg && <div>{msg}</div>}
    </div>
  );
}


