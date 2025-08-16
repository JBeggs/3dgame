import React, { useEffect, useRef, useState } from 'react';
import { getInput } from '../game/input';

function applyDeadzone(x: number, y: number, dead = 0.15) {
  const mag = Math.hypot(x, y);
  if (mag < dead) return { x: 0, y: 0 };
  const t = (mag - dead) / (1 - dead);
  const scale = Math.max(0, Math.min(1, t));
  return { x: (x / mag) * scale, y: (y / mag) * scale };
}

export function GamepadControls() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('gamepadEnabled') !== 'false');
  const rafRef = useRef<number | null>(null);
  const prevButtons = useRef<{ jump: boolean; action: boolean }>({ jump: false, action: false });

  useEffect(() => {
    localStorage.setItem('gamepadEnabled', String(enabled));
    const input = getInput();
    function loop() {
      rafRef.current = requestAnimationFrame(loop);
      if (!enabled) return;
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = pads && pads[0];
      if (!gp) return;
      // left stick
      const lx = gp.axes[0] || 0;
      const ly = gp.axes[1] || 0;
      const v = applyDeadzone(lx, ly, 0.15);
      // note: input.setVector expects (right, forward)
      input.setVector(v.x, -v.y);
      // buttons: A (0) jump, X (2) action
      const jump = !!(gp.buttons[0] && gp.buttons[0].pressed);
      const action = !!(gp.buttons[2] && gp.buttons[2].pressed);
      if (jump !== prevButtons.current.jump) {
        input.setJump(jump);
        prevButtons.current.jump = jump;
      }
      if (action !== prevButtons.current.action) {
        // @ts-ignore setAction exists in input api
        (input as any).setAction?.(action);
        prevButtons.current.action = action;
      }
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [enabled]);

  return (
    <button
      onClick={() => setEnabled((v) => !v)}
      style={{ position: 'absolute', top: 10, left: 10, zIndex: 12, background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '4px 8px', fontFamily: 'monospace', cursor: 'pointer' }}
    >{enabled ? 'Gamepad: On' : 'Gamepad: Off'}</button>
  );
}


