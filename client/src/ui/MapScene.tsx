import React, { useEffect, useMemo, useRef, useState } from 'react';
import { generateDungeon } from '../gen/mapGen';
import { getPhysics } from '../game/physics';
import { Spider, SmartSpider } from '../ai/spider';
import { Bat } from '../ai/bat';
import { ProjectileRenderer } from './ProjectileRenderer';
import { inventory } from '../game/inventory';
import { getCoinTarget } from '../game/config';
import { setGrid } from '../game/worldState';
import { aStar } from '../ai/pathfind';
import { createNavGrid } from '../gen/navGrid';
import { NavGridDebug } from './NavGridDebug';
import * as THREE from 'three';
import { mulberry32 } from '../gen/mapGen';
import { getInput } from '../game/input';

export function MapScene() {
  const defaultSeed = Number(localStorage.getItem('genSeed') || 1);
  const defaultRooms = Number(localStorage.getItem('genRooms') || 10);
  const grid = useMemo(() => generateDungeon(defaultSeed, 48, 36, defaultRooms), [defaultSeed, defaultRooms]);
  const navGrid = useMemo(() => createNavGrid(grid), [grid]);
  const cellSize = 1.2; // expand grid scale a bit for wider corridors
  // Coins: one at many room centers; deterministic IDs
  const coins = useMemo(() => {
    const out: { x: number; y: number; z: number; id: number }[] = [];
    let id = 0;
    for (const r of grid.rooms) {
      out.push({ x: (r.cx + 0.5) * cellSize, y: 0.4, z: (r.cy + 0.5) * cellSize, id: id++ });
    }
    return out;
  }, [grid]);
  const [collected, setCollected] = useState<Set<number>>(new Set());
  const [showNavDebug, setShowNavDebug] = useState(false);

  useEffect(() => {
    setGrid(grid);
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
    
    // Debug toggle for nav grid
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'n' || e.key === 'N') {
        setShowNavDebug(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [grid]);

  // Instanced wall meshes for performance
  const wallPositions = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let y = 0; y < grid.h; y++) {
      for (let x = 0; x < grid.w; x++) {
        if (grid.cells[y * grid.w + x] === 1) {
          pts.push(new THREE.Vector3((x + 0.5) * cellSize, 0.5, (y + 0.5) * cellSize));
        }
      }
    }
    return pts;
  }, [grid]);
  return <>
    <InstancedWalls positions={wallPositions} size={cellSize} />
    <Decorations rooms={grid.rooms} cellSize={cellSize} seed={defaultSeed} />
    {/* Spawn smart spiders in lair rooms */}
    {grid.rooms.map((r, i) => (r.tag === 'lair') && (
      <SmartSpider 
        key={`smart-sp-${i}`} 
        grid={navGrid} 
        cellSize={cellSize} 
        position={[(r.cx + 0.5) * cellSize, 0.3, (r.cy + 0.5) * cellSize]} 
      />
    ))}
    {/* Keep some basic PathSpiders for comparison */}
    {grid.rooms.slice(0, 2).map((r, i) => r.tag === 'normal' && (
      <PathSpider 
        key={`path-sp-${i}`} 
        grid={grid} 
        cellSize={cellSize} 
        start={[(r.cx + 0.5) * cellSize, 0.3, (r.cy + 0.5) * cellSize] as any} 
      />
    ))}
    
    {/* Spawn flying bats in treasure rooms */}
    {grid.rooms.map((r, i) => (r.tag === 'treasure') && (
      <Bat 
        key={`bat-${i}`} 
        grid={navGrid} 
        cellSize={cellSize} 
        position={[(r.cx + 0.5) * cellSize, 2.5, (r.cy + 0.5) * cellSize]} 
      />
    ))}
    
    {/* Projectile system */}
    <ProjectileRenderer />
    {coins.map(c => !collected.has(c.id) && (
      <mesh key={`coin-${c.id}`} position={[c.x, c.y, c.z]}>
        <cylinderGeometry args={[0.12, 0.12, 0.08, 12]} />
        <meshStandardMaterial color="#ffd54a" emissive="#3a2a00" emissiveIntensity={0.25} />
      </mesh>
    ))}
    <ProximityCoinCollector coins={coins} collected={collected} setCollected={setCollected} />
    {/* Goal gate unlocks after collecting enough coins; removes physics when unlocked */}
    <GoalGate grid={grid} cellSize={cellSize} />
    
    {/* Navigation debug visualization */}
    <NavGridDebug navGrid={navGrid} cellSize={cellSize} visible={showNavDebug} />
  </>;
}

function InstancedWalls({ positions, size }: { positions: THREE.Vector3[]; size: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  useEffect(() => {
    const m = ref.current;
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      const mat = new THREE.Matrix4().makeTranslation(p.x, p.y, p.z);
      m.setMatrixAt(i, mat);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [positions]);
  return (
    <instancedMesh ref={ref as any} args={[undefined as any, undefined as any, positions.length]} castShadow receiveShadow>
      <boxGeometry args={[size, 1, size]} />
      <meshStandardMaterial color="#555" />
    </instancedMesh>
  );
}

function ProximityCoinCollector({ coins, collected, setCollected }: { coins: { x:number;y:number;z:number;id:number }[]; collected: Set<number>; setCollected: (s:Set<number>)=>void }) {
  useEffect(() => {
    const id = setInterval(() => {
      const body = getPhysics().playerBody;
      const px = body.position.x, pz = body.position.z;
      for (const c of coins) {
        if (collected.has(c.id)) continue;
        const dx = c.x - px; const dz = c.z - pz;
        if (dx*dx + dz*dz < 0.36) {
          inventory.add('coin', 1);
          const next = new Set(collected); next.add(c.id); setCollected(next);
        }
      }
    }, 100);
    return () => clearInterval(id);
  }, [coins, collected, setCollected]);
  return null;
}

function PathSpider({ grid, cellSize, start }: { grid: any; cellSize: number; start: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null!);
  useEffect(() => { ref.current.position.set(start[0], start[1], start[2]); }, [start]);
  useEffect(() => {
    const id = setInterval(() => {
      const body = getPhysics().playerBody;
      // Convert world positions to grid indices
      const sx = Math.floor(ref.current.position.x / cellSize);
      const sy = Math.floor(ref.current.position.z / cellSize);
      const gx = Math.floor(body.position.x / cellSize);
      const gy = Math.floor(body.position.z / cellSize);
      const path = aStar({ w: grid.w, h: grid.h, cells: grid.cells }, sx, sy, gx, gy);
      if (path.length > 1) {
        const next = path[1];
        const tx = (next.x + 0.5) * cellSize;
        const tz = (next.y + 0.5) * cellSize;
        const dx = tx - ref.current.position.x;
        const dz = tz - ref.current.position.z;
        const len = Math.hypot(dx, dz) || 1;
        const step = Math.min(0.08, len);
        ref.current.position.x += (dx / len) * step;
        ref.current.position.z += (dz / len) * step;
      }
    }, 100);
    return () => clearInterval(id);
  }, [grid, cellSize]);
  return (
    <mesh ref={ref as any} castShadow>
      <sphereGeometry args={[0.25, 12, 12]} />
      <meshStandardMaterial color={'#3c0'} />
    </mesh>
  );
}

function GoalGate({ grid, cellSize }: { grid: any; cellSize: number }) {
  const gateBody = useRef<any>(null);
  const phys = getPhysics();
  const last = grid.rooms[grid.rooms.length - 1];
  const pos: [number, number, number] = [ (last.cx + 0.5)*cellSize, 0.5, (last.cy + 0.5)*cellSize ];
  const enough = (inventory.get().items.coin) >= getCoinTarget();

  useEffect(() => {
    if (!gateBody.current) {
      gateBody.current = phys.addStaticBox(pos[0], pos[1], pos[2], 1.2, 1.2, 0.2);
    }
    if (enough && gateBody.current) {
      phys.removeBody(gateBody.current);
      gateBody.current = null;
    }
  }, [enough]);

  return (
    <mesh position={pos as any}>
      <boxGeometry args={[1.2, 1.2, 0.2]} />
      <meshStandardMaterial color={enough ? '#3b8' : '#a33'} />
    </mesh>
  );
}

function Decorations({ rooms, cellSize, seed }: { rooms: any[]; cellSize: number; seed: number }) {
  const rnd = mulberry32(seed + 12345);
  const nodes: React.ReactNode[] = [];
  for (const r of rooms) {
    const cx = (r.cx + 0.5) * cellSize;
    const cz = (r.cy + 0.5) * cellSize;
    // Torch lights in lairs/treasure rooms
    if (r.tag === 'lair' || r.tag === 'treasure') {
      const count = r.tag === 'lair' ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const angle = rnd() * Math.PI * 2;
        const rad = Math.max(0.6, Math.min(r.w, r.h) * 0.3) * cellSize;
        const x = cx + Math.cos(angle) * rad;
        const z = cz + Math.sin(angle) * rad;
        nodes.push(
          <group key={`torch-${r.cx}-${r.cy}-${i}`} position={[x, 0.9, z] as any}>
            <pointLight color={'#ffb347'} intensity={0.7} distance={4} decay={2} />
            <mesh>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshStandardMaterial emissive={'#ff8c00'} color={'#552200'} emissiveIntensity={1.2} />
            </mesh>
          </group>
        );
      }
    }
    // Simple props in normal rooms
    if (r.tag === 'normal' && rnd() < 0.4) {
      const px = cx + (rnd() - 0.5) * Math.max(0.5, r.w * 0.3) * cellSize;
      const pz = cz + (rnd() - 0.5) * Math.max(0.5, r.h * 0.3) * cellSize;
      nodes.push(
        <mesh key={`prop-${r.cx}-${r.cy}`} position={[px, 0.4, pz] as any} castShadow>
          <boxGeometry args={[0.4, 0.8, 0.4]} />
          <meshStandardMaterial color={'#6b6f7a'} />
        </mesh>
      );
    }
  }
  return <>{nodes}</>;
}


