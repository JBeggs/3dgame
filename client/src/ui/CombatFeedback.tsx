import React, { useState, useEffect } from 'react';

interface CombatEvent {
  id: string;
  type: 'hit' | 'damage' | 'error';
  message: string;
  timestamp: number;
}

export function CombatFeedback() {
  const [events, setEvents] = useState<CombatEvent[]>([]);

  useEffect(() => {
    // Listen for hit confirmations
    const handleHit = (event: any) => {
      const { targetId, damage } = event.detail;
      setEvents(prev => [...prev, {
        id: `hit_${Date.now()}`,
        type: 'hit',
        message: `Hit for ${damage} damage!`,
        timestamp: Date.now()
      }]);
    };

    // Listen for damage taken
    const handleDamage = (event: any) => {
      const { damage, source } = event.detail;
      setEvents(prev => [...prev, {
        id: `damage_${Date.now()}`,
        type: 'damage', 
        message: `Took ${damage} damage!`,
        timestamp: Date.now()
      }]);
    };

    // Listen for combat errors
    const handleCombatError = (event: any) => {
      const { reason, cooldown } = event.detail;
      const message = cooldown ? 
        `${reason} (${Math.ceil(cooldown / 1000)}s)` : 
        reason;
      
      setEvents(prev => [...prev, {
        id: `error_${Date.now()}`,
        type: 'error',
        message,
        timestamp: Date.now()
      }]);
    };

    window.addEventListener('projectileHit', handleHit);
    window.addEventListener('playerDamaged', handleDamage);
    window.addEventListener('combatError', handleCombatError);

    return () => {
      window.removeEventListener('projectileHit', handleHit);
      window.removeEventListener('playerDamaged', handleDamage);
      window.removeEventListener('combatError', handleCombatError);
    };
  }, []);

  // Auto-remove old events
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setEvents(prev => prev.filter(event => now - event.timestamp < 3000));
    }, 500);

    return () => clearInterval(cleanup);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      right: '20px',
      transform: 'translateY(-50%)',
      zIndex: 1000,
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '8px'
    }}>
      {events.map(event => (
        <CombatEventItem key={event.id} event={event} />
      ))}
    </div>
  );
}

function CombatEventItem({ event }: { event: CombatEvent }) {
  const getStyle = () => {
    const baseStyle = {
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold' as const,
      animation: 'combatFade 3s forwards',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
    };

    switch (event.type) {
      case 'hit':
        return { ...baseStyle, borderLeft: '4px solid #4caf50' }; // Green
      case 'damage':
        return { ...baseStyle, borderLeft: '4px solid #f44336' }; // Red
      case 'error':
        return { ...baseStyle, borderLeft: '4px solid #ff9800' }; // Orange
      default:
        return baseStyle;
    }
  };

  return (
    <div style={getStyle()}>
      {event.message}
    </div>
  );
}

// Add CSS animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes combatFade {
      0% {
        opacity: 1;
        transform: translateX(0);
      }
      80% {
        opacity: 1;
        transform: translateX(0);
      }
      100% {
        opacity: 0;
        transform: translateX(20px);
      }
    }
  `;
  document.head.appendChild(style);
}
