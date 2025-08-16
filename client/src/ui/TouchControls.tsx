import React, { useEffect, useRef } from 'react';
import { getInput } from '../game/input';

export function TouchControls() {
  const padRef = useRef<HTMLDivElement>(null);
  const jumpRef = useRef<HTMLButtonElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const input = getInput();
    const el = padRef.current!;
    let active = false;
    function compute(clientX: number, clientY: number) {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let dx = (clientX - cx) / (r.width / 2);
      let dy = (clientY - cy) / (r.height / 2);
      // deadzone + smoothing
      const mag = Math.hypot(dx, dy);
      const dead = 0.15;
      if (mag < dead) { dx = 0; dy = 0; }
      else {
        const t = (mag - dead) / (1 - dead);
        const scale = Math.max(0, Math.min(1, t));
        dx = (dx / mag) * scale;
        dy = (dy / mag) * scale;
      }
      input.setVector(dx, -dy);
    }
    function onTouchStart(e: TouchEvent) { 
      e.preventDefault(); 
      active = true; 
      const t = e.touches[0]; 
      compute(t.clientX, t.clientY); 
    }
    function onTouchMove(e: TouchEvent) { 
      if (!active) return; 
      e.preventDefault(); 
      const t = e.touches[0]; 
      compute(t.clientX, t.clientY); 
    }
    function onTouchEnd(e: TouchEvent) { 
      e.preventDefault(); 
      active = false; 
      input.setVector(0, 0); 
    }
    function onMouseDown(e: MouseEvent) { active = true; compute(e.clientX, e.clientY); }
    function onMouseMove(e: MouseEvent) { if (!active) return; compute(e.clientX, e.clientY); }
    function onMouseUp() { if (!active) return; active = false; input.setVector(0, 0); }
    function onMouseLeave() { if (!active) return; active = false; input.setVector(0, 0); }
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    el.addEventListener('mousedown', onMouseDown, { passive: true } as any);
    el.addEventListener('mousemove', onMouseMove, { passive: true } as any);
    el.addEventListener('mouseup', onMouseUp, { passive: true } as any);
    el.addEventListener('mouseleave', onMouseLeave, { passive: true } as any);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);
  return (
    <>
      <div
        ref={padRef}
        onContextMenu={(e) => { e.preventDefault(); }}
        style={{ 
          position: 'absolute', 
          left: 12, 
          bottom: 'calc(12px + env(safe-area-inset-bottom))', 
          width: 140, 
          height: 140, 
          borderRadius: 70, 
          background: 'rgba(255,255,255,0.06)', 
          touchAction: 'none', 
          userSelect: 'none', 
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          cursor: 'pointer', 
          zIndex: 10, 
          pointerEvents: 'auto' as any,
          border: '2px solid rgba(255,255,255,0.1)'
        }}
      />
      <button
        ref={jumpRef}
        onMouseDown={(e) => { e.preventDefault(); getInput().setJump(true); }}
        onMouseUp={(e) => { e.preventDefault(); getInput().setJump(false); }}
        onTouchStart={(e) => { e.preventDefault(); getInput().setJump(true); }}
        onTouchEnd={(e) => { e.preventDefault(); getInput().setJump(false); }}
        onTouchCancel={(e) => { e.preventDefault(); getInput().setJump(false); }}
        style={{ 
          position: 'absolute', 
          right: 16, 
          bottom: 'calc(110px + env(safe-area-inset-bottom))', 
          width: 72, 
          height: 72, 
          borderRadius: 36, 
          background: 'rgba(255,255,255,0.08)', 
          color: '#fff', 
          border: '1px solid rgba(255,255,255,0.2)', 
          zIndex: 10, 
          pointerEvents: 'auto' as any,
          touchAction: 'manipulation',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          fontSize: '12px',
          fontWeight: 'bold'
        }}
      >Jump</button>
      <button
        ref={actionRef}
        onMouseDown={(e) => { e.preventDefault(); getInput().setAction(true); }}
        onMouseUp={(e) => { e.preventDefault(); getInput().setAction(false); }}
        onTouchStart={(e) => { e.preventDefault(); getInput().setAction(true); }}
        onTouchEnd={(e) => { e.preventDefault(); getInput().setAction(false); }}
        onTouchCancel={(e) => { e.preventDefault(); getInput().setAction(false); }}
        style={{ 
          position: 'absolute', 
          right: 16, 
          bottom: 'calc(30px + env(safe-area-inset-bottom))', 
          width: 72, 
          height: 72, 
          borderRadius: 36, 
          background: 'rgba(255,255,255,0.08)', 
          color: '#fff', 
          border: '1px solid rgba(255,255,255,0.2)', 
          zIndex: 10, 
          pointerEvents: 'auto' as any,
          touchAction: 'manipulation',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          fontSize: '10px',
          fontWeight: 'bold'
        }}
      >Action</button>
    </>
  );
}


