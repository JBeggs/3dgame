import React, { useState } from 'react';
import { mapStore, useMapState } from '../game/mapStore';

export function MapControlsPanel() {
  const mapState = useMapState();
  const [seed, setSeed] = useState<string>(String(mapState.seed));
  const [rooms, setRooms] = useState<string>(String(mapState.rooms));

  function applyAndRegenerate() {
    const s = Math.max(1, Math.floor(Number(seed)||1));
    const r = Math.max(3, Math.floor(Number(rooms)||10));
    mapStore.updateSettings(s, r);
  }

  return (
    <div style={{ 
      background: 'rgba(255,255,255,0.05)', 
      color: '#fff', 
      padding: 16, 
      borderRadius: 8, 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      {/* Header */}
      <div style={{ 
        fontSize: '0.9rem', 
        color: '#cbd5e1', 
        marginBottom: 12,
        fontWeight: '500'
      }}>
        🎲 Map Generation Settings
      </div>
      
      {/* Controls */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr', 
        gap: 12, 
        marginBottom: 16 
      }}>
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '0.8rem', 
            color: '#94a3b8', 
            marginBottom: 4 
          }}>
            Seed Number
          </label>
          <input 
            value={seed} 
            onChange={(e) => setSeed(e.target.value)} 
            style={{ 
              width: '100%',
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6,
              color: '#fff',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
            placeholder="1"
          />
        </div>
        
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '0.8rem', 
            color: '#94a3b8', 
            marginBottom: 4 
          }}>
            Room Count
          </label>
          <input 
            value={rooms} 
            onChange={(e) => setRooms(e.target.value)} 
            style={{ 
              width: '100%',
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6,
              color: '#fff',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
            placeholder="10"
          />
        </div>
      </div>
      
      {/* Generate Button */}
      <button 
        onClick={applyAndRegenerate}
        style={{
          width: '100%',
          padding: '10px 16px',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: '0.9rem',
          fontWeight: '600',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #059669, #047857)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #10b981, #059669)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.2)';
        }}
      >
        🔄 Generate New Map
      </button>
      
      {/* Info */}
      <div style={{ 
        fontSize: '0.75rem', 
        color: '#64748b', 
        marginTop: 12,
        lineHeight: 1.4
      }}>
        💡 Same seed generates the same map layout. Higher room count creates larger dungeons.
      </div>
    </div>
  );
}


