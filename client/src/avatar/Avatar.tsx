import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAvatar } from './store';
import { loadGLTFPart } from './loader';

// Placeholder modular avatar composed of simple primitives
export function AvatarRoot({ position = [0, 0, 0] as [number, number, number] }) {
  const cfg = useAvatar();
  const primary = new THREE.Color(cfg.colors.primary);
  const secondary = new THREE.Color(cfg.colors.secondary);
  const groupRef = useRef<THREE.Group>(null!);
  const [loadedBody, setLoadedBody] = useState<THREE.Object3D | null>(null);
  const [loadedHead, setLoadedHead] = useState<THREE.Object3D | null>(null);
  const [loadedOutfit, setLoadedOutfit] = useState<THREE.Object3D | null>(null);

  useEffect(() => { loadGLTFPart(cfg.bodyId).then(setLoadedBody); }, [cfg.bodyId]);
  useEffect(() => { loadGLTFPart(cfg.headId).then(setLoadedHead); }, [cfg.headId]);
  useEffect(() => { loadGLTFPart(cfg.outfitId).then(setLoadedOutfit); }, [cfg.outfitId]);

  return (
    <group ref={groupRef} position={position as any}>
      {/* Body */}
      {loadedBody ? <primitive object={loadedBody.clone()} /> : (
        <mesh castShadow>
          <capsuleGeometry args={[0.3, 0.6, 8, 16]} />
          <meshStandardMaterial color={primary} />
        </mesh>
      )}
      {/* Head */}
      {loadedHead ? <primitive object={loadedHead.clone()} position={[0, 0.9, 0]} /> : (
        <mesh position={[0, 0.9, 0]} castShadow>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial color={secondary} />
        </mesh>
      )}
      {/* Outfit */}
      {loadedOutfit ? <primitive object={loadedOutfit.clone()} /> : (
        <mesh position={[0.35, 0.5, 0]} castShadow>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshStandardMaterial color={secondary} />
        </mesh>
      )}
    </group>
  );
}


