import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getProjectileManager, Projectile } from '../game/projectiles';
import { getPhysics } from '../game/physics';
import { playerHealth } from '../game/health';
import { getGrid } from '../game/worldState';

export function ProjectileRenderer() {
  const projectileManager = getProjectileManager();
  const [projectiles, setProjectiles] = React.useState<Projectile[]>([]);

  useFrame((_, deltaTime) => {
    // Update projectile manager
    projectileManager.update(deltaTime);
    
    // Check wall collisions
    const grid = getGrid();
    if (grid) {
      const cellSize = 1.2; // Same as MapScene
      projectileManager.checkWallCollisions(
        (x, y) => x >= 0 && y >= 0 && x < grid.w && y < grid.h && grid.cells[y * grid.w + x] === 0,
        cellSize
      );
    }
    
    // Check player collisions
    const playerBody = getPhysics().playerBody;
    const playerPos = new THREE.Vector3(playerBody.position.x, playerBody.position.y, playerBody.position.z);
    const hits = projectileManager.checkCollisions(playerPos, 0.5, 'player');
    
    for (const hit of hits) {
      playerHealth.damage(hit.damage);
    }
    
    // Update React state
    setProjectiles([...projectileManager.getAllProjectiles()]);
  });

  return (
    <group>
      {projectiles.map((projectile) => (
        <ProjectileMesh key={projectile.id} projectile={projectile} />
      ))}
    </group>
  );
}

function ProjectileMesh({ projectile }: { projectile: Projectile }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const projectileManager = getProjectileManager();
  const visualData = projectileManager.getProjectileVisualData(projectile);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(projectile.position);
      
      // Orient arrow projectiles in direction of travel
      if (projectile.type === 'arrow' && projectile.velocity.length() > 0) {
        const direction = projectile.velocity.clone().normalize();
        meshRef.current.lookAt(
          meshRef.current.position.clone().add(direction)
        );
        // Rotate 90 degrees so the cylinder points forward
        meshRef.current.rotateX(Math.PI / 2);
      }
    }
  }, [projectile.position, projectile.velocity, projectile.type]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(projectile.position);
    }
  });

  const geometry = visualData.geometry === 'cylinder' 
    ? <cylinderGeometry args={[visualData.scale[0], visualData.scale[1], visualData.scale[2], 8]} />
    : <sphereGeometry args={[visualData.scale[0], 8, 8]} />;

  return (
    <mesh ref={meshRef} scale={visualData.scale}>
      {geometry}
      <meshStandardMaterial 
        color={visualData.color}
        emissive={visualData.emissive}
        emissiveIntensity={visualData.emissiveIntensity}
      />
    </mesh>
  );
}
