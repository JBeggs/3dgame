import React from 'react';

export function Prompt({ text }: { text: string }) {
  return (
    <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.5)', padding: '6px 10px', borderRadius: 6, color: '#fff', fontFamily: 'monospace' }}>
      {text}
    </div>
  );
}


