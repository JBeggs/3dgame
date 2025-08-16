import React from 'react';

export function MainLandingPage({ onPlayGame }: { onPlayGame: () => void }) {
  return (
    <div style={{ 
      position: 'absolute', 
      inset: 0, 
      display: 'flex', 
      alignItems: window.innerHeight > 800 ? 'center' : 'flex-start', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(20,30,48,0.9) 100%)', 
      backdropFilter: 'blur(10px)', 
      zIndex: 30, 
      pointerEvents: 'auto',
      padding: '16px',
      boxSizing: 'border-box',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      <div style={{ 
        width: '100%',
        maxWidth: 600, 
        background: 'rgba(15,20,30,0.95)', 
        color: '#fff', 
        borderRadius: 16, 
        padding: window.innerWidth < 768 ? 20 : 32, 
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textAlign: 'center',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        marginTop: window.innerHeight > 800 ? 0 : '16px',
        marginBottom: '16px'
      }}>
        {/* Game Title */}
        <h1 style={{ 
          fontSize: window.innerWidth < 768 ? '2rem' : '2.5rem', 
          marginTop: 0, 
          marginBottom: 16,
          background: 'linear-gradient(135deg, #4ade80, #3b82f6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold',
          lineHeight: 1.2
        }}>
          🌍 3D Multiplayer Adventure
        </h1>
        
        {/* Game Description */}
        <div style={{ fontSize: '1.1rem', lineHeight: 1.6, marginBottom: 32, color: '#e2e8f0' }}>
          <p style={{ marginBottom: 16 }}>
            Explore procedurally generated dungeons in this immersive 3D multiplayer experience.
          </p>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr', 
            gap: window.innerWidth < 768 ? 16 : 20, 
            marginBottom: 24 
          }}>
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ color: '#4ade80', fontSize: '1rem', marginBottom: 8 }}>🎮 Features</h3>
              <ul style={{ fontSize: '0.9rem', color: '#cbd5e1', paddingLeft: 16, margin: 0 }}>
                <li>Real-time multiplayer</li>
                <li>Customizable avatars</li>
                <li>Procedural dungeons</li>
                <li>Cross-platform play</li>
              </ul>
            </div>
            
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ color: '#3b82f6', fontSize: '1rem', marginBottom: 8 }}>⚔️ Gameplay</h3>
              <ul style={{ fontSize: '0.9rem', color: '#cbd5e1', paddingLeft: 16, margin: 0 }}>
                <li>Collect treasures</li>
                <li>Fight creatures</li>
                <li>Unlock doors</li>
                <li>Explore together</li>
              </ul>
            </div>
          </div>
          
          <div style={{ 
            background: 'rgba(59, 130, 246, 0.1)', 
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 8,
            padding: 16,
            fontSize: '0.9rem',
            color: '#93c5fd'
          }}>
            💡 <strong>Tip:</strong> Works best on desktop, but mobile controls are available too!
          </div>
        </div>
        
        {/* Controls Info */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr', 
          gap: 16, 
          marginBottom: window.innerWidth < 768 ? 24 : 32,
          fontSize: '0.85rem',
          color: '#94a3b8'
        }}>
          <div style={{ 
            background: 'rgba(255,255,255,0.05)', 
            padding: 12, 
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#e2e8f0' }}>🖥️ Desktop</div>
            <div>WASD to move</div>
            <div>Space to jump</div>
            <div>E to interact</div>
          </div>
          
          <div style={{ 
            background: 'rgba(255,255,255,0.05)', 
            padding: 12, 
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#e2e8f0' }}>📱 Mobile</div>
            <div>Touch joystick to move</div>
            <div>Jump button</div>
            <div>Tap to interact</div>
          </div>
        </div>
        
        {/* Play Button */}
        <button 
          onClick={onPlayGame}
          style={{
            padding: '16px 48px',
            fontSize: '1.2rem',
            background: 'linear-gradient(135deg, #4ade80, #22c55e)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 8px 20px rgba(34, 197, 94, 0.3)',
            transition: 'all 0.2s ease',
            transform: 'translateY(0)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(34, 197, 94, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(34, 197, 94, 0.3)';
          }}
        >
          🚀 Play Game
        </button>
        
        {/* Version Info */}
        <div style={{ 
          marginTop: 24, 
          fontSize: '0.75rem', 
          color: '#64748b',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: 16
        }}>
          3D WebView Game • Built with Three.js & React • v1.0.0
        </div>
      </div>
    </div>
  );
}
