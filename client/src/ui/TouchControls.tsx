import React, { useEffect, useRef } from 'react';
import { getInput } from '../game/input';

export function TouchControls() {
  const padRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const input = getInput();
    const el = padRef.current!;
    function compute(clientX: number, clientY: number) {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (clientX - cx) / (r.width / 2);
      const dy = (clientY - cy) / (r.height / 2);
      input.setVector(dx, -dy);
    }
    function onTouchStart(e: TouchEvent) { const t = e.touches[0]; compute(t.clientX, t.clientY); }
    function onTouchMove(e: TouchEvent) { const t = e.touches[0]; compute(t.clientX, t.clientY); }
    function onTouchEnd() { input.setVector(0, 0); }
    // Mouse/trackpad: treat hover inside pad as active joystick
    function onMouseEnter(e: MouseEvent) { compute(e.clientX, e.clientY); }
    function onMouseMove(e: MouseEvent) { compute(e.clientX, e.clientY); }
    function onMouseLeave() { input.setVector(0, 0); }
    function onPointerUp() { input.setVector(0, 0); }
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('mouseenter', onMouseEnter, { passive: true } as any);
    el.addEventListener('mousemove', onMouseMove, { passive: true } as any);
    el.addEventListener('mouseleave', onMouseLeave, { passive: true } as any);
    el.addEventListener('pointerup', onPointerUp, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('mouseenter', onMouseEnter);
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('mouseleave', onMouseLeave);
      el.removeEventListener('pointerup', onPointerUp);
    };
  }, []);
  return (
    <div ref={padRef} style={{ position: 'absolute', left: 12, bottom: 12, width: 140, height: 140, borderRadius: 70, background: 'rgba(255,255,255,0.06)', touchAction: 'none', userSelect: 'none', cursor: 'pointer' }} />
  );
}


