import React, { useState } from 'react';
import { MapControlsPanel } from './MapControlsPanel';
import { AvatarPanel } from './AvatarPanel';
import { avatarStore } from '../avatar/store';
import { getInput } from '../game/input';

export function AvatarSetupScreen({ onContinue }: { onContinue: () => void }) {
  const [showAvatar, setShowAvatar] = useState(true);
  const [showMap, setShowMap] = useState(true);
  
  return (
    <div style={{ 
      position: 'absolute', 
      inset: 0, 
      display: 'flex', 
      alignItems: window.innerHeight > 900 ? 'center' : 'flex-start', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(20,30,48,0.9) 100%)', 
      backdropFilter: 'blur(10px)', 
      zIndex: 20, 
      pointerEvents: 'auto',
      padding: '16px',
      boxSizing: 'border-box',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      <div style={{ 
        width: '100%',
        maxWidth: 900, 
        background: 'rgba(15,20,30,0.95)', 
        color: '#fff', 
        borderRadius: 16, 
        padding: window.innerWidth < 768 ? 16 : 32, 
        fontFamily: 'system-ui, -apple-system, sans-serif',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        marginTop: window.innerHeight > 900 ? 0 : '16px',
        marginBottom: '16px'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: window.innerWidth < 768 ? 20 : 32 }}>
          <h2 style={{ 
            fontSize: window.innerWidth < 768 ? '1.5rem' : '2rem', 
            marginTop: 0, 
            marginBottom: 8,
            background: 'linear-gradient(135deg, #f59e0b, #3b82f6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold',
            lineHeight: 1.2
          }}>
            🎨 Customize Your Experience
          </h2>
          <p style={{ 
            color: '#94a3b8', 
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem', 
            margin: 0,
            lineHeight: 1.4
          }}>
            Personalize your avatar and configure your world settings
          </p>
        </div>

        {/* Content Sections */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr', 
          gap: window.innerWidth < 768 ? 20 : 32, 
          marginBottom: window.innerWidth < 768 ? 20 : 32 
        }}>
          {/* Avatar Section */}
          <div style={{ 
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: window.innerWidth < 768 ? 16 : 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ 
                width: 40,
                height: 40,
                borderRadius: 20,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
                fontSize: '1.2rem'
              }}>
                👤
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#e2e8f0' }}>Avatar Customization</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Design your character appearance</p>
              </div>
              <label style={{ 
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}>
                <input 
                  type="checkbox" 
                  checked={showAvatar} 
                  onChange={(e) => setShowAvatar(e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                Enable
              </label>
            </div>
            
            {showAvatar && (
              <div style={{ 
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 8,
                padding: 16,
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <AvatarPanel />
                
                {/* Quick Presets */}
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: 8 }}>Quick Presets:</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => avatarStore.set(avatarStore.presets.presetA)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: 'rgba(59, 130, 246, 0.2)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: 6,
                        color: '#93c5fd',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Preset A
                    </button>
                    <button
                      onClick={() => avatarStore.set(avatarStore.presets.presetB)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: 'rgba(168, 85, 247, 0.2)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        borderRadius: 6,
                        color: '#c4b5fd',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Preset B
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Map Section */}
          <div style={{ 
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: window.innerWidth < 768 ? 16 : 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ 
                width: 40,
                height: 40,
                borderRadius: 20,
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
                fontSize: '1.2rem'
              }}>
                🗺️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#e2e8f0' }}>World Generation</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Configure procedural map settings</p>
              </div>
              <label style={{ 
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}>
                <input 
                  type="checkbox" 
                  checked={showMap} 
                  onChange={(e) => setShowMap(e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                Enable
              </label>
            </div>
            
            {showMap && (
              <div style={{ 
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 8,
                padding: 16,
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <MapControlsPanel />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          display: 'flex', 
          flexDirection: window.innerWidth < 768 ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: window.innerWidth < 768 ? 'stretch' : 'center',
          gap: window.innerWidth < 768 ? 16 : 0,
          paddingTop: window.innerWidth < 768 ? 16 : 24,
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ 
            fontSize: window.innerWidth < 768 ? '0.75rem' : '0.8rem', 
            color: '#64748b',
            textAlign: window.innerWidth < 768 ? 'center' : 'left',
            lineHeight: 1.4
          }}>
            💡 You can modify these settings anytime in-game
          </div>
          
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
              onContinue(); 
            }}
            style={{
              padding: window.innerWidth < 768 ? '16px 24px' : '14px 32px',
              fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.2s ease',
              transform: 'translateY(0)',
              width: window.innerWidth < 768 ? '100%' : 'auto'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
            }}
          >
            Continue to Room Selection →
          </button>
        </div>
      </div>
    </div>
  );
}



