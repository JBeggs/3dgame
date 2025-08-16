import React, { useEffect, useMemo, useState } from 'react';
import { generateBSP } from '../gen/mapGen';
import { getPhysics } from '../game/physics';
import { Spider } from '../ai/spider';
import { inventory } from '../game/inventory';

export function MapScene() {
  const grid = useMemo(() => generateBSP(1, 36, 36), []);
  const cellSize = 1.2; // expand grid scale a bit for wider corridors
  // Seeded coin placement for stability
  const coins = useMemo(() => {
    const out: { x: number; y: number; z: number; id: number }[] = [];
    let seed = 123456;
    function rng() { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed & 0xfffffff) / 0xfffffff; }
    let id = 0;
    for (let y = 1; y < grid.h - 1; y++) {
      for (let x = 1; x < grid.w - 1; x++) {
        const i = y * grid.w + x;
        if (grid.cells[i] === 0 && rng() < 0.04) {
          out.push({ x: (x + 0.5) * cellSize, y: 0.4, z: (y + 0.5) * cellSize, id: id++ });
        }
      }
    }
    return out;
  }, [grid]);
  const [collected, setCollected] = useState<Set<number>>(new Set());

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
    // place player at a valid floor cell near the center
    function placeSpawn() {
      const cx = Math.floor(grid.w / 2);
      const cy = Math.floor(grid.h / 2);
      const maxR = Math.max(grid.w, grid.h);
      for (let r = 0; r < maxR; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const x = cx + dx, y = cy + dy;
            if (x < 0 || y < 0 || x >= grid.w || y >= grid.h) continue;
            if (grid.cells[y * grid.w + x] === 0) {
              const px = (x + 0.5) * cellSize;
              const pz = (y + 0.5) * cellSize;
              const body = phys.playerBody;
              body.position.set(px, 0.6, pz);
              body.velocity.set(0, 0, 0);
              return;
            }
          }
        }
      }
    }
    placeSpawn();
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
    {coins.map(c => !collected.has(c.id) && (
      <mesh key={`coin-${c.id}`} position={[c.x, c.y, c.z]} onClick={() => { inventory.add('coin', 1); setCollected(new Set(collected).add(c.id)); }}>
        <cylinderGeometry args={[0.12, 0.12, 0.08, 12]} />
        <meshStandardMaterial color="#ffd54a" emissive="#3a2a00" emissiveIntensity={0.25} />
      </mesh>
    ))}
  </>;
}


