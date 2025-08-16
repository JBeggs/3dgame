import React, { useEffect, useRef, useState } from 'react';
import { getPhysics } from '../game/physics';
import { inventory } from '../game/inventory';
import { getInput } from '../game/input';
import { Prompt } from './Prompt';
import { getAudio } from '../game/audio';

// Simple key collectible and a locked door that needs 1 key
export function Interactables() {
  const keyPos = [2, 0.5, 2] as const;
  const doorPos = [10, 0.5, 10] as const;
  const doorBody = useRef<ReturnType<typeof getPhysics>['playerBody'] | null>(null);
  const [opened, setOpened] = useState(false);
  const [showDoorPrompt, setShowDoorPrompt] = useState(false);
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  const [keyCollected, setKeyCollected] = useState(false);

  useEffect(() => {
    // Add a thin physics box for the door so it blocks until opened
    const phys = getPhysics();
    doorBody.current = phys.addStaticBox(doorPos[0], doorPos[1], doorPos[2], 0.2, 1.5, 2);
  }, []);

  // Proximity detection for both key collection and door interaction
  useEffect(() => {
    const interval = setInterval(() => {
      const body = getPhysics().playerBody;
      
      // Key collection proximity
      if (!keyCollected) {
        const keyDx = body.position.x - keyPos[0];
        const keyDz = body.position.z - keyPos[2];
        const nearKey = (keyDx*keyDx + keyDz*keyDz) < 1.0; // within 1m
        setShowKeyPrompt(nearKey);
        
        if (nearKey && getInput().state.action) {
          inventory.add('key', 1);
          getAudio().play('pickup');
          setKeyCollected(true);
          setShowKeyPrompt(false);
        }
      }
      
      // Door interaction proximity
      if (opened) { 
        setShowDoorPrompt(false); 
        return; 
      }
      const doorDx = body.position.x - doorPos[0];
      const doorDz = body.position.z - doorPos[2];
      const nearDoor = (doorDx*doorDx + doorDz*doorDz) < 2.0; // within ~1.4m
      setShowDoorPrompt(nearDoor);
      
      if (nearDoor) {
        tryOpenDoor(setOpened, doorBody);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [opened, keyCollected]);

  return (
    <>
      {/* Key - only show if not collected */}
      {!keyCollected && (
        <mesh position={keyPos as any}>
          <torusGeometry args={[0.15, 0.05, 8, 16]} />
          <meshStandardMaterial color="#ffd54a" emissive="#5c4700" emissiveIntensity={0.3} />
        </mesh>
      )}
      
      {/* Door visual - no click handler needed */}
      <mesh position={doorPos as any}>
        <boxGeometry args={[0.2, 1.5, 2]} />
        <meshStandardMaterial color={opened ? '#3b8' : (inventory.has('key', 1) ? '#fb0' : '#a33')} />
      </mesh>
      
      {/* Show key collection prompt */}
      {showKeyPrompt && !keyCollected && <Prompt text="Press E to take key" />}
      
      {/* Show door interaction prompt */}
      {showDoorPrompt && !opened && <Prompt text={inventory.has('key', 1) ? 'Press E to open' : 'Need 1 key'} />}
    </>
  );
}

function tryOpenDoor(setOpened: (v: boolean) => void, doorBody: React.MutableRefObject<any>) {
  if (getInput().state.action && inventory.consume('key', 1)) {
    setOpened(true);
    getAudio().play('door');
    const phys = getPhysics();
    if (doorBody.current) phys.removeBody(doorBody.current);
  }
}


