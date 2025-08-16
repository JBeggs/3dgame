import React, { useEffect, useMemo, useState } from 'react';
import { generateDungeon } from '../gen/mapGen';
import { getPhysics } from '../game/physics';
import { Spider } from '../ai/spider';
import { inventory } from '../game/inventory';

export function MapScene() {
  const grid = useMemo(() => generateDungeon(1, 48, 36, 10), []);
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
    // choose a spawn in the center of the most open room (5x5 emptiness score)
    function placeSpawn() {
      let bestX = 0, bestY = 0, bestScore = -1;
      const cx = grid.w * 0.5, cy = grid.h * 0.5;
      for (let y = 2; y < grid.h - 2; y++) {
        for (let x = 2; x < grid.w - 2; x++) {
          if (grid.cells[y * grid.w + x] !== 0) continue;
          let score = 0;
          for (let yy = -2; yy <= 2; yy++) {
            for (let xx = -2; xx <= 2; xx++) {
              if (grid.cells[(y + yy) * grid.w + (x + xx)] === 0) score++;
            }
          }
          // prefer positions near the center slightly
          const dcx = x - cx, dcy = y - cy;
          const centerBias = -0.01 * (dcx * dcx + dcy * dcy);
          score += centerBias;
          if (score > bestScore) { bestScore = score; bestX = x; bestY = y; }
        }
      }
      const px = (bestX + 0.5) * cellSize;
      const pz = (bestY + 0.5) * cellSize;
      const body = phys.playerBody;
      body.position.set(px, 0.6, pz);
      body.velocity.set(0, 0, 0);
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


