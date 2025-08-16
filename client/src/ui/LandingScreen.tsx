import React, { useState } from 'react';
import { MapControlsPanel } from './MapControlsPanel';
import { AvatarPanel } from './AvatarPanel';
import { avatarStore } from '../avatar/store';
import { getInput } from '../game/input';

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
            <div style={{ marginTop: 8 }}>
              <label>Preset:
                <select onChange={(e) => {
                  const p = e.target.value === 'B' ? avatarStore.presets.presetB : avatarStore.presets.presetA;
                  avatarStore.set(p);
                }}>
                  <option value="A">Preset A</option>
                  <option value="B">Preset B</option>
                </select>
              </label>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label><input type="checkbox" checked={showMap} onChange={(e) => setShowMap(e.target.checked)} /> Map</label>
            {showMap && <div style={{ position: 'relative', zIndex: 21 }}><MapControlsPanel /></div>}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button 
            onClick={() => { 
              try { 
                // Force reattach input system for iOS Safari
                const input = getInput();
                input.detach();
                setTimeout(() => {
                  input.attach();
                }, 100);
              } catch {} 
              onStart(); 
            }}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              background: '#059669',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
}


