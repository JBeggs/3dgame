import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';

// Instanced torch/light decorations
interface TorchData {
  position: [number, number, number];
  color: string;
  emissive: string;
  intensity: number;
}

export function InstancedTorches({ torches }: { torches: TorchData[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const lightRef = useRef<THREE.InstancedMesh>(null!);

  useEffect(() => {
    if (!meshRef.current || !lightRef.current) return;
    
    const mesh = meshRef.current;
    const lightMesh = lightRef.current;
    
    // Update torch spheres (flame effect)
    for (let i = 0; i < torches.length; i++) {
      const torch = torches[i];
      const matrix = new THREE.Matrix4().makeTranslation(
        torch.position[0], 
        torch.position[1], 
        torch.position[2]
      );
      mesh.setMatrixAt(i, matrix);
      lightMesh.setMatrixAt(i, matrix);
    }
    
    mesh.instanceMatrix.needsUpdate = true;
    lightMesh.instanceMatrix.needsUpdate = true;
  }, [torches]);

  if (torches.length === 0) return null;

  return (
    <group>
      {/* Torch flames */}
      <instancedMesh 
        ref={meshRef} 
        args={[undefined, undefined, torches.length]} 
        castShadow
      >
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial 
          emissive="#ff8c00" 
          color="#552200" 
          emissiveIntensity={1.2} 
        />
      </instancedMesh>
      
      {/* Point lights for each torch */}
      {torches.map((torch, i) => (
        <pointLight
          key={i}
          position={torch.position}
          color={torch.color}
          intensity={torch.intensity}
          distance={4}
          decay={2}
        />
      ))}
    </group>
  );
}

// Instanced coins
export function InstancedCoins({ 
  coins, 
  collected 
}: { 
  coins: { x: number; y: number; z: number; id: number }[];
  collected: Set<number>;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  
  const visibleCoins = useMemo(() => 
    coins.filter(coin => !collected.has(coin.id)),
    [coins, collected]
  );

  useEffect(() => {
    if (!meshRef.current || visibleCoins.length === 0) return;
    
    const mesh = meshRef.current;
    
    for (let i = 0; i < visibleCoins.length; i++) {
      const coin = visibleCoins[i];
      const matrix = new THREE.Matrix4()
        .makeTranslation(coin.x, coin.y, coin.z)
        .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
      mesh.setMatrixAt(i, matrix);
    }
    
    mesh.instanceMatrix.needsUpdate = true;
  }, [visibleCoins]);

  if (visibleCoins.length === 0) return null;

  return (
    <instancedMesh 
      ref={meshRef}
      args={[undefined, undefined, visibleCoins.length]}
      castShadow
    >
      <cylinderGeometry args={[0.12, 0.12, 0.08, 12]} />
      <meshStandardMaterial 
        color="#ffd54a"
        emissive="#3a2a00"
        emissiveIntensity={0.25}
        metalness={0.8}
        roughness={0.2}
      />
    </instancedMesh>
  );
}

// Instanced doorframe pillars/lintels
interface DoorframeInstanceData {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  emissive: string;
  emissiveIntensity: number;
}

export function InstancedDoorframeParts({ 
  parts,
  geometry = 'box'
}: { 
  parts: DoorframeInstanceData[];
  geometry?: 'box' | 'cylinder';
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const colorRef = useRef<THREE.InstancedBufferAttribute>(null!);

  useEffect(() => {
    if (!meshRef.current || parts.length === 0) return;
    
    const mesh = meshRef.current;
    const colors = new Float32Array(parts.length * 3);
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      // Set transform matrix
      const matrix = new THREE.Matrix4()
        .makeTranslation(part.position[0], part.position[1], part.position[2])
        .multiply(new THREE.Matrix4().makeRotationFromEuler(
          new THREE.Euler(part.rotation[0], part.rotation[1], part.rotation[2])
        ))
        .multiply(new THREE.Matrix4().makeScale(
          part.scale[0], part.scale[1], part.scale[2]
        ));
      
      mesh.setMatrixAt(i, matrix);
      
      // Set color
      const color = new THREE.Color(part.color);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    mesh.instanceMatrix.needsUpdate = true;
    
    // Update colors
    if (mesh.geometry.attributes.instanceColor) {
      mesh.geometry.attributes.instanceColor.array = colors;
      mesh.geometry.attributes.instanceColor.needsUpdate = true;
    } else {
      mesh.geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colors, 3));
    }
  }, [parts]);

  if (parts.length === 0) return null;

  const geom = geometry === 'cylinder' 
    ? <cylinderGeometry args={[0.5, 0.5, 1, 8]} />
    : <boxGeometry args={[1, 1, 1]} />;

  return (
    <instancedMesh 
      ref={meshRef}
      args={[undefined, undefined, parts.length]}
      castShadow
    >
      {geom}
      <meshStandardMaterial 
        vertexColors
        roughness={0.3}
        metalness={0.1}
      />
    </instancedMesh>
  );
}

// Instanced projectiles by type and owner
export function InstancedProjectiles({ 
  projectiles 
}: { 
  projectiles: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    color: string;
    emissive: string;
    emissiveIntensity: number;
    type: string;
  }>;
}) {
  // Group projectiles by visual properties for efficient rendering
  const projectileGroups = useMemo(() => {
    const groups = new Map<string, typeof projectiles>();
    
    projectiles.forEach(proj => {
      const key = `${proj.type}-${proj.color}-${proj.emissive}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(proj);
    });
    
    return groups;
  }, [projectiles]);

  return (
    <group>
      {Array.from(projectileGroups.entries()).map(([key, group]) => {
        if (group.length === 0) return null;
        
        const sample = group[0];
        
        return (
          <ProjectileGroup
            key={key}
            projectiles={group}
            color={sample.color}
            emissive={sample.emissive}
            emissiveIntensity={sample.emissiveIntensity}
          />
        );
      })}
    </group>
  );
}

function ProjectileGroup({ 
  projectiles, 
  color, 
  emissive, 
  emissiveIntensity 
}: {
  projectiles: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  }>;
  color: string;
  emissive: string;
  emissiveIntensity: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  useEffect(() => {
    if (!meshRef.current || projectiles.length === 0) return;
    
    const mesh = meshRef.current;
    
    for (let i = 0; i < projectiles.length; i++) {
      const proj = projectiles[i];
      const matrix = new THREE.Matrix4()
        .makeTranslation(proj.position[0], proj.position[1], proj.position[2])
        .multiply(new THREE.Matrix4().makeRotationFromEuler(
          new THREE.Euler(proj.rotation[0], proj.rotation[1], proj.rotation[2])
        ))
        .multiply(new THREE.Matrix4().makeScale(
          proj.scale[0], proj.scale[1], proj.scale[2]
        ));
      
      mesh.setMatrixAt(i, matrix);
    }
    
    mesh.instanceMatrix.needsUpdate = true;
  }, [projectiles]);

  if (projectiles.length === 0) return null;

  return (
    <instancedMesh 
      ref={meshRef}
      args={[undefined, undefined, projectiles.length]}
    >
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial 
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
      />
    </instancedMesh>
  );
}
