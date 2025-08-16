import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getPhysics } from '../game/physics';
import { playerHealth } from '../game/health';
import { AIController, AIState } from './behaviors';
import { GridNav } from './pathfind';

// Enhanced spider with AI behaviors
export function Spider({ position = [6, 0.3, 6] as [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((_, dt) => {
    const p = getPhysics().playerBody.position;
    const m = ref.current.position;
    const dir = new THREE.Vector3(p.x - m.x, 0, p.z - m.z);
    const dist = dir.length();
    if (dist > 0.01) {
      dir.normalize();
      const speed = 1.5;
      m.x += dir.x * speed * dt;
      m.z += dir.z * speed * dt;
    }
    if (dist < 0.8) {
      playerHealth.damage(5 * dt);
    }
  });

  return (
    <mesh ref={ref} position={position as any} castShadow>
      <sphereGeometry args={[0.25, 12, 12]} />
      <meshStandardMaterial color="#3c0" />
    </mesh>
  );
}

// Advanced spider with AI behaviors and pathfinding
export function SmartSpider({ 
  grid, 
  cellSize, 
  position = [6, 0.3, 6] as [number, number, number] 
}: { 
  grid: GridNav; 
  cellSize: number; 
  position?: [number, number, number] 
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const [aiController] = useState(() => new AIController(grid, cellSize, new THREE.Vector3(...position)));
  const [currentState, setCurrentState] = useState<AIState>('idle');
  const [alertLevel, setAlertLevel] = useState(0);

  useEffect(() => {
    if (ref.current) {
      ref.current.position.set(...position);
    }
  }, [position]);

  useFrame((_, dt) => {
    const playerPos = getPhysics().playerBody.position;
    const playerVec = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z);
    
    // Update AI controller
    const moveVector = aiController.update(dt, playerVec);
    aiController.updatePosition(ref.current.position);
    
    // Apply movement
    if (moveVector.length() > 0) {
      const maxSpeed = currentState === 'chase' ? 2.5 : 1.5;
      const actualMove = moveVector.clone().multiplyScalar(Math.min(dt * maxSpeed, moveVector.length()));
      ref.current.position.add(actualMove);
    }
    
    // Update visual state
    const newState = aiController.getState();
    const newAlert = aiController.getAlertLevel();
    
    if (newState !== currentState) {
      setCurrentState(newState);
    }
    if (Math.abs(newAlert - alertLevel) > 0.1) {
      setAlertLevel(newAlert);
    }
    
    // Attack logic
    if (aiController.canAttack()) {
      const dist = ref.current.position.distanceTo(playerVec);
      if (dist < 1.2) {
        playerHealth.damage(8 * dt);
      }
    }
  });

  // Color based on state and alert level
  const getSpiderColor = () => {
    const baseColor = new THREE.Color('#3c0');
    const alertColor = new THREE.Color('#c30');
    
    switch (currentState) {
      case 'chase':
      case 'attack':
        return alertColor;
      case 'search':
        return baseColor.clone().lerp(alertColor, 0.5);
      default:
        return baseColor.clone().lerp(alertColor, alertLevel);
    }
  };

  // Scale based on state
  const getScale = () => {
    const baseScale = 1;
    const alertScale = 1.2;
    
    if (currentState === 'attack') {
      return alertScale * 1.1;
    }
    
    return baseScale + (alertScale - baseScale) * alertLevel;
  };

  return (
    <group>
      <mesh 
        ref={ref} 
        position={position as any} 
        scale={getScale()}
        castShadow
      >
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshStandardMaterial color={getSpiderColor()} />
      </mesh>
      
      {/* Alert indicator */}
      {alertLevel > 0.3 && (
        <mesh position={[ref.current?.position.x || position[0], (ref.current?.position.y || position[1]) + 0.8, ref.current?.position.z || position[2]]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial 
            color="#ff0" 
            emissive="#ff0" 
            emissiveIntensity={alertLevel} 
          />
        </mesh>
      )}
    </group>
  );
}


