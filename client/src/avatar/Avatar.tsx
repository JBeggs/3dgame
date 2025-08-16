import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAvatar } from './store';
import { loadGLTFPart } from './loader';

export type AnimationState = 'idle' | 'running' | 'jumping' | 'falling' | 'landing';

// Placeholder modular avatar composed of simple primitives
export function AvatarRoot({ 
  position = [0, 0, 0] as [number, number, number], 
  speed = 0, 
  isGrounded = true,
  verticalVelocity = 0 
}) {
  const cfg = useAvatar();
  const primary = new THREE.Color(cfg.colors.primary);
  const secondary = new THREE.Color(cfg.colors.secondary);
  const accent = new THREE.Color(cfg.colors.accent);
  const accessoryColor = new THREE.Color(cfg.colors.accessory);
  const groupRef = useRef<THREE.Group>(null!);
  const [loadedBody, setLoadedBody] = useState<THREE.Object3D | null>(null);
  const [loadedHead, setLoadedHead] = useState<THREE.Object3D | null>(null);
  const [loadedOutfit, setLoadedOutfit] = useState<THREE.Object3D | null>(null);
  const [loadedAccessories, setLoadedAccessories] = useState<Record<string, THREE.Object3D | null>>({});
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<{ 
    idle?: THREE.AnimationAction; 
    run?: THREE.AnimationAction;
    jump?: THREE.AnimationAction;
    fall?: THREE.AnimationAction;
    land?: THREE.AnimationAction;
  }>({});
  const [animState, setAnimState] = useState<AnimationState>('idle');
  const [wasGrounded, setWasGrounded] = useState(true);
  const landingTimerRef = useRef(0);

  useEffect(() => { loadGLTFPart(cfg.bodyId).then(setLoadedBody); }, [cfg.bodyId]);
  useEffect(() => { loadGLTFPart(cfg.headId).then(setLoadedHead); }, [cfg.headId]);
  useEffect(() => { loadGLTFPart(cfg.outfitId).then(setLoadedOutfit); }, [cfg.outfitId]);

  // Load accessories
  useEffect(() => {
    const loadAccessories = async () => {
      const loaded: Record<string, THREE.Object3D | null> = {};
      for (const [slot, id] of Object.entries(cfg.accessories)) {
        if (id) {
          try {
            loaded[slot] = await loadGLTFPart(id);
          } catch {
            loaded[slot] = null;
          }
        }
      }
      setLoadedAccessories(loaded);
    };
    loadAccessories();
  }, [cfg.accessories]);

  // If the body GLTF has animations, set up a mixer and find all animation clips
  useEffect(() => {
    const root = loadedBody as any;
    if (!root || !root.animations || root.animations.length === 0) return;
    const mixer = new THREE.AnimationMixer(root);
    mixerRef.current = mixer;
    
    // Find animation clips by name patterns
    const idleClip = root.animations.find((a: THREE.AnimationClip) => /idle/i.test(a.name));
    const runClip = root.animations.find((a: THREE.AnimationClip) => /run|walk/i.test(a.name));
    const jumpClip = root.animations.find((a: THREE.AnimationClip) => /jump/i.test(a.name));
    const fallClip = root.animations.find((a: THREE.AnimationClip) => /fall/i.test(a.name));
    const landClip = root.animations.find((a: THREE.AnimationClip) => /land/i.test(a.name));
    
    // Set up actions with proper settings
    if (idleClip) {
      const action = mixer.clipAction(idleClip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      actionsRef.current.idle = action.play();
    }
    if (runClip) {
      const action = mixer.clipAction(runClip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      actionsRef.current.run = action.play();
    }
    if (jumpClip) {
      const action = mixer.clipAction(jumpClip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      actionsRef.current.jump = action;
    }
    if (fallClip) {
      const action = mixer.clipAction(fallClip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      actionsRef.current.fall = action;
    }
    if (landClip) {
      const action = mixer.clipAction(landClip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      actionsRef.current.land = action;
    }
    
    return () => { mixer.stopAllAction(); };
  }, [loadedBody]);

  // Animation state machine logic
  useEffect(() => {
    // Determine animation state based on physics
    let newState: AnimationState = animState;
    
    if (!isGrounded && !wasGrounded) {
      // In air
      if (verticalVelocity > 1) {
        newState = 'jumping';
      } else if (verticalVelocity < -1) {
        newState = 'falling';
      }
    } else if (isGrounded && !wasGrounded) {
      // Just landed
      newState = 'landing';
      landingTimerRef.current = 0.3; // Landing animation duration
    } else if (isGrounded) {
      // On ground
      if (landingTimerRef.current > 0) {
        newState = 'landing';
      } else if (speed > 0.5) {
        newState = 'running';
      } else {
        newState = 'idle';
      }
    }
    
    if (newState !== animState) {
      setAnimState(newState);
    }
    setWasGrounded(isGrounded);
  }, [isGrounded, wasGrounded, verticalVelocity, speed, animState]);

  useFrame((_, dt) => {
    const mixer = mixerRef.current; 
    if (!mixer) return;
    
    mixer.update(dt);
    
    // Update landing timer
    if (landingTimerRef.current > 0) {
      landingTimerRef.current -= dt;
    }
    
    // Get all actions
    const actions = actionsRef.current;
    const { idle, run, jump, fall, land } = actions;
    
    // Reset all weights to 0
    Object.values(actions).forEach(action => {
      if (action) action.weight = 0;
    });
    
    // Set weights based on current animation state with smooth blending
    const crossfadeTime = 0.2;
    
    switch (animState) {
      case 'idle':
        if (idle) {
          idle.weight = 1;
          idle.enabled = true;
        }
        break;
        
      case 'running':
        if (idle && run) {
          const runBlend = Math.min(1, speed / 3);
          idle.weight = 1 - runBlend;
          run.weight = runBlend;
          idle.enabled = true;
          run.enabled = true;
        } else if (run) {
          run.weight = 1;
          run.enabled = true;
        }
        break;
        
      case 'jumping':
        if (jump) {
          jump.weight = 1;
          jump.enabled = true;
          if (!jump.isRunning()) {
            jump.reset().play();
          }
        } else if (idle) {
          // Fallback to idle if no jump animation
          idle.weight = 1;
          idle.enabled = true;
        }
        break;
        
      case 'falling':
        if (fall) {
          fall.weight = 1;
          fall.enabled = true;
          if (!fall.isRunning()) {
            fall.reset().play();
          }
        } else if (idle) {
          // Fallback to idle if no fall animation
          idle.weight = 1;
          idle.enabled = true;
        }
        break;
        
      case 'landing':
        if (land) {
          land.weight = 1;
          land.enabled = true;
          if (!land.isRunning()) {
            land.reset().play();
          }
        } else if (idle) {
          // Fallback to idle if no land animation
          idle.weight = 1;
          idle.enabled = true;
        }
        break;
    }
    
    // Disable actions with 0 weight for performance
    Object.values(actions).forEach(action => {
      if (action && action.weight === 0) {
        action.enabled = false;
      }
    });
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
      {/* Accessories */}
      {/* Hat */}
      {cfg.accessories.hat && (
        loadedAccessories.hat ? (
          <primitive object={loadedAccessories.hat.clone()} position={[0, 1.2, 0]} />
        ) : (
          <mesh position={[0, 1.2, 0]} castShadow>
            <coneGeometry args={[0.2, 0.3, 8]} />
            <meshStandardMaterial color={accessoryColor} />
          </mesh>
        )
      )}
      
      {/* Cape */}
      {cfg.accessories.cape && (
        loadedAccessories.cape ? (
          <primitive object={loadedAccessories.cape.clone()} position={[0, 0.7, -0.15]} />
        ) : (
          <mesh position={[0, 0.7, -0.15]} rotation={[0,0,0]} castShadow>
            <planeGeometry args={[0.4, 0.6]} />
            <meshStandardMaterial color={accessoryColor} side={THREE.DoubleSide} />
          </mesh>
        )
      )}
      
      {/* Glasses */}
      {cfg.accessories.glasses && (
        loadedAccessories.glasses ? (
          <primitive object={loadedAccessories.glasses.clone()} position={[0, 0.9, 0.2]} />
        ) : (
          <group position={[0, 0.9, 0.2]}>
            <mesh position={[-0.1, 0, 0]} castShadow>
              <torusGeometry args={[0.08, 0.02, 8, 16]} />
              <meshStandardMaterial color={accent} />
            </mesh>
            <mesh position={[0.1, 0, 0]} castShadow>
              <torusGeometry args={[0.08, 0.02, 8, 16]} />
              <meshStandardMaterial color={accent} />
            </mesh>
            <mesh position={[0, 0, -0.05]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.01, 0.01, 0.15, 8]} />
              <meshStandardMaterial color={accent} />
            </mesh>
          </group>
        )
      )}
      
      {/* Necklace */}
      {cfg.accessories.necklace && (
        loadedAccessories.necklace ? (
          <primitive object={loadedAccessories.necklace.clone()} position={[0, 0.6, 0]} />
        ) : (
          <mesh position={[0, 0.6, 0]} castShadow>
            <torusGeometry args={[0.15, 0.02, 8, 16]} />
            <meshStandardMaterial color={accessoryColor} />
          </mesh>
        )
      )}
    </group>
  );
}


