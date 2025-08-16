import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { createInput } from './input';
import { createPhysics } from './physics';

export function usePlayerController() {
  const input = useMemo(() => createInput(), []);
  const physics = useMemo(() => createPhysics(), []);
  const cameraTarget = useRef(new THREE.Vector3());

  useEffect(() => {
    input.attach();
    return () => input.detach();
  }, [input]);

  useFrame((_, dt) => {
    const { playerBody } = physics;
    const move = new THREE.Vector3(input.state.right, 0, -input.state.forward);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(6);
      playerBody.velocity.x = move.x;
      playerBody.velocity.z = move.z;
    } else {
      // damp on ground
      playerBody.velocity.x *= 0.9;
      playerBody.velocity.z *= 0.9;
    }
    physics.step(dt);
  });

  return { input, physics, cameraTarget } as const;
}

export function PlayerMesh() {
  const { physics } = usePlayerController();
  const ref = useRef<THREE.Mesh>(null!);
  const { camera } = useThree();

  useFrame(() => {
    const p = physics.playerBody.position;
    ref.current.position.set(p.x, p.y, p.z);
    // simple chase cam
    const camOffset = new THREE.Vector3(4, 3, 6);
    camera.position.lerp(new THREE.Vector3(p.x, p.y, p.z).add(camOffset), 0.1);
    camera.lookAt(p.x, p.y + 0.5, p.z);
  });

  return (
    <mesh ref={ref} castShadow>
      <capsuleGeometry args={[0.3, 0.6, 8, 16]} />
      <meshStandardMaterial color="#e0d1ff" />
    </mesh>
  );
}


