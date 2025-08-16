import React, { useEffect, useRef } from 'react';
import { getInput } from '../game/input';

export function TouchControls() {
  const padRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const input = getInput();
    const el = padRef.current!;
    let active = false;
    function compute(clientX: number, clientY: number) {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (clientX - cx) / (r.width / 2);
      const dy = (clientY - cy) / (r.height / 2);
      input.setVector(dx, -dy);
    }
    function onTouchStart(e: TouchEvent) { active = true; const t = e.touches[0]; compute(t.clientX, t.clientY); }
    function onTouchMove(e: TouchEvent) { if (!active) return; const t = e.touches[0]; compute(t.clientX, t.clientY); }
    function onTouchEnd() { active = false; input.setVector(0, 0); }
    function onMouseDown(e: MouseEvent) { active = true; compute(e.clientX, e.clientY); }
    function onMouseMove(e: MouseEvent) { if (!active) return; compute(e.clientX, e.clientY); }
    function onMouseUp() { if (!active) return; active = false; input.setVector(0, 0); }
    function onMouseLeave() { if (!active) return; active = false; input.setVector(0, 0); }
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
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
    <div ref={padRef} style={{ position: 'absolute', left: 12, bottom: 12, width: 140, height: 140, borderRadius: 70, background: 'rgba(255,255,255,0.06)', touchAction: 'none', userSelect: 'none', cursor: 'pointer' }} />
  );
}


