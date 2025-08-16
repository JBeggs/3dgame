import React, { useEffect, useRef, useState } from 'react';
import { useWorldState } from '../game/worldState';

export function MiniMap() {
  const cvsRef = useRef<HTMLCanvasElement>(null);
  const ws = useWorldState();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const cvs = cvsRef.current!;
    const ctx = cvs.getContext('2d')!;
    const grid = ws.grid;
    if (!grid) return;
    const scale = Math.min(cvs.width / grid.w, cvs.height / grid.h);
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    // draw floor/walls
    for (let y = 0; y < grid.h; y++) for (let x = 0; x < grid.w; x++) {
      const v = grid.cells[y * grid.w + x];
      ctx.fillStyle = v === 1 ? '#222' : '#777';
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
    // player dot
    ctx.fillStyle = '#0f0';
    ctx.beginPath();
    ctx.arc(ws.player.x * (scale/1.2), ws.player.z * (scale/1.2), 3, 0, Math.PI*2);
    ctx.fill();
  }, [ws]);

  return (
    <>
      <button onClick={() => setOpen(v => !v)} style={{ position: 'absolute', right: 10, bottom: open ? 140 : 10, zIndex: 12, background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '4px 8px', fontFamily: 'monospace' }}>{open ? 'Hide Map' : 'Show Map'}</button>
      {open && <canvas ref={cvsRef} width={200} height={150} style={{ position: 'absolute', right: 10, bottom: 10, background: 'rgba(0,0,0,0.4)', borderRadius: 6 }} />}
    </>
  );
}


