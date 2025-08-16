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
      <GameCanvas showConfigPanels={false} />
      
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
    </div>
  );
}

const el = document.getElementById('root')!;
createRoot(el).render(<App />);

// Expose quick room join
const net = connect();
(window as any).netJoin = (room: string) => net.joinRoom(room);


