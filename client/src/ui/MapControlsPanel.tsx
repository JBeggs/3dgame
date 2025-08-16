import React, { useState } from 'react';

export function MapControlsPanel() {
  const [seed, setSeed] = useState<string>(String(Number(localStorage.getItem('genSeed') || 1)));
  const [rooms, setRooms] = useState<string>(String(Number(localStorage.getItem('genRooms') || 10)));

  function applyAndReload() {
    const s = Math.max(1, Math.floor(Number(seed)||1));
    const r = Math.max(3, Math.floor(Number(rooms)||10));
    localStorage.setItem('genSeed', String(s));
    localStorage.setItem('genRooms', String(r));
    location.reload();
  }

  return (
    <div style={{ position: 'absolute', top: 80, right: 10, background: 'rgba(0,0,0,0.4)', color: '#fff', padding: 8, borderRadius: 8, fontFamily: 'monospace', display: 'flex', gap: 6, alignItems: 'center' }}>
      <label>Seed <input value={seed} onChange={(e) => setSeed(e.target.value)} style={{ width: 70 }} /></label>
      <label>Rooms <input value={rooms} onChange={(e) => setRooms(e.target.value)} style={{ width: 50 }} /></label>
      <button onClick={applyAndReload}>Regenerate</button>
    </div>
  );
}


