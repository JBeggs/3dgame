import React, { useEffect, useRef, useState } from 'react';
import { getInput } from '../game/input';

// Smoothing curve options
type SmoothingCurve = 'linear' | 'quadratic' | 'cubic' | 'exponential';

interface JoystickConfig {
  deadzone: number;
  sensitivity: number;
  smoothingCurve: SmoothingCurve;
  returnSpeed: number; // How fast the knob returns to center when released
}

export function TouchControls() {
  const padRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const jumpRef = useRef<HTMLButtonElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  
  // Visual state for the joystick
  const [knobPosition, setKnobPosition] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  
  // Smoothed input values for interpolation
  const smoothedInput = useRef({ x: 0, y: 0 });
  const targetInput = useRef({ x: 0, y: 0 });
  
  // Joystick configuration
  const config: JoystickConfig = {
    deadzone: 0.12,
    sensitivity: 1.2,
    smoothingCurve: 'cubic',
    returnSpeed: 12
  };
  // Smoothing curve functions
  const applySmoothingCurve = (t: number, curve: SmoothingCurve): number => {
    switch (curve) {
      case 'linear':
        return t;
      case 'quadratic':
        return t * t;
      case 'cubic':
        return t * t * (3 - 2 * t); // Hermite interpolation
      case 'exponential':
        return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
      default:
        return t;
    }
  };

  // Animation loop for smooth interpolation
  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      const deltaTime = 1 / 60; // Assume 60fps
      const lerpSpeed = isActive ? 15 : config.returnSpeed;
      
      // Smoothly interpolate to target values
      smoothedInput.current.x += (targetInput.current.x - smoothedInput.current.x) * lerpSpeed * deltaTime;
      smoothedInput.current.y += (targetInput.current.y - smoothedInput.current.y) * lerpSpeed * deltaTime;
      
      // Update input system
      const input = getInput();
      input.setVector(smoothedInput.current.x, smoothedInput.current.y);
      
      // Update visual knob position
      setKnobPosition({
        x: smoothedInput.current.x * 50, // 50px max distance
        y: smoothedInput.current.y * 50
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, config.returnSpeed]);

  useEffect(() => {
    const input = getInput();
    const el = padRef.current!;
    let touchActive = false;
    
    function compute(clientX: number, clientY: number) {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let dx = (clientX - cx) / (r.width / 2);
      let dy = (clientY - cy) / (r.height / 2);
      
      // Clamp to circle
      const mag = Math.hypot(dx, dy);
      if (mag > 1) {
        dx /= mag;
        dy /= mag;
      }
      
      // Apply deadzone with smooth transition
      let finalMag = 0;
      if (mag > config.deadzone) {
        const normalizedMag = (mag - config.deadzone) / (1 - config.deadzone);
        finalMag = applySmoothingCurve(normalizedMag, config.smoothingCurve);
      }
      
      // Apply sensitivity
      finalMag *= config.sensitivity;
      
      // Calculate final values
      if (finalMag === 0) {
        targetInput.current.x = 0;
        targetInput.current.y = 0;
      } else {
        const normalizedX = dx / Math.max(mag, 0.001);
        const normalizedY = dy / Math.max(mag, 0.001);
        targetInput.current.x = normalizedX * finalMag;
        targetInput.current.y = -normalizedY * finalMag; // Invert Y for game coordinates
        console.log('Touch input:', { x: targetInput.current.x, y: targetInput.current.y, mag: finalMag }); // Debug
      }
    }
    function onTouchStart(e: TouchEvent) { 
      e.preventDefault(); 
      touchActive = true;
      setIsActive(true);
      const t = e.touches[0]; 
      compute(t.clientX, t.clientY); 
    }
    function onTouchMove(e: TouchEvent) { 
      if (!touchActive) return; 
      e.preventDefault(); 
      const t = e.touches[0]; 
      compute(t.clientX, t.clientY); 
    }
    function onTouchEnd(e: TouchEvent) { 
      e.preventDefault(); 
      touchActive = false; 
      setIsActive(false);
      targetInput.current.x = 0;
      targetInput.current.y = 0;
    }
    function onMouseDown(e: MouseEvent) { 
      touchActive = true; 
      setIsActive(true);
      compute(e.clientX, e.clientY); 
    }
    function onMouseMove(e: MouseEvent) { 
      if (!touchActive) return; 
      compute(e.clientX, e.clientY); 
    }
    function onMouseUp() { 
      if (!touchActive) return; 
      touchActive = false; 
      setIsActive(false);
      targetInput.current.x = 0;
      targetInput.current.y = 0;
    }
    function onMouseLeave() { 
      if (!touchActive) return; 
      touchActive = false; 
      setIsActive(false);
      targetInput.current.x = 0;
      targetInput.current.y = 0;
    }
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
      {/* Joystick base */}
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
          background: isActive 
            ? 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)' 
            : 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)', 
          touchAction: 'none', 
          userSelect: 'none', 
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          cursor: 'pointer', 
          zIndex: 10, 
          pointerEvents: 'auto' as any,
          border: `2px solid ${isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
          boxShadow: isActive ? 'inset 0 0 20px rgba(255,255,255,0.1)' : 'none',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Deadzone indicator */}
        <div style={{
          position: 'absolute',
          width: config.deadzone * 100, // Scale deadzone to percentage
          height: config.deadzone * 100,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.1)',
          pointerEvents: 'none'
        }} />
        
        {/* Joystick knob */}
        <div
          ref={knobRef}
          style={{
            position: 'absolute',
            width: 32,
            height: 32,
            borderRadius: 16,
            background: isActive 
              ? 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)'
              : 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.2) 100%)',
            border: '2px solid rgba(255,255,255,0.3)',
            transform: `translate(${knobPosition.x}px, ${-knobPosition.y}px)`,
            transition: isActive ? 'none' : 'transform 0.15s ease-out',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            pointerEvents: 'none'
          }}
        />
      </div>
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


