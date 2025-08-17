// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAvatar } from './store';
import { getAssetLoader } from '../utils/AssetLoader';

type AnimationState = 'idle' | 'run' | 'jump' | 'fall' | 'land';

// Advanced GLB-based avatar with dress-up system  
export function AvatarRoot({ 
  position = [0, 0, 0] as [number, number, number],
  rotation = 0 // Y-axis rotation in radians
}) {
  const cfg = useAvatar();
  const { gl: renderer } = useThree();
  
  // GLB asset states
  const [loadedParts, setLoadedParts] = useState<{
    body?: THREE.Object3D;
    head?: THREE.Object3D;
    outfit?: THREE.Object3D;
    accessories: Record<string, THREE.Object3D>;
  }>({ accessories: {} });
  
  // Animation system
  const mixerRef = useRef<THREE.AnimationMixer | undefined>();
  const actionsRef = useRef<Record<string, THREE.AnimationAction>>({});
  const [animationState, setAnimationState] = useState<AnimationState>('idle');
  
  // Asset loader
  const assetLoader = useMemo(() => getAssetLoader(renderer), [renderer]);
  
  // Load modular avatar parts
  useEffect(() => {
    let mounted = true;
    
    async function loadAvatarParts() {
      console.log('👤 Loading GLB avatar parts:', cfg);
      
      const parts: any = { accessories: {} };
      
      try {
        // Load body with fallback
        if (cfg.bodyId) {
          try {
            const bodyGltf = await assetLoader.loadModel(`/assets/avatar/${cfg.bodyId}.glb`);
            if (mounted && bodyGltf?.scene) {
              parts.body = bodyGltf.scene.clone();
              
              // Set up animations from body
              if (bodyGltf.animations?.length > 0) {
                mixerRef.current = new THREE.AnimationMixer(parts.body);
                
                bodyGltf.animations.forEach((clip: THREE.AnimationClip) => {
                  const action = mixerRef.current!.clipAction(clip);
                  action.setLoop(THREE.LoopRepeat, Infinity);
                  
                  // Map animation names to states
                  const name = clip.name.toLowerCase();
                  if (name.includes('idle')) actionsRef.current.idle = action;
                  else if (name.includes('run') || name.includes('walk')) actionsRef.current.run = action;
                  else if (name.includes('jump')) actionsRef.current.jump = action;
                  else if (name.includes('fall')) actionsRef.current.fall = action;
                  else if (name.includes('land')) actionsRef.current.land = action;
                });
                
                console.log('🎬 Animation clips loaded:', Object.keys(actionsRef.current));
                
                // Start idle animation
                actionsRef.current.idle?.play();
              }
              
              console.log('✅ Body loaded:', cfg.bodyId);
            }
          } catch (error) {
            console.warn(`⚠️ Could not load body ${cfg.bodyId}, using fallback`);
            parts.body = createFallbackBody();
          }
        }
        
        // Load head
        if (cfg.headId) {
          try {
            const headGltf = await assetLoader.loadModel(`/assets/avatar/${cfg.headId}.glb`);
            if (mounted && headGltf?.scene) {
              parts.head = headGltf.scene.clone();
              console.log('✅ Head loaded:', cfg.headId);
            }
          } catch (error) {
            console.warn(`⚠️ Could not load head ${cfg.headId}, using fallback`);
            parts.head = createFallbackHead();
          }
        }
        
        // Load outfit
        if (cfg.outfitId) {
          try {
            const outfitGltf = await assetLoader.loadModel(`/assets/avatar/${cfg.outfitId}.glb`);
            if (mounted && outfitGltf?.scene) {
              parts.outfit = outfitGltf.scene.clone();
              console.log('✅ Outfit loaded:', cfg.outfitId);
            }
          } catch (error) {
            console.warn(`⚠️ Could not load outfit ${cfg.outfitId}, using fallback`);
            parts.outfit = createFallbackOutfit();
          }
        }
        
        // Load accessories
        for (const [slot, accessoryId] of Object.entries(cfg.accessories)) {
          if (accessoryId) {
            try {
              const accessoryGltf = await assetLoader.loadModel(`/assets/avatar/${accessoryId}.glb`);
              if (mounted && accessoryGltf?.scene) {
                parts.accessories[slot] = accessoryGltf.scene.clone();
                console.log(`✅ Accessory loaded: ${slot} = ${accessoryId}`);
              }
            } catch (error) {
              console.warn(`⚠️ Could not load accessory ${slot}:${accessoryId}`);
              parts.accessories[slot] = createFallbackAccessory(slot);
            }
          }
        }
        
        if (mounted) {
          // Apply colors to all parts
          applyColorsToAvatar(parts, cfg.colors);
          
          setLoadedParts(parts);
          console.log('🎨 Avatar assembly complete!');
        }
        
      } catch (error) {
        console.error('❌ Avatar loading failed:', error);
        if (mounted) {
          // Complete fallback avatar
          setLoadedParts({
            body: createFallbackBody(),
            head: createFallbackHead(),
            outfit: createFallbackOutfit(),
            accessories: {}
          });
        }
      }
    }
    
    loadAvatarParts();
    
    return () => {
      mounted = false;
      // Cleanup mixer
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = undefined;
      }
      actionsRef.current = {};
    };
  }, [cfg, assetLoader]);
  
  // Animation system
  useFrame((_, deltaTime) => {
    if (mixerRef.current) {
      mixerRef.current.update(deltaTime);
    }
  });
  
  // Simple movement-based animation state machine
  const [lastPosition, setLastPosition] = useState(new THREE.Vector3(...position));
  useEffect(() => {
    const currentPos = new THREE.Vector3(...position);
    const movement = currentPos.distanceTo(lastPosition);
    
    if (movement > 0.1) {
      switchAnimation('run');
    } else {
      switchAnimation('idle');
    }
    
    setLastPosition(currentPos);
  }, [position]);
  
  function switchAnimation(newState: AnimationState) {
    if (newState === animationState) return;
    
    const currentAction = actionsRef.current[animationState];
    const nextAction = actionsRef.current[newState];
    
    if (currentAction && nextAction) {
      currentAction.fadeOut(0.3);
      nextAction.reset().fadeIn(0.3).play();
    } else if (nextAction) {
      nextAction.play();
    }
    
    setAnimationState(newState);
  }

  return (
    <Suspense fallback={<AvatarFallback position={position} rotation={rotation} colors={cfg.colors} />}>
      <group position={position as any} rotation={[0, rotation, 0]}>
        {/* Render GLB parts or fallbacks */}
        
        {/* Body (main mesh with animations) */}
        {loadedParts.body ? (
          <primitive object={loadedParts.body} />
        ) : (
          <AvatarFallback position={[0, 0, 0]} rotation={0} colors={cfg.colors} />
        )}
        
        {/* Head (if separate from body) */}
        {loadedParts.head && (
          <primitive object={loadedParts.head} />
        )}
        
        {/* Outfit/Clothing */}
        {loadedParts.outfit && (
          <primitive object={loadedParts.outfit} />
        )}
        
        {/* Accessories */}
        {Object.entries(loadedParts.accessories).map(([slot, accessory]) => 
          accessory && (
            <primitive 
              key={slot} 
              object={accessory} 
              position={getAccessoryPosition(slot)}
            />
          )
        )}
        
        {/* Visual direction indicator */}
        <mesh position={[0, 0.5, 0.25]}>
          <boxGeometry args={[0.03, 0.03, 0.03]} />
          <meshStandardMaterial color="#ff3333" opacity={0.7} transparent />
        </mesh>
        
        {/* Debug info (dev only) */}
        {process.env.NODE_ENV === 'development' && (
          <group>
            <mesh position={[0, 1.2, 0]}>
              <sphereGeometry args={[0.02]} />
              <meshStandardMaterial color="#00ff00" />
            </mesh>
          </group>
        )}
      </group>
    </Suspense>
  );
}

// Fallback avatar using primitive shapes (reliable backup)
function AvatarFallback({ 
  position, 
  rotation, 
  colors 
}: { 
  position: [number, number, number]; 
  rotation: number;
  colors: any;
}) {
  const primary = new THREE.Color(colors.primary);
  const secondary = new THREE.Color(colors.secondary);
  const accent = new THREE.Color(colors.accent);
  const accessoryColor = new THREE.Color(colors.accessory);
  
  return (
    <group position={position as any} rotation={[0, rotation, 0]}>
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
      
      {/* Arms */}
      <mesh position={[-0.3, 0.4, 0]} castShadow>
        <boxGeometry args={[0.1, 0.4, 0.1]} />
        <meshStandardMaterial color={primary} />
      </mesh>
      <mesh position={[0.3, 0.4, 0]} castShadow>
        <boxGeometry args={[0.1, 0.4, 0.1]} />
        <meshStandardMaterial color={primary} />
      </mesh>
      
      {/* Legs */}
      <mesh position={[-0.1, -0.2, 0]} castShadow>
        <boxGeometry args={[0.1, 0.6, 0.1]} />
        <meshStandardMaterial color={accent} />
      </mesh>
      <mesh position={[0.1, -0.2, 0]} castShadow>
        <boxGeometry args={[0.1, 0.6, 0.1]} />
        <meshStandardMaterial color={accent} />
      </mesh>
      
      {/* Feet */}
      <mesh position={[-0.1, -0.55, 0.05]} castShadow>
        <boxGeometry args={[0.15, 0.1, 0.2]} />
        <meshStandardMaterial color={accessoryColor} />
      </mesh>
      <mesh position={[0.1, -0.55, 0.05]} castShadow>
        <boxGeometry args={[0.15, 0.1, 0.2]} />
        <meshStandardMaterial color={accessoryColor} />
      </mesh>
    </group>
  );
}

// Helper functions for GLB fallbacks and positioning
function createFallbackBody(): THREE.Object3D {
  const group = new THREE.Group();
  
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.6, 0.2),
    new THREE.MeshStandardMaterial({ color: '#8899ff' })
  );
  torso.position.set(0, 0.3, 0);
  torso.castShadow = true;
  group.add(torso);
  
  return group;
}

function createFallbackHead(): THREE.Object3D {
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 16),
    new THREE.MeshStandardMaterial({ color: '#ffcc88' })
  );
  head.position.set(0, 0.85, 0);
  head.castShadow = true;
  return head;
}

function createFallbackOutfit(): THREE.Object3D {
  const outfit = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.62, 0.22),
    new THREE.MeshStandardMaterial({ 
      color: '#ff6666', 
      transparent: true, 
      opacity: 0.8 
    })
  );
  outfit.position.set(0, 0.3, 0);
  return outfit;
}

function createFallbackAccessory(slot: string): THREE.Object3D {
  const colors = {
    hat: '#aa3333',
    cape: '#3333aa', 
    glasses: '#333333',
    necklace: '#ffaa33'
  };
  
  const accessory = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: colors[slot as keyof typeof colors] || '#888888' })
  );
  
  accessory.position.copy(getAccessoryPosition(slot));
  return accessory;
}

function getAccessoryPosition(slot: string): THREE.Vector3 {
  const positions = {
    hat: new THREE.Vector3(0, 1.1, 0),
    cape: new THREE.Vector3(0, 0.4, -0.15),
    glasses: new THREE.Vector3(0, 0.9, 0.15),
    necklace: new THREE.Vector3(0, 0.6, 0.12)
  };
  
  return positions[slot as keyof typeof positions] || new THREE.Vector3(0, 0, 0);
}

function applyColorsToAvatar(parts: any, colors: any) {
  const colorMap = {
    primary: new THREE.Color(colors.primary),
    secondary: new THREE.Color(colors.secondary),
    accent: new THREE.Color(colors.accent),
    accessory: new THREE.Color(colors.accessory)
  };
  
  // Apply colors to all loaded parts
  [parts.body, parts.head, parts.outfit].forEach(part => {
    if (part) {
      part.traverse((child: any) => {
        if (child.isMesh && child.material) {
          // Apply primary color to skin/base materials
          if (child.material.name?.includes('skin') || child.material.name?.includes('base')) {
            child.material.color = colorMap.primary;
          }
          // Apply secondary color to clothing materials  
          else if (child.material.name?.includes('cloth') || child.material.name?.includes('fabric')) {
            child.material.color = colorMap.secondary;
          }
          // Apply accent color to details
          else if (child.material.name?.includes('accent') || child.material.name?.includes('detail')) {
            child.material.color = colorMap.accent;
          }
        }
      });
    }
  });
  
  // Apply accessory colors
  Object.entries(parts.accessories).forEach(([slot, accessory]) => {
    if (accessory) {
      accessory.traverse((child: any) => {
        if (child.isMesh && child.material) {
          child.material.color = colorMap.accessory;
        }
      });
    }
  });
}

// NetworkedAvatarRoot for rendering other players' avatars with their custom configurations
export function NetworkedAvatarRoot({ 
  position = [0, 0, 0] as [number, number, number],
  rotation = 0,
  config
}: {
  position?: [number, number, number];
  rotation?: number;
  config?: any;
}) {
  // Use provided config or fallback to default
  const avatarConfig = config || {
    bodyId: 'bodyA',
    headId: 'headA', 
    outfitId: 'robeA',
    colors: { primary: '#a0c8ff', secondary: '#4a3070', accent: '#ff6b6b', accessory: '#ffd93d' },
    accessories: {}
  };

  // For networked avatars, we use a simpler approach with just colors
  // The full GLB loading is handled by the main avatar system
  return (
    <AvatarFallback 
      position={position} 
      rotation={rotation} 
      colors={avatarConfig.colors}
    />
  );
}


