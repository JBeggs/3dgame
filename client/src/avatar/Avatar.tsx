import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAvatar } from './store';
import { loadGLTFPart } from './loader';

// Placeholder modular avatar composed of simple primitives
export function AvatarRoot({ position = [0, 0, 0] as [number, number, number], speed = 0 }) {
  const cfg = useAvatar();
  const primary = new THREE.Color(cfg.colors.primary);
  const secondary = new THREE.Color(cfg.colors.secondary);
  const groupRef = useRef<THREE.Group>(null!);
  const [loadedBody, setLoadedBody] = useState<THREE.Object3D | null>(null);
  const [loadedHead, setLoadedHead] = useState<THREE.Object3D | null>(null);
  const [loadedOutfit, setLoadedOutfit] = useState<THREE.Object3D | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<{ idle?: THREE.AnimationAction; run?: THREE.AnimationAction }>({});

  useEffect(() => { loadGLTFPart(cfg.bodyId).then(setLoadedBody); }, [cfg.bodyId]);
  useEffect(() => { loadGLTFPart(cfg.headId).then(setLoadedHead); }, [cfg.headId]);
  useEffect(() => { loadGLTFPart(cfg.outfitId).then(setLoadedOutfit); }, [cfg.outfitId]);

  // If the body GLTF has animations named Idle/Run, set up a mixer and blend by speed
  useEffect(() => {
    const root = loadedBody as any;
    if (!root || !root.animations || root.animations.length === 0) return;
    const mixer = new THREE.AnimationMixer(root);
    mixerRef.current = mixer;
    const idleClip = root.animations.find((a: THREE.AnimationClip) => /idle/i.test(a.name));
    const runClip = root.animations.find((a: THREE.AnimationClip) => /run|walk/i.test(a.name));
    if (idleClip) actionsRef.current.idle = mixer.clipAction(idleClip).play();
    if (runClip) actionsRef.current.run = mixer.clipAction(runClip).play();
    return () => { mixer.stopAllAction(); };
  }, [loadedBody]);

  useFrame((_, dt) => {
    const mixer = mixerRef.current; if (!mixer) return;
    mixer.update(dt);
    const s = Math.min(1, speed / 3);
    const idle = actionsRef.current.idle; const run = actionsRef.current.run;
    if (idle) idle.weight = 1 - s;
    if (run) run.weight = s;
  });

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
      {/* Accessory slot: simple hat/cape placeholders */}
      {cfg.accessoryId === 'hatA' && (
        <mesh position={[0, 1.2, 0]} castShadow>
          <coneGeometry args={[0.2, 0.3, 8]} />
          <meshStandardMaterial color={secondary} />
        </mesh>
      )}
      {cfg.accessoryId === 'capeA' && (
        <mesh position={[0, 0.7, -0.15]} rotation={[0,0,0]} castShadow>
          <planeGeometry args={[0.4, 0.6]} />
          <meshStandardMaterial color={primary} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}


