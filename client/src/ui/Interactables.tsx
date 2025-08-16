import React, { useEffect } from 'react';
import { getPhysics } from '../game/physics';
import { inventory } from '../game/inventory';

// Simple key collectible and a locked door that needs 1 key
export function Interactables() {
  const keyPos = [2, 0.5, 2] as const;
  const doorPos = [10, 0.5, 10] as const;

  useEffect(() => {
    // Add a thin physics box for the door so it blocks until opened
    const phys = getPhysics();
    phys.addStaticBox(doorPos[0], doorPos[1], doorPos[2], 0.2, 1.5, 2);
  }, []);

  return (
    <>
      {/* Key */}
      <mesh position={keyPos as any} onClick={() => inventory.add('key', 1)}>
        <torusGeometry args={[0.15, 0.05, 8, 16]} />
        <meshStandardMaterial color="#ffd54a" emissive="#5c4700" emissiveIntensity={0.3} />
      </mesh>
      {/* Door visual */}
      <mesh position={doorPos as any}>
        <boxGeometry args={[0.2, 1.5, 2]} />
        <meshStandardMaterial color={inventory.has('key', 1) ? '#3b8' : '#a33'} />
      </mesh>
    </>
  );
}


