import React, { useEffect, useRef, useState } from 'react';
import { getPhysics } from '../game/physics';
import { inventory } from '../game/inventory';
import { getInput } from '../game/input';
import { Prompt } from './Prompt';
import { getAudio } from '../game/audio';

// Color key types and their properties
type KeyColor = 'red' | 'blue' | 'green' | 'yellow';

interface KeyData {
  id: string;
  color: KeyColor;
  position: [number, number, number];
  meshColor: string;
  emissiveColor: string;
  collected: boolean;
}

interface DoorData {
  id: string;
  keyColor: KeyColor;
  position: [number, number, number];
  closedColor: string;
  openColor: string;
  lockedColor: string;
  opened: boolean;
  physicsBody: ReturnType<typeof getPhysics>['playerBody'] | null;
}

// Multiple keys and doors with color coding
export function Interactables() {
  // Define multiple keys with different colors
  const [keys, setKeys] = useState<KeyData[]>([
    {
      id: 'red-key',
      color: 'red',
      position: [2, 0.5, 2],
      meshColor: '#ff4444',
      emissiveColor: '#8b0000',
      collected: false
    },
    {
      id: 'blue-key',
      color: 'blue',
      position: [6, 0.5, 3],
      meshColor: '#4444ff',
      emissiveColor: '#000088',
      collected: false
    },
    {
      id: 'green-key',
      color: 'green',
      position: [12, 0.5, 8],
      meshColor: '#44ff44',
      emissiveColor: '#008800',
      collected: false
    }
  ]);

  // Define multiple doors requiring different keys
  const [doors, setDoors] = useState<DoorData[]>([
    {
      id: 'red-door',
      keyColor: 'red',
      position: [10, 0.5, 10],
      closedColor: '#aa3333',
      openColor: '#33aa33',
      lockedColor: '#663333',
      opened: false,
      physicsBody: null
    },
    {
      id: 'blue-door',
      keyColor: 'blue',
      position: [15, 0.5, 5],
      closedColor: '#3333aa',
      openColor: '#33aa33',
      lockedColor: '#333366',
      opened: false,
      physicsBody: null
    },
    {
      id: 'green-door',
      keyColor: 'green',
      position: [8, 0.5, 15],
      closedColor: '#33aa33',
      openColor: '#33aa33',
      lockedColor: '#336633',
      opened: false,
      physicsBody: null
    }
  ]);

  const [currentPrompt, setCurrentPrompt] = useState<string>('');

  // Initialize door physics bodies
  useEffect(() => {
    const phys = getPhysics();
    setDoors(prevDoors => 
      prevDoors.map(door => ({
        ...door,
        physicsBody: phys.addStaticBox(door.position[0], door.position[1], door.position[2], 0.2, 1.5, 2)
      }))
    );
  }, []);

  // Proximity detection for keys and doors
  useEffect(() => {
    const interval = setInterval(() => {
      const body = getPhysics().playerBody;
      let nearestPrompt = '';
      
      // Check key collection proximity
      keys.forEach((key, index) => {
        if (key.collected) return;
        
        const dx = body.position.x - key.position[0];
        const dz = body.position.z - key.position[2];
        const distance = Math.sqrt(dx*dx + dz*dz);
        
        if (distance < 1.0) { // within 1m
          nearestPrompt = `Press E to take ${key.color} key`;
          
          if (getInput().state.action) {
            inventory.add(`${key.color}-key`, 1);
            getAudio().play('pickup');
            setKeys(prevKeys => {
              const newKeys = [...prevKeys];
              newKeys[index] = { ...key, collected: true };
              return newKeys;
            });
          }
        }
      });
      
      // Check door interaction proximity
      doors.forEach((door, index) => {
        if (door.opened) return;
        
        const dx = body.position.x - door.position[0];
        const dz = body.position.z - door.position[2];
        const distance = Math.sqrt(dx*dx + dz*dz);
        
        if (distance < 2.0) { // within ~1.4m
          const hasKey = inventory.has(`${door.keyColor}-key`, 1);
          nearestPrompt = hasKey 
            ? `Press E to open ${door.keyColor} door` 
            : `Need ${door.keyColor} key`;
          
          if (hasKey && getInput().state.action) {
            if (inventory.consume(`${door.keyColor}-key`, 1)) {
              getAudio().play('door');
              const phys = getPhysics();
              if (door.physicsBody) phys.removeBody(door.physicsBody);
              
              setDoors(prevDoors => {
                const newDoors = [...prevDoors];
                newDoors[index] = { ...door, opened: true };
                return newDoors;
              });
            }
          }
        }
      });
      
      setCurrentPrompt(nearestPrompt);
    }, 100);
    return () => clearInterval(interval);
  }, [keys, doors]);

  return (
    <>
      {/* Render all keys - only show if not collected */}
      {keys.map(key => 
        !key.collected && (
          <group key={key.id}>
            <mesh position={key.position as any}>
              <torusGeometry args={[0.15, 0.05, 8, 16]} />
              <meshStandardMaterial 
                color={key.meshColor} 
                emissive={key.emissiveColor} 
                emissiveIntensity={0.4} 
              />
            </mesh>
            {/* Add floating animation */}
            <mesh position={[key.position[0], key.position[1] + Math.sin(Date.now() * 0.003) * 0.1, key.position[2]]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshBasicMaterial 
                color={key.meshColor} 
                transparent 
                opacity={0.6} 
              />
            </mesh>
          </group>
        )
      )}
      
      {/* Render all doors */}
      {doors.map(door => (
        <group key={door.id}>
          <mesh position={door.position as any}>
            <boxGeometry args={[0.2, 1.5, 2]} />
            <meshStandardMaterial 
              color={
                door.opened 
                  ? door.openColor 
                  : inventory.has(`${door.keyColor}-key`, 1) 
                    ? door.closedColor 
                    : door.lockedColor
              } 
            />
          </mesh>
          {/* Add key symbol indicator on door */}
          <mesh position={[door.position[0] + 0.15, door.position[1] + 0.3, door.position[2]]}>
            <torusGeometry args={[0.08, 0.02, 6, 12]} />
            <meshBasicMaterial 
              color={door.keyColor === 'red' ? '#ff4444' : 
                    door.keyColor === 'blue' ? '#4444ff' : 
                    door.keyColor === 'green' ? '#44ff44' : '#ffff44'} 
            />
          </mesh>
        </group>
      ))}
      
      {/* Show current prompt */}
      {currentPrompt && <Prompt text={currentPrompt} />}
    </>
  );
}


