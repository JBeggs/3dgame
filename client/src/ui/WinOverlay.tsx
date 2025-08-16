import React from 'react';

export function WinOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '16px 24px', borderRadius: 12, fontFamily: 'monospace', fontSize: 24 }}>
        You win!
      </div>
    </div>
  );
}


