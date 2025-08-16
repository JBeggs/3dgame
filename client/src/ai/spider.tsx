import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getPhysics } from '../game/physics';
import { playerHealth } from '../game/health';

// Very simple spider that moves toward the player and deals contact damage
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


