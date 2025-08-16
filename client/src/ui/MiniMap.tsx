import React, { useEffect, useRef } from 'react';
import { useWorldState } from '../game/worldState';

export function MiniMap() {
  const cvsRef = useRef<HTMLCanvasElement>(null);
  const ws = useWorldState();

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
    <canvas ref={cvsRef} width={160} height={120} style={{ position: 'absolute', right: 10, bottom: 10, background: 'rgba(0,0,0,0.4)', borderRadius: 6 }} />
  );
}


