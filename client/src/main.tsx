import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GameCanvas } from './ui/GameCanvas';
import { LandingScreen } from './ui/LandingScreen';

function App() {
  const [started, setStarted] = useState(false);
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <GameCanvas showConfigPanels={false} />
      {!started && <LandingScreen onStart={() => setStarted(true)} />}
    </div>
  );
}

const el = document.getElementById('root')!;
createRoot(el).render(<App />);


