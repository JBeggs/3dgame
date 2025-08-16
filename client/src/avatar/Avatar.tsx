import React from 'react';
import * as THREE from 'three';
import { useAvatar } from './store';

// Simple humanoid avatar using basic shapes - no more fox!
export function AvatarRoot({ 
  position = [0, 0, 0] as [number, number, number],
  rotation = 0 // Y-axis rotation in radians
}) {
  const cfg = useAvatar();
  const primary = new THREE.Color(cfg.colors.primary);
  const secondary = new THREE.Color(cfg.colors.secondary);
  const accent = new THREE.Color(cfg.colors.accent);
  const accessoryColor = new THREE.Color(cfg.colors.accessory);
  
  // Debug logging for rotation
  console.log('👤 AvatarRoot rotation:', {
    rotation: rotation,
    rotationDegrees: `${(rotation * 180 / Math.PI).toFixed(0)}°`
  });
  // DISABLE GLB LOADING - using simple shapes instead
  // const [loadedBody, setLoadedBody] = useState<THREE.Object3D | null>(null);
  // const [loadedHead, setLoadedHead] = useState<THREE.Object3D | null>(null);
  // const [loadedOutfit, setLoadedOutfit] = useState<THREE.Object3D | null>(null);
  // const [loadedAccessories, setLoadedAccessories] = useState<Record<string, THREE.Object3D | null>>({});
  // REMOVED ANIMATION REFS AND STATE - using simple shapes now

  // REMOVED GLB LOADING - using simple shapes instead

  // REMOVED ANIMATION SYSTEM - using simple shapes now

  // REMOVED ANIMATION STATE MACHINE - using simple shapes now

  // REMOVED ANIMATION FRAME UPDATES - using simple shapes now

  return (
    <group position={position as any} rotation={[0, rotation, 0]}>
      {/* PROPER HUMANOID AVATAR - NO MORE FOX! */}
      
      {/* Head */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={primary} />
      </mesh>
      
      {/* Torso */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.4, 0.6, 0.2]} />
        <meshStandardMaterial color={secondary} />
      </mesh>
      
      {/* Left Arm */}
      <mesh position={[-0.3, 0.4, 0]} castShadow>
        <boxGeometry args={[0.12, 0.5, 0.12]} />
        <meshStandardMaterial color={primary} />
      </mesh>
      
      {/* Right Arm */}
      <mesh position={[0.3, 0.4, 0]} castShadow>
        <boxGeometry args={[0.12, 0.5, 0.12]} />
        <meshStandardMaterial color={primary} />
      </mesh>
      
      {/* Left Leg */}
      <mesh position={[-0.15, -0.3, 0]} castShadow>
        <boxGeometry args={[0.15, 0.6, 0.15]} />
        <meshStandardMaterial color={accent} />
      </mesh>
      
      {/* Right Leg */}
      <mesh position={[0.15, -0.3, 0]} castShadow>
        <boxGeometry args={[0.15, 0.6, 0.15]} />
        <meshStandardMaterial color={accent} />
      </mesh>
      
      {/* Feet */}
      <mesh position={[-0.15, -0.65, 0.08]} castShadow>
        <boxGeometry args={[0.15, 0.08, 0.25]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>
      <mesh position={[0.15, -0.65, 0.08]} castShadow>
        <boxGeometry args={[0.15, 0.08, 0.25]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>
      
      {/* Front indicator - small red cube to show which way is forward */}
      <mesh position={[0, 0.5, 0.25]} castShadow>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshStandardMaterial color="#ff0000" />
      </mesh>
      
      {/* Optional Hat */}
      {cfg.accessories.hat && (
        <mesh position={[0, 1.1, 0]} castShadow>
          <coneGeometry args={[0.2, 0.3, 8]} />
          <meshStandardMaterial color={accessoryColor} />
        </mesh>
      )}
      
      {/* Optional Cape */}
      {cfg.accessories.cape && (
        <mesh position={[0, 0.5, -0.15]} rotation={[0,0,0]} castShadow>
          <planeGeometry args={[0.4, 0.6]} />
          <meshStandardMaterial color={accessoryColor} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}


