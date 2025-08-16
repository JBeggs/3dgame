import React, { useEffect, useRef } from 'react';
import { getInput } from '../game/input';

export function TouchControls() {
  const padRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const input = getInput();
    const el = padRef.current!;
    function onStart(e: TouchEvent) {
      const t = e.touches[0];
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (t.clientX - cx) / (r.width / 2);
      const dy = (t.clientY - cy) / (r.height / 2);
      input.setVector(dx, -dy);
    }
    function onMove(e: TouchEvent) { onStart(e); }
    function onEnd() { input.setVector(0, 0); }
    el.addEventListener('touchstart', onStart);
    el.addEventListener('touchmove', onMove);
    el.addEventListener('touchend', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, []);
  return (
    <div ref={padRef} style={{ position: 'absolute', left: 12, bottom: 12, width: 120, height: 120, borderRadius: 60, background: 'rgba(255,255,255,0.06)', touchAction: 'none' }} />
  );
}


