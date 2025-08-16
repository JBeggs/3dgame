import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getPhysics } from '../game/physics';
import { AIController, AIState } from './behaviors';
import { GridNav } from './pathfind';
import { getProjectileManager } from '../game/projectiles';

// Flying ranged enemy that shoots projectiles at the player
export function Bat({ 
  grid, 
  cellSize, 
  position = [6, 2, 6] as [number, number, number] 
}: { 
  grid: GridNav; 
  cellSize: number; 
  position?: [number, number, number] 
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const [aiController] = useState(() => new AIController(grid, cellSize, new THREE.Vector3(...position)));
  const [currentState, setCurrentState] = useState<AIState>('idle');
  const [alertLevel, setAlertLevel] = useState(0);
  const [lastShotTime, setLastShotTime] = useState(0);
  const [wingPhase, setWingPhase] = useState(0);
  
  const projectileManager = getProjectileManager();
  const shotCooldown = 2000; // 2 seconds between shots
  const attackRange = 8; // Range at which bat starts shooting
  const flightHeight = 2; // Height above ground

  useEffect(() => {
    if (ref.current) {
      ref.current.position.set(position[0], position[1], position[2]);
    }
  }, [position]);

  useFrame((_, dt) => {
    const playerPos = getPhysics().playerBody.position;
    const playerVec = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z);
    
    // Update AI controller (but modify behavior for flying enemy)
    const moveVector = aiController.update(dt, playerVec);
    const currentPos = ref.current.position;
    aiController.updatePosition(currentPos);
    
    // Calculate distance to player
    const distanceToPlayer = currentPos.distanceTo(playerVec);
    
    // Flying movement behavior
    const targetHeight = flightHeight;
    let targetPosition = currentPos.clone();
    
    const newState = aiController.getState();
    const newAlert = aiController.getAlertLevel();
    
    switch (newState) {
      case 'idle':
      case 'patrol':
        // Gentle hovering movement
        if (moveVector.length() > 0) {
          targetPosition.add(moveVector.clone().multiplyScalar(dt * 1.0));
        }
        // Add some floating motion
        setWingPhase(prev => prev + dt * 4);
        targetPosition.y = targetHeight + Math.sin(wingPhase) * 0.2;
        break;
        
      case 'chase':
        // Fly towards player but maintain distance for shooting
        if (distanceToPlayer > attackRange * 0.7) {
          // Get closer
          const direction = playerVec.clone().sub(currentPos).normalize();
          direction.y = 0; // Don't chase vertically
          targetPosition.add(direction.multiplyScalar(dt * 2.5));
        } else if (distanceToPlayer < attackRange * 0.5) {
          // Back away to maintain shooting distance
          const direction = currentPos.clone().sub(playerVec).normalize();
          direction.y = 0;
          targetPosition.add(direction.multiplyScalar(dt * 1.5));
        }
        // Maintain flight height with some evasive movement
        setWingPhase(prev => prev + dt * 6);
        targetPosition.y = targetHeight + Math.sin(wingPhase) * 0.3 + Math.cos(wingPhase * 1.3) * 0.2;
        break;
        
      case 'search':
        // Search behavior - fly around looking for player
        if (moveVector.length() > 0) {
          targetPosition.add(moveVector.clone().multiplyScalar(dt * 1.8));
        }
        setWingPhase(prev => prev + dt * 5);
        targetPosition.y = targetHeight + Math.sin(wingPhase) * 0.25;
        break;
        
      case 'attack':
        // Hover and shoot
        setWingPhase(prev => prev + dt * 8);
        targetPosition.y = targetHeight + Math.sin(wingPhase) * 0.1;
        
        // Shoot projectile if cooldown is ready
        const now = Date.now();
        if (now - lastShotTime > shotCooldown && distanceToPlayer <= attackRange) {
          // Aim slightly ahead of player if they're moving
          const playerBody = getPhysics().playerBody;
          const playerVelocity = new THREE.Vector3(
            playerBody.velocity.x,
            playerBody.velocity.y,
            playerBody.velocity.z
          );
          
          // Predict where player will be
          const timeToHit = distanceToPlayer / 8; // Projectile speed is 8
          const predictedPos = playerVec.clone().add(playerVelocity.multiplyScalar(timeToHit));
          
          // Create projectile
          const shootPos = currentPos.clone();
          shootPos.y -= 0.2; // Shoot from slightly below center
          
          projectileManager.createProjectile(
            shootPos,
            predictedPos,
            8, // Speed
            12, // Damage
            'spit', // Green spit projectile
            `bat-${ref.current.uuid}` // Owner ID
          );
          
          setLastShotTime(now);
        }
        break;
    }
    
    // Apply movement with smooth interpolation
    ref.current.position.lerp(targetPosition, dt * 3);
    
    // Update visual state
    if (newState !== currentState) {
      setCurrentState(newState);
    }
    if (Math.abs(newAlert - alertLevel) > 0.1) {
      setAlertLevel(newAlert);
    }
  });

  // Color and scale based on state
  const getBatColor = () => {
    const baseColor = new THREE.Color('#4a4a4a');
    const alertColor = new THREE.Color('#8b0000');
    
    switch (currentState) {
      case 'chase':
      case 'attack':
        return alertColor;
      case 'search':
        return baseColor.clone().lerp(alertColor, 0.6);
      default:
        return baseColor.clone().lerp(alertColor, alertLevel);
    }
  };

  const getScale = () => {
    const baseScale = 0.8;
    const alertScale = 1.0;
    const wingFlap = Math.sin(wingPhase) * 0.1 + 1;
    
    if (currentState === 'attack') {
      return (alertScale * 1.1) * wingFlap;
    }
    
    return (baseScale + (alertScale - baseScale) * alertLevel) * wingFlap;
  };

  return (
    <group>
      {/* Bat Body */}
      <mesh 
        ref={ref} 
        position={position as any} 
        scale={getScale()}
        castShadow
      >
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color={getBatColor()} />
      </mesh>
      
      {/* Wings */}
      <mesh position={[ref.current?.position.x || position[0], (ref.current?.position.y || position[1]) + 0.1, ref.current?.position.z || position[2]]}>
        <group rotation={[0, 0, Math.sin(wingPhase) * 0.5]}>
          {/* Left Wing */}
          <mesh position={[-0.4, 0, 0]} rotation={[0, 0, Math.sin(wingPhase) * 0.3]}>
            <planeGeometry args={[0.6, 0.3]} />
            <meshStandardMaterial 
              color={getBatColor()} 
              transparent 
              opacity={0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
          
          {/* Right Wing */}
          <mesh position={[0.4, 0, 0]} rotation={[0, 0, -Math.sin(wingPhase) * 0.3]}>
            <planeGeometry args={[0.6, 0.3]} />
            <meshStandardMaterial 
              color={getBatColor()} 
              transparent 
              opacity={0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
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
      
      {/* Shooting indicator */}
      {currentState === 'attack' && Date.now() - lastShotTime < 200 && (
        <mesh position={[ref.current?.position.x || position[0], (ref.current?.position.y || position[1]) - 0.2, ref.current?.position.z || position[2]]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial 
            color="#9acd32" 
            emissive="#9acd32" 
            emissiveIntensity={0.8} 
          />
        </mesh>
      )}
    </group>
  );
}
