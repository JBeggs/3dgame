import React, { useState } from 'react';
import { MapControlsPanel } from './MapControlsPanel';
import { AvatarPanel } from './AvatarPanel';

export function LandingScreen({ onStart }: { onStart: () => void }) {
  const [showAvatar, setShowAvatar] = useState(true);
  const [showMap, setShowMap] = useState(true);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', zIndex: 20, pointerEvents: 'auto' }}>
      <div style={{ width: 520, background: 'rgba(20,22,28,0.95)', color: '#fff', borderRadius: 12, padding: 16, fontFamily: 'monospace' }}>
        <h3 style={{ marginTop: 0 }}>Game Setup</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label><input type="checkbox" checked={showAvatar} onChange={(e) => setShowAvatar(e.target.checked)} /> Avatar</label>
            {showAvatar && <div style={{ position: 'relative', zIndex: 21 }}><AvatarPanel /></div>}
          </div>
          <div style={{ flex: 1 }}>
            <label><input type="checkbox" checked={showMap} onChange={(e) => setShowMap(e.target.checked)} /> Map</label>
            {showMap && <div style={{ position: 'relative', zIndex: 21 }}><MapControlsPanel /></div>}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button onClick={onStart}>Start</button>
        </div>
      </div>
    </div>
  );
}


