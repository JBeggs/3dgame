import React from 'react';
import { createRoot } from 'react-dom/client';
import { GameCanvas } from './ui/GameCanvas';

function App() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <GameCanvas />
    </div>
  );
}

const el = document.getElementById('root')!;
createRoot(el).render(<App />);


