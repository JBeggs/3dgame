import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAvatar } from './store';

// Placeholder modular avatar composed of simple primitives
export function AvatarRoot({ position = [0, 0, 0] as [number, number, number] }) {
  const cfg = useAvatar();
  const primary = new THREE.Color(cfg.colors.primary);
  const secondary = new THREE.Color(cfg.colors.secondary);
  return (
    <group position={position as any}>
      {/* Body */}
      <mesh castShadow>
        <capsuleGeometry args={[0.3, 0.6, 8, 16]} />
        <meshStandardMaterial color={primary} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color={secondary} />
      </mesh>
      {/* Outfit piece (e.g., shoulder pad) */}
      <mesh position={[0.35, 0.5, 0]} castShadow>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshStandardMaterial color={secondary} />
      </mesh>
    </group>
  );
}


