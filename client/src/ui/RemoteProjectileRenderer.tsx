import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useNet } from '../net/net';

// Simple component to render remote players' projectiles
export function RemoteProjectileRenderer() {
  const net = useNet();
  
  // Convert remote projectiles to renderable data with interpolation
  const renderData = useMemo(() => {
    const projectiles = Array.from(net.remoteProjectiles.values());
    const prevProjectiles = net.remoteProjectilesPrev;
    const dt = Math.max(16, net.tCurr - net.tPrev);
    const alpha = Math.min(1, (performance.now() - net.tCurr) / dt);
    
    return projectiles.map(proj => {
      const prev = prevProjectiles.get(proj.id) || proj;
      
      // Interpolate position
      const ix = prev.x + (proj.x - prev.x) * alpha;
      const iy = prev.y + (proj.y - prev.y) * alpha;
      const iz = prev.z + (proj.z - prev.z) * alpha;
      
      // Get visual properties based on type
      const color = getProjectileColor(proj.type);
      const scale = getProjectileScale(proj.type);
      
      return {
        id: proj.id,
        position: [ix, iy, iz] as [number, number, number],
        color,
        scale,
        type: proj.type
      };
    });
  }, [net.remoteProjectiles, net.remoteProjectilesPrev, net.tCurr, net.tPrev]);
  
  return (
    <group>
      {renderData.map(proj => (
        <RemoteProjectileMesh
          key={proj.id}
          position={proj.position}
          color={proj.color}
          scale={proj.scale}
          type={proj.type}
        />
      ))}
    </group>
  );
}

// Individual projectile mesh component
function RemoteProjectileMesh({ 
  position, 
  color, 
  scale, 
  type 
}: { 
  position: [number, number, number]; 
  color: string; 
  scale: number;
  type: string;
}) {
  // Different shapes for different projectile types
  const geometry = useMemo(() => {
    switch (type) {
      case 'magic':
        return <sphereGeometry args={[0.1 * scale, 8, 8]} />;
      case 'ricochet':
        return <boxGeometry args={[0.15 * scale, 0.05 * scale, 0.05 * scale]} />;
      case 'explosive':
        return <sphereGeometry args={[0.15 * scale, 8, 8]} />;
      default:
        return <sphereGeometry args={[0.1 * scale, 8, 8]} />;
    }
  }, [type, scale]);
  
  return (
    <mesh position={position} castShadow>
      {geometry}
      <meshStandardMaterial 
        color={color} 
        emissive={color}
        emissiveIntensity={0.3}
      />
      
      {/* Add glow effect for magic projectiles */}
      {type === 'magic' && (
        <pointLight
          position={[0, 0, 0]}
          color={color}
          intensity={0.5}
          distance={3}
          decay={2}
        />
      )}
    </mesh>
  );
}

// Helper functions for visual properties
function getProjectileColor(type: string): string {
  switch (type) {
    case 'magic':
      return '#4fc3f7';  // Light blue
    case 'ricochet':
      return '#ffeb3b';  // Yellow/gold
    case 'explosive':
      return '#f44336';  // Red
    default:
      return '#ffffff';  // White
  }
}

function getProjectileScale(type: string): number {
  switch (type) {
    case 'magic':
      return 1.0;
    case 'ricochet':
      return 0.8;
    case 'explosive':
      return 1.3;
    default:
      return 1.0;
  }
}
