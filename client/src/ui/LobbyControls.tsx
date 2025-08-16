import React, { useState } from 'react';
import { LobbyConfig } from '../gen/lobbyGen';

interface LobbyControlsProps {
  config: LobbyConfig;
  onChange: (config: LobbyConfig) => void;
  useLobby: boolean;
  onToggleLobby: (useLobby: boolean) => void;
}

export function LobbyControls({ config, onChange, useLobby, onToggleLobby }: LobbyControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '12px',
      borderRadius: '8px',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      minWidth: '300px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: isOpen ? '12px' : '0' }}>
        <button
          onClick={() => onToggleLobby(!useLobby)}
          style={{
            background: useLobby ? '#22c55e' : '#ef4444',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          {useLobby ? '🏃‍♂️ LOBBY' : '🏰 DUNGEON'}
        </button>
        
        <span>Movement Test Mode</span>
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            background: 'transparent',
            color: 'white',
            border: '1px solid #666',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          {isOpen ? '▲' : '▼'} Settings
        </button>
      </div>

      {isOpen && useLobby && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #444'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: '#ccc' }}>
              Size:
            </label>
            <select
              value={config.size}
              onChange={(e) => onChange({ ...config, size: e.target.value as any })}
              style={{
                background: '#333',
                color: 'white',
                border: '1px solid #666',
                padding: '4px',
                borderRadius: '4px',
                width: '100%'
              }}
            >
              <option value="small">Small (16x16)</option>
              <option value="medium">Medium (24x24)</option>
              <option value="large">Large (32x32)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: '#ccc' }}>
              Theme:
            </label>
            <select
              value={config.theme}
              onChange={(e) => onChange({ ...config, theme: e.target.value as any })}
              style={{
                background: '#333',
                color: 'white',
                border: '1px solid #666',
                padding: '4px',
                borderRadius: '4px',
                width: '100%'
              }}
            >
              <option value="simple">Simple</option>
              <option value="garden">Garden</option>
              <option value="arena">Arena</option>
            </select>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
              <input
                type="checkbox"
                checked={config.hasPickups}
                onChange={(e) => onChange({ ...config, hasPickups: e.target.checked })}
                style={{ accentColor: '#22c55e' }}
              />
              <span style={{ color: '#ccc' }}>Include pickup items</span>
            </label>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
              <input
                type="checkbox"
                checked={config.hasEnemies}
                onChange={(e) => onChange({ ...config, hasEnemies: e.target.checked })}
                style={{ accentColor: '#22c55e' }}
              />
              <span style={{ color: '#ccc' }}>Include test enemies</span>
            </label>
          </div>
        </div>
      )}

      {!useLobby && isOpen && (
        <div style={{ 
          paddingTop: '8px',
          borderTop: '1px solid #444',
          fontSize: '11px',
          color: '#aaa'
        }}>
          <p>Full dungeon mode with all enemies, items, and complexity.</p>
          <p>Switch to Lobby mode for simpler movement testing.</p>
        </div>
      )}
    </div>
  );
}
