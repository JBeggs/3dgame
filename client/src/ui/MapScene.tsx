import React, { useEffect, useMemo } from 'react';
import { generateBSP } from '../gen/mapGen';
import { getPhysics } from '../game/physics';
import { Spider } from '../ai/spider';

export function MapScene() {
  const grid = useMemo(() => generateBSP(1, 36, 36), []);
  const cellSize = 1;

  useEffect(() => {
    const phys = getPhysics();
    // build static walls in physics
    for (let y = 0; y < grid.h; y++) {
      for (let x = 0; x < grid.w; x++) {
        if (grid.cells[y * grid.w + x] === 1) {
          phys.addStaticBox((x + 0.5) * cellSize, 0.5, (y + 0.5) * cellSize, cellSize, 1, cellSize);
        }
      }
    }
  }, [grid]);

  const meshes = [] as React.ReactNode[];
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      const isWall = grid.cells[y * grid.w + x] === 1;
      if (isWall) {
        meshes.push(
          <mesh key={`w-${x}-${y}`} position={[(x + 0.5) * cellSize, 0.5, (y + 0.5) * cellSize]} castShadow receiveShadow>
            <boxGeometry args={[cellSize, 1, cellSize]} />
            <meshStandardMaterial color="#555" />
          </mesh>
        );
      }
    }
  }
  return <>
    {meshes}
    <Spider />
  </>;
}


