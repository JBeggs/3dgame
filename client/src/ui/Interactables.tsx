import React, { useEffect, useRef, useState } from 'react';
import { getPhysics } from '../game/physics';
import { inventory } from '../game/inventory';
import { getInput } from '../game/input';
import { Prompt } from './Prompt';

// Simple key collectible and a locked door that needs 1 key
export function Interactables() {
  const keyPos = [2, 0.5, 2] as const;
  const doorPos = [10, 0.5, 10] as const;
  const doorBody = useRef<ReturnType<typeof getPhysics>['playerBody'] | null>(null);
  const [opened, setOpened] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Add a thin physics box for the door so it blocks until opened
    const phys = getPhysics();
    doorBody.current = phys.addStaticBox(doorPos[0], doorPos[1], doorPos[2], 0.2, 1.5, 2);
  }, []);

  return (
    <>
      {/* Key */}
      <mesh position={keyPos as any} onClick={() => inventory.add('key', 1)}>
        <torusGeometry args={[0.15, 0.05, 8, 16]} />
        <meshStandardMaterial color="#ffd54a" emissive="#5c4700" emissiveIntensity={0.3} />
      </mesh>
      {/* Door visual */}
      <mesh position={doorPos as any} onPointerOver={() => setShowPrompt(true)} onPointerOut={() => setShowPrompt(false)} onClick={() => {
        tryOpenDoor(setOpened, doorBody);
      }}>
        <boxGeometry args={[0.2, 1.5, 2]} />
        <meshStandardMaterial color={opened ? '#3b8' : (inventory.has('key', 1) ? '#fb0' : '#a33')} />
      </mesh>
      {showPrompt && !opened && <Prompt text={inventory.has('key', 1) ? 'Press E to open' : 'Need 1 key'} />}
    </>
  );
}

function tryOpenDoor(setOpened: (v: boolean) => void, doorBody: React.MutableRefObject<any>) {
  if (getInput().state.action && inventory.consume('key', 1)) {
    setOpened(true);
    const phys = getPhysics();
    if (doorBody.current) phys.removeBody(doorBody.current);
  }
}


