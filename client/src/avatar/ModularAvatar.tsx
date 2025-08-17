// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useModularAvatar } from './modularStore';
import { getAssetLoader } from '../utils/AssetLoader';
import { getClothingItem } from '../data/clothingItems';

type AnimationState = 'idle' | 'run' | 'jump' | 'fall' | 'land';

// New Modular Avatar System
export function ModularAvatarRoot({ 
  position = [0, 0, 0] as [number, number, number],
  rotation = 0 // Y-axis rotation in radians
}) {
  const config = useModularAvatar();
  const { gl: renderer } = useThree();
  
  // Avatar parts
  const [loadedParts, setLoadedParts] = useState<{
    base?: THREE.Object3D;
    clothing: Record<string, THREE.Object3D>;
  }>({ clothing: {} });
  
  // Animation system
  const mixerRef = useRef<THREE.AnimationMixer | undefined>();
  const actionsRef = useRef<Record<string, THREE.AnimationAction>>({});
  const [animationState, setAnimationState] = useState<AnimationState>('idle');
  
  // Asset loader
  const assetLoader = useMemo(() => getAssetLoader(renderer), [renderer]);
  
  // Load base mesh and clothing
  useEffect(() => {
    let mounted = true;
    
    async function loadAvatarParts() {
      console.log('👤 Loading modular avatar:', config);
      
      const parts: any = { clothing: {} };
      
      try {
        // Load base mesh
        console.log('Loading base mesh...');
        const baseMesh = await assetLoader.loadModel('/assets/models/avatar/base_mesh.glb');
        if (mounted && baseMesh?.scene) {
          parts.base = baseMesh.scene.clone();
          
          // Set up animations from base mesh
          if (baseMesh.animations?.length > 0) {
            mixerRef.current = new THREE.AnimationMixer(parts.base);
            
            baseMesh.animations.forEach((clip: THREE.AnimationClip) => {
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
          
          console.log('✅ Base mesh loaded');
        }
        
        // Load equipped clothing items
        for (const [slot, itemId] of Object.entries(config.equipped)) {
          if (itemId) {
            const clothingItem = getClothingItem(itemId);
            if (clothingItem) {
              try {
                console.log(`Loading ${slot}: ${itemId}...`);
                const clothingModel = await assetLoader.loadModel(clothingItem.modelPath);
                if (mounted && clothingModel?.scene) {
                  parts.clothing[slot] = clothingModel.scene.clone();
                  console.log(`✅ ${slot} loaded: ${itemId}`);
                }
              } catch (error) {
                console.warn(`⚠️ Could not load ${slot} ${itemId}:`, error);
                // Create a simple fallback for missing clothing
                parts.clothing[slot] = createClothingFallback(slot, config.colors);
              }
            }
          }
        }
        
        if (mounted) {
          setLoadedParts(parts);
          console.log('🎨 Modular avatar assembly complete!');
        }
        
      } catch (error) {
        console.error('❌ Modular avatar loading failed:', error);
        if (mounted) {
          // Force fallback avatar to show SOMETHING
          console.log('🔄 Using fallback avatar instead...');
          setLoadedParts({
            base: null, // This will trigger the fallback rendering
            clothing: {}
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
  }, [config, assetLoader]);
  
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
    <Suspense fallback={<ModularAvatarFallback position={position} rotation={rotation} config={config} />}>
      <group position={position as any} rotation={[0, rotation, 0]}>
        {/* Base mesh */}
        {loadedParts.base ? (
          <primitive object={loadedParts.base} />
        ) : (
          /* Show primitive fallback if base mesh fails to load */
          <ModularAvatarFallback position={[0, 0, 0]} rotation={0} config={config} />
        )}
        
        {/* Clothing items */}
        {Object.entries(loadedParts.clothing).map(([slot, clothingModel]) => 
          clothingModel && (
            <primitive 
              key={slot} 
              object={clothingModel}
            />
          )
        )}
        
        {/* Debug indicators */}
        <mesh position={[0, 0.5, 0.25]}>
          <boxGeometry args={[0.03, 0.03, 0.03]} />
          <meshStandardMaterial color="#00ff00" opacity={0.7} transparent />
        </mesh>
        
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

// Fallback components
function ModularAvatarFallback({ position, rotation, config }: any) {
  const skinColor = new THREE.Color(config.colors.skin);
  const primaryColor = new THREE.Color(config.colors.primary);
  
  return (
    <group position={position as any} rotation={[0, rotation, 0]}>
      {/* Simple humanoid fallback */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
      
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.4, 0.6, 0.2]} />
        <meshStandardMaterial color={primaryColor} />
      </mesh>
      
      <mesh position={[-0.3, 0.4, 0]} castShadow>
        <boxGeometry args={[0.12, 0.5, 0.12]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
      <mesh position={[0.3, 0.4, 0]} castShadow>
        <boxGeometry args={[0.12, 0.5, 0.12]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
      
      <mesh position={[-0.15, -0.3, 0]} castShadow>
        <boxGeometry args={[0.15, 0.6, 0.15]} />
        <meshStandardMaterial color={primaryColor} />
      </mesh>
      <mesh position={[0.15, -0.3, 0]} castShadow>
        <boxGeometry args={[0.15, 0.6, 0.15]} />
        <meshStandardMaterial color={primaryColor} />
      </mesh>
    </group>
  );
}

function createBaseFallback(colors: any): THREE.Object3D {
  const group = new THREE.Group();
  // Create simple humanoid fallback
  // This would be implemented similar to the fallback above
  return group;
}

function createClothingFallback(slot: string, colors: any): THREE.Object3D {
  const group = new THREE.Group();
  const color = new THREE.Color(colors.primary);
  
  // Create simple placeholder based on clothing slot
  switch (slot) {
    case 'shirt':
      const shirtGeometry = new THREE.BoxGeometry(0.42, 0.6, 0.22);
      const shirtMaterial = new THREE.MeshStandardMaterial({ color });
      const shirt = new THREE.Mesh(shirtGeometry, shirtMaterial);
      shirt.position.set(0, 0.3, 0);
      group.add(shirt);
      break;
      
    case 'pants':
      const pantsGeometry = new THREE.BoxGeometry(0.32, 0.6, 0.18);
      const pantsMaterial = new THREE.MeshStandardMaterial({ color });
      const pants = new THREE.Mesh(pantsGeometry, pantsMaterial);
      pants.position.set(0, -0.3, 0);
      group.add(pants);
      break;
      
    // Add more clothing slots as needed
  }
  
  return group;
}

// NetworkedModularAvatar for other players
export function NetworkedModularAvatarRoot({ 
  position = [0, 0, 0] as [number, number, number],
  rotation = 0,
  config
}: {
  position?: [number, number, number];
  rotation?: number;
  config?: any;
}) {
  // Use provided config or fallback
  const avatarConfig = config || {
    baseModel: 'base_mesh',
    equipped: { shirt: 'basic_shirt' },
    colors: { skin: '#fdbcb4', hair: '#8b4513', primary: '#a0c8ff', secondary: '#4a3070' }
  };

  return (
    <ModularAvatarFallback 
      position={position} 
      rotation={rotation} 
      config={avatarConfig}
    />
  );
}
