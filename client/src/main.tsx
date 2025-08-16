import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GameCanvas } from './ui/GameCanvas';
import { MainLandingPage } from './ui/MainLandingPage';
import { AvatarSetupScreen } from './ui/LandingScreen';
import { RoomSelectionScreen } from './ui/RoomSelectionScreen';
import { connect } from './net/net';

type AppScreen = 'landing' | 'avatar' | 'rooms' | 'game';

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('landing');
  
  return (
    <div style={{ width: '100%', height: '100%' }}>
      {/* Only show game canvas and controls when in game mode */}
      {currentScreen === 'game' && <GameCanvas showConfigPanels={false} />}
      
      {/* Multi-page flow */}
      {currentScreen === 'landing' && (
        <MainLandingPage onPlayGame={() => setCurrentScreen('avatar')} />
      )}
      
      {currentScreen === 'avatar' && (
        <AvatarSetupScreen onContinue={() => setCurrentScreen('rooms')} />
      )}
      
      {currentScreen === 'rooms' && (
        <RoomSelectionScreen onContinue={() => setCurrentScreen('game')} />
      )}
      
      {/* Quick bypass for development - remove this in production */}
      {currentScreen !== 'game' && (
        <button
          onClick={() => setCurrentScreen('game')}
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            background: '#22c55e',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            zIndex: 1000
          }}
        >
          🎮 Skip to Game
        </button>
      )}
    </div>
  );
}

const el = document.getElementById('root')!;
createRoot(el).render(<App />);

// Expose quick room join
const net = connect();
(window as any).netJoin = (room: string) => net.joinRoom(room);

// Expose avatar API for console testing
import { avatarStore } from './avatar/store';
import { clearAvatarCache } from './avatar/loader';
(window as any).gameApi = {
  ...((window as any).gameApi || {}),
  setAvatar: avatarStore.set.bind(avatarStore),
  getAvatar: avatarStore.get.bind(avatarStore),
  clearAvatarCache,
  testAvatar: () => {
    console.log('🎭 Current avatar config:', avatarStore.get());
    console.log('🎨 Testing color change...');
    avatarStore.set({ colors: { primary: '#ff0000', secondary: '#00ff00' } });
    console.log('✅ Try: window.gameApi.setAvatar({ colors: { primary: "#0000ff" } })');
  },
  testAnimations: () => {
    console.log('🎬 Testing animation system...');
    clearAvatarCache();
    avatarStore.set({ bodyId: 'bodyA' }); // Force reload
    console.log('✅ Cache cleared and bodyA reloading. Check console for animation debug info.');
  },
  testBodyB: () => {
    console.log('🧠 Testing BrainStem model (bodyB) - should have animations...');
    clearAvatarCache();
    avatarStore.set({ bodyId: 'bodyB' });
    console.log('✅ Switched to bodyB. Check console for animation debug info.');
  },
  testBodyC: () => {
    console.log('🤖 Testing RiggedFigure model (bodyC)...');
    clearAvatarCache();
    avatarStore.set({ bodyId: 'bodyC' });
    console.log('✅ Switched to bodyC. Check console for animation debug info.');
  }
};


