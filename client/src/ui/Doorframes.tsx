import React, { useMemo } from 'react';
import * as THREE from 'three';
import { findDoorways, getDoorframeStyle, Doorway } from '../gen/doorframes';
import { Grid } from '../gen/mapGen';

interface DoorframesProps {
  grid: Grid;
  cellSize: number;
}

export function Doorframes({ grid, cellSize }: DoorframesProps) {
  const doorways = useMemo(() => findDoorways(grid), [grid]);

  return (
    <group>
      {doorways.map((doorway, index) => (
        <DoorframeGeometry
          key={`doorframe-${doorway.roomIndex}-${doorway.x}-${doorway.y}-${index}`}
          doorway={doorway}
          cellSize={cellSize}
        />
      ))}
    </group>
  );
}

interface DoorframeGeometryProps {
  doorway: Doorway;
  cellSize: number;
}

function DoorframeGeometry({ doorway, cellSize }: DoorframeGeometryProps) {
  const style = getDoorframeStyle(doorway.room);
  const worldX = (doorway.x + 0.5) * cellSize;
  const worldZ = (doorway.y + 0.5) * cellSize;
  
  // Calculate rotation based on direction
  const rotation = useMemo(() => {
    switch (doorway.direction) {
      case 'north': return [0, 0, 0] as const;           // Facing north
      case 'south': return [0, Math.PI, 0] as const;     // Facing south  
      case 'east': return [0, Math.PI / 2, 0] as const;  // Facing east
      case 'west': return [0, -Math.PI / 2, 0] as const; // Facing west
      default: return [0, 0, 0] as const;
    }
  }, [doorway.direction]);

  return (
    <group position={[worldX, 0, worldZ]} rotation={rotation}>
      {/* Left pillar */}
      <mesh position={[-style.width / 2, style.height / 2, 0]} castShadow>
        <boxGeometry args={[style.thickness, style.height, style.thickness]} />
        <meshStandardMaterial 
          color={style.color}
          emissive={style.emissive}
          emissiveIntensity={style.emissiveIntensity}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      
      {/* Right pillar */}
      <mesh position={[style.width / 2, style.height / 2, 0]} castShadow>
        <boxGeometry args={[style.thickness, style.height, style.thickness]} />
        <meshStandardMaterial 
          color={style.color}
          emissive={style.emissive}
          emissiveIntensity={style.emissiveIntensity}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      
      {/* Top lintel */}
      <mesh position={[0, style.height - style.thickness / 2, 0]} castShadow>
        <boxGeometry args={[style.width + style.thickness, style.thickness, style.thickness]} />
        <meshStandardMaterial 
          color={style.color}
          emissive={style.emissive}
          emissiveIntensity={style.emissiveIntensity}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* Room type indicator - small decorative element */}
      {doorway.room.tag !== 'normal' && (
        <mesh position={[0, style.height + 0.1, 0]} castShadow>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial
            color={style.emissive}
            emissive={style.emissive}
            emissiveIntensity={0.8}
          />
        </mesh>
      )}

      {/* Subtle ambient light for special rooms */}
      {(doorway.room.tag === 'treasure' || doorway.room.tag === 'lair') && (
        <pointLight
          color={style.emissive}
          intensity={0.3}
          distance={3}
          position={[0, 1, 0]}
        />
      )}
    </group>
  );
}
