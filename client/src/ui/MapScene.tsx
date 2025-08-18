import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { generateDungeon } from '../gen/mapGen';
import { generateLobby, defaultLobbyConfig, LobbyConfig } from '../gen/lobbyGen';
import { getPhysics } from '../game/physics';
import { Spider, SmartSpider } from '../ai/spider';
import { Bat } from '../ai/bat';
import { Archer } from '../ai/archer';
import { Slime } from '../ai/slime';
import { Doorframes } from './Doorframes';
import { ProjectileRenderer } from './ProjectileRenderer';
import { InstancedTorches, InstancedCoins } from './InstancedMeshes';
import * as THREE from 'three';
import { inventory } from '../game/inventory';
import { getCoinTarget } from '../game/config';
import { setGrid } from '../game/worldState';
import { aStar } from '../ai/pathfind';
import { createNavGrid } from '../gen/navGrid';
import { NavGridDebug } from './NavGridDebug';
import { mulberry32 } from '../gen/mapGen';
import { getInput } from '../game/input';
import { getAudio } from '../game/audio';
import { useMapState } from '../game/mapStore';
import { useNet } from '../net/net';
import { getEnemyHealthManager } from '../game/enemyHealth';
import { calculateRoomDepth, getScaledEnemyStats } from '../game/difficultyScaling';
import { ParticleSystem } from '../effects/ParticleSystem';


export function MapScene() {
  const mapState = useMapState();
  const net = useNet();
  
  // Lobby mode: driven by current room
  const useLobby = (net.currentRoom ?? 'lobby') === 'lobby';
  const [lobbyConfig, setLobbyConfig] = useState<LobbyConfig>(defaultLobbyConfig);
  const [twistDeg, setTwistDeg] = useState(-1); // per-segment outward twist in degrees (persisted from tuning)
  useEffect(() => {
    (window as any).lobbyTwistDeg = twistDeg;
    if ((window as any).DEBUG_LOBBY_TWIST !== false) {
      try { console.log(`[lobby] twistDeg=${twistDeg}°`); } catch {}
    }
  }, [twistDeg]);
  
  const grid = useMemo(() => {
    if (useLobby) {
      return generateLobby(lobbyConfig);
    } else {
      return generateDungeon(mapState.seed, 48, 36, mapState.rooms);
    }
  }, [mapState.seed, mapState.rooms, mapState.generation, useLobby, lobbyConfig]);
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
    // Reset collected coins when map changes
    setCollected(new Set());
    
    // Clear all enemy health data
    const enemyHealthManager = getEnemyHealthManager();
    enemyHealthManager.getAllEnemies().clear();
    
    // TODO: Clear existing physics bodies (would need physics API enhancement)
    // For now, physics bodies accumulate but it's not critical for hot-reload demo
    
    setGrid(grid);
    const phys = getPhysics();
    // Clear previous static bodies (for hot reloads)
    phys.clearStaticBodies?.();
    // Build smoother circular wall ring in physics to match visuals of a big hall
    const sides = 32; // more segments for a rounder shape
    const innerRadius = 30; // interior radius (perimeter the player walks around)
    const wallHeight = 4.0;
    const thickness = 0.35; // thinner collider to allow closer approach
    // Place physics wall just behind the shop backs so players can walk up to facades
    const shopDepthPhys = 3.0;
    const physInnerRadius = innerRadius + shopDepthPhys * 0.5 + 0.15;
    const centerRadius = physInnerRadius + thickness / 2;
    const ringYawOffset = -(Math.PI / 3); // fixed orientation for ring
    const inwardBias = (twistDeg * Math.PI) / 180; // twist each wall outward
    for (let i = 0; i < sides; i++) {
      const a0 = ringYawOffset + (i / sides) * Math.PI * 2;
      const a1 = ringYawOffset + ((i + 1) / sides) * Math.PI * 2;
      const mid = (a0 + a1) / 2;
      const len = centerRadius * Math.tan(Math.PI / sides) * 2; // chord length at wall center radius
      const cx = Math.cos(mid) * centerRadius;
      const cz = Math.sin(mid) * centerRadius;
      const rotY = Math.atan2(cx, cz) + inwardBias; // align radial exactly, apply bias
      phys.addStaticBoxRotated?.(cx, wallHeight/2, cz, len, wallHeight, thickness, rotY);
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
      // Spawn near the inner perimeter so shops/walls are immediately visible
      const innerRadius = 30;
      const px = 0;
      const pz = innerRadius - 3;
      const body = phys.playerBody;
      // Force position update
      body.position.set(px, 0.6, pz);
      body.velocity.set(0, 0, 0);
      body.angularVelocity.set(0, 0, 0);
      
    }
    
    // Wait a frame for physics to be ready, then place spawn
    setTimeout(() => placeSpawn(), 0);
    
    // Debug toggle for nav grid and manual respawn + twist hotkeys
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'n' || e.key === 'N') {
        setShowNavDebug(prev => !prev);
      }
      if (e.key === 'r' || e.key === 'R') {
        console.log('Manual respawn triggered');
        placeSpawn();
      }
      if (e.key === ']') {
        setTwistDeg((d) => Math.min(60, (typeof d === 'number' && !isNaN(d) ? d : 25) + 2));
      }
      if (e.key === '[') {
        setTwistDeg((d) => Math.max(-60, (typeof d === 'number' && !isNaN(d) ? d : 25) - 2));
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [grid, mapState.generation, net.currentRoom, twistDeg]);

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
    {/* Hide grid walls in lobby; we render a circular lobby instead */}
    {!useLobby && <InstancedWalls positions={wallPositions} size={cellSize} />}
    
    {/* Only show decorations and enemies if not in lobby mode */}
    {!useLobby && (
      <>
        <Doorframes grid={grid} cellSize={cellSize} />
        <Decorations rooms={grid.rooms} cellSize={cellSize} seed={mapState.seed} />
      <InstancedCoins coins={coins} collected={collected} />
        {/* Spawn smart spiders in lair rooms with difficulty scaling */}
    {grid.rooms.flatMap((r, roomIndex) => {
      if (r.tag !== 'lair') return [];
      
      const roomDepth = calculateRoomDepth(grid.rooms, r);
      const spiderStats = getScaledEnemyStats(30, 8, roomDepth); // base health 30, base damage 8
      
      // Spawn multiple spiders based on difficulty
      return Array.from({ length: spiderStats.spawnCount }, (_, spiderIndex) => {
        // Spread spiders around the room center
        const angle = (spiderIndex / spiderStats.spawnCount) * Math.PI * 2;
        const radius = Math.min(r.w, r.h) * 0.3 * cellSize;
        const offsetX = Math.cos(angle) * radius;
        const offsetZ = Math.sin(angle) * radius;
        
        return (
          <SmartSpider 
            key={`smart-sp-${roomIndex}-${spiderIndex}`} 
            grid={navGrid} 
            cellSize={cellSize} 
            position={[
              (r.cx + 0.5) * cellSize + offsetX, 
              0.3, 
              (r.cy + 0.5) * cellSize + offsetZ
            ]}
            healthMultiplier={spiderStats.health / 30}
            damageMultiplier={spiderStats.damage / 8}
            speedMultiplier={spiderStats.speedMultiplier}
            alertnessBonus={spiderStats.alertnessBonus}
          />
        );
      });
    })}
    {/* Keep some basic PathSpiders for comparison */}
    {grid.rooms.slice(0, 2).map((r, i) => r.tag === 'normal' && (
      <PathSpider 
        key={`path-sp-${i}`} 
        grid={grid} 
        cellSize={cellSize} 
        start={[(r.cx + 0.5) * cellSize, 0.3, (r.cy + 0.5) * cellSize] as any} 
      />
    ))}
    
    {/* Spawn flying bats in treasure rooms with difficulty scaling */}
    {grid.rooms.flatMap((r, roomIndex) => {
      if (r.tag !== 'treasure') return [];
      
      const roomDepth = calculateRoomDepth(grid.rooms, r);
      const batStats = getScaledEnemyStats(40, 12, roomDepth); // base health 40, base damage 12
      
      // Spawn multiple bats based on difficulty
      return Array.from({ length: batStats.spawnCount }, (_, batIndex) => {
        // Spread bats around the room at different heights
        const angle = (batIndex / batStats.spawnCount) * Math.PI * 2 + (batIndex * 0.5);
        const radius = Math.min(r.w, r.h) * 0.4 * cellSize;
        const offsetX = Math.cos(angle) * radius;
        const offsetZ = Math.sin(angle) * radius;
        const heightVariation = batIndex * 0.3;
        
        return (
          <Bat 
            key={`bat-${roomIndex}-${batIndex}`} 
            grid={navGrid} 
            cellSize={cellSize} 
            position={[
              (r.cx + 0.5) * cellSize + offsetX, 
              2.5 + heightVariation, 
              (r.cy + 0.5) * cellSize + offsetZ
            ]}
            healthMultiplier={batStats.health / 40}
            damageMultiplier={batStats.damage / 12}
            speedMultiplier={batStats.speedMultiplier}
            alertnessBonus={batStats.alertnessBonus}
          />
        );
      });
    })}

    {/* Spawn archers in normal rooms with difficulty scaling */}
    {grid.rooms.flatMap((r, roomIndex) => {
      if (r.tag !== 'normal' || roomIndex % 3 !== 0) return []; // Only some normal rooms
      
      const roomDepth = calculateRoomDepth(grid.rooms, r);
      const archerStats = getScaledEnemyStats(25, 15, roomDepth); // base health 25, base damage 15
      
      // Spawn archers (fewer than other enemies due to range)
      const archerCount = Math.min(2, archerStats.spawnCount);
      return Array.from({ length: archerCount }, (_, archerIndex) => {
        const angle = (archerIndex / archerCount) * Math.PI * 2;
        const radius = Math.min(r.w, r.h) * 0.3 * cellSize;
        const offsetX = Math.cos(angle) * radius;
        const offsetZ = Math.sin(angle) * radius;
        
        return (
          <Archer 
            key={`archer-${roomIndex}-${archerIndex}`} 
            grid={navGrid} 
            cellSize={cellSize} 
            position={[
              (r.cx + 0.5) * cellSize + offsetX, 
              0.3, 
              (r.cy + 0.5) * cellSize + offsetZ
            ]}
            healthMultiplier={archerStats.health / 25}
            damageMultiplier={archerStats.damage / 15}
            speedMultiplier={archerStats.speedMultiplier}
            alertnessBonus={archerStats.alertnessBonus}
          />
        );
      });
    })}

    {/* Spawn slimes in various rooms with size variation */}
    {grid.rooms.flatMap((r, roomIndex) => {
      if (roomIndex % 4 !== 1) return []; // Only some rooms get slimes
      
      const roomDepth = calculateRoomDepth(grid.rooms, r);
      const slimeStats = getScaledEnemyStats(30, 8, roomDepth); // base health 30, base damage 8
      
      // Mix of slime sizes based on room depth
      const slimeTypes: Array<'small' | 'normal' | 'large'> = roomDepth < 3 ? ['small', 'normal'] :
                                                               roomDepth < 6 ? ['normal', 'large'] :
                                                               ['normal', 'large', 'large'];
      
      return slimeTypes.slice(0, slimeStats.spawnCount).map((size, slimeIndex) => {
        const angle = (slimeIndex / slimeTypes.length) * Math.PI * 2;
        const radius = Math.min(r.w, r.h) * 0.25 * cellSize;
        const offsetX = Math.cos(angle) * radius;
        const offsetZ = Math.sin(angle) * radius;
        
        return (
          <Slime 
            key={`slime-${roomIndex}-${slimeIndex}`} 
            grid={navGrid} 
            cellSize={cellSize} 
            size={size}
            position={[
              (r.cx + 0.5) * cellSize + offsetX, 
              0.4, 
              (r.cy + 0.5) * cellSize + offsetZ
            ]}
            healthMultiplier={slimeStats.health / 30}
            damageMultiplier={slimeStats.damage / 8}
            speedMultiplier={slimeStats.speedMultiplier}
            alertnessBonus={slimeStats.alertnessBonus}
          />
        );
      });
        })}
      </>
    )}
    
    {/* Always show projectile system and particles */}
    <ProjectileRenderer />
    <ParticleSystem />
    
    {/* Circular 16-sided lobby with shop fronts and central coffee shop */}
    {useLobby && (
      <CircularLobby twistDeg={twistDeg} />
    )}
    
    {/* Coins and goal are only in dungeon, not in lobby */}
    {!useLobby && (
      <>
        <InstancedCoins coins={coins} collected={collected} />
        <ProximityCoinCollector coins={coins} collected={collected} setCollected={setCollected} />
        <GoalGate grid={grid} cellSize={cellSize} />
      </>
    )}
    
    {/* Navigation debug visualization */}
    <NavGridDebug navGrid={navGrid} cellSize={cellSize} visible={showNavDebug} />
  </>;
}

function CircularLobby({ twistDeg = 25 }: { twistDeg?: number }) {
  const innerRadius = 30; // interior radius (walkable perimeter)
  const wallHeight = 4.0;
  const thickness = 0.35;
  const wallSides = 32; // smoother circle visually
  const shopDepth = 3.0;
  const shopCount = 16; // keep 16 shop fronts
  // Use chord length at inner radius for accurate segment width
  const shopChord = 2 * innerRadius * Math.sin(Math.PI / shopCount);
  const shopWidth = shopChord * 0.9; // small gap between shops
  const centerRadius = innerRadius + shopDepth * 0.5 + 0.15 + thickness / 2; // match physics behind shops
  const ringYawOffset = -(Math.PI / 3); // visual ring rotation fixed
  const inwardBias = (twistDeg * Math.PI) / 180; // twist outward visually too (synced with physics)

  // Shop brand labels
  const labels = [
    'Pick n Pay','Checkers','Woolworths Food','Clicks',
    'Dis-Chem','Mr Price','Game','Bounce',
    'Mugg & Bean','vida e caffè','Seattle Coffee Co','Bootlegger Coffee',
    'Tiger’s Milk','Beerhouse','Virgin Active','The Fun Company'
  ];

  // Optional GLB models per brand (add files under client/public/assets/models/shops/)
  const modelPaths: Record<string, string> = {
    'Checkers': '/assets/models/shops/checkers.glb'
    // Add more like: 'Virgin Active': '/assets/models/shops/virgin_active.glb'
  };

  // Optional per-brand scale (to fit facades). Adjust as needed per asset.
  const modelScales: Record<string, [number, number, number]> = {
    // Leave empty to use auto-fit scaling by default
  };
  // Optional multipliers to shrink/grow auto-fitted width per brand
  const modelScaleMultipliers: Record<string, number> = {
    'Checkers': 0.7
  };

  // Optional per-brand local rotation (radians) to correct model orientation
  const modelRotations: Record<string, [number, number, number]> = {
    // Checkers: upright (X), face outward (Y); no Z flip to avoid mirrored text
    'Checkers': [-Math.PI / 2, -Math.PI / 2, 0]
  };

  // Optional per-brand local position offset (x,y,z)
  const modelOffsets: Record<string, [number, number, number]> = {
    // Lift and nudge slightly forward
    'Checkers': [0, 2.0, 0.12]
  };

  // Load models once
  const { gl: renderer } = useThree();
  const [shopModels, setShopModels] = useState<Record<string, THREE.Object3D | null>>({});
  const [autoModelScales, setAutoModelScales] = useState<Record<string, [number, number, number]>>({});
  const [tableModel, setTableModel] = useState<THREE.Object3D | null>(null);
  const [tableYOffset, setTableYOffset] = useState<number>(0);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { getAssetLoader } = await import('../utils/AssetLoader');
      const loader = getAssetLoader(renderer);
      for (const [brand, path] of Object.entries(modelPaths)) {
        try {
          const gltf: any = await loader.loadModel(path);
          if (!mounted) return;
          const root: any = (gltf.scene || gltf.scenes?.[0] || null);
          if (root) {
            // Ensure front faces render: make materials double-sided and lit
            root.traverse((obj: any) => {
              if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
                const m = obj.material;
                if (Array.isArray(m)) {
                  m.forEach((mat: any) => {
                    if (mat) {
                      mat.side = (window as any).THREE ? (window as any).THREE.DoubleSide : 2;
                      if (mat.map && mat.map.encoding !== 3001 && (window as any).THREE) mat.map.encoding = (window as any).THREE.sRGBEncoding;
                      if ('metalness' in mat) mat.metalness = Math.min(0.5, mat.metalness ?? 0.2);
                      if ('roughness' in mat) mat.roughness = Math.max(0.6, mat.roughness ?? 0.8);
                      mat.needsUpdate = true;
                    }
                  });
                } else if (m) {
                  m.side = (window as any).THREE ? (window as any).THREE.DoubleSide : 2;
                  if (m.map && m.map.encoding !== 3001 && (window as any).THREE) m.map.encoding = (window as any).THREE.sRGBEncoding;
                  if ('metalness' in m) m.metalness = Math.min(0.5, m.metalness ?? 0.2);
                  if ('roughness' in m) m.roughness = Math.max(0.6, m.roughness ?? 0.8);
                  m.needsUpdate = true;
                }
              }
            });
            // Auto-scale to match facade width
            try {
              const box = new THREE.Box3().setFromObject(root);
              const size = new THREE.Vector3();
              box.getSize(size);
              const currentWidth = Math.max(size.x, 1e-3);
              const s = shopWidth / currentWidth;
              if (isFinite(s) && s > 0 && s < 10) {
                setAutoModelScales(prev => ({ ...prev, [brand]: [s, s, s] }));
              }
            } catch {}
          }
          setShopModels(prev => ({ ...prev, [brand]: root }));
        } catch (e) {
          // Fallback silently to box facade
        }
      }
      // Load diner table model for coffee shop seating (optional)
      try {
        const tablePath = '/assets/models/coffee/diner_table.glb';
        const gltf: any = await loader.loadModel(tablePath);
        if (!mounted) return;
        const root: any = (gltf.scene || gltf.scenes?.[0] || null);
        if (root) {
          root.traverse((obj: any) => {
            if (obj.isMesh) {
              obj.castShadow = true;
              obj.receiveShadow = true;
              const m = obj.material;
              if (Array.isArray(m)) m.forEach((mm: any) => { if (mm) { mm.side = (window as any).THREE ? (window as any).THREE.DoubleSide : 2; mm.needsUpdate = true; }});
              else if (m) { m.side = (window as any).THREE ? (window as any).THREE.DoubleSide : 2; m.needsUpdate = true; }
            }
          });
          // Compute ground offset so model sits on floor
          try {
            const box = new THREE.Box3().setFromObject(root);
            setTableYOffset(Math.max(0, -box.min.y));
          } catch {}
          setTableModel(root);
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, [renderer]);

  const wallSegments = new Array(wallSides).fill(0).map((_, i) => i);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.0, 0]} receiveShadow>
        <circleGeometry args={[innerRadius, 96]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      {/* Multi-segment walls for a rounder ring.
          IMPORTANT: Walls are built at centerRadius so their inner faces lie on innerRadius.
          If visuals look offset, adjust innerRadius/thickness consistently here and in physics above. */}
      {wallSegments.map((i) => {
        const a0 = ringYawOffset + (i / wallSides) * Math.PI * 2;
        const a1 = ringYawOffset + ((i + 1) / wallSides) * Math.PI * 2;
        const mid = (a0 + a1) / 2;
        const len = centerRadius * Math.tan(Math.PI / wallSides) * 2; // chord length at wall center radius
        const cx = Math.cos(mid) * centerRadius;
        const cz = Math.sin(mid) * centerRadius;
        const rotY = Math.atan2(Math.cos(mid) * centerRadius, Math.sin(mid) * centerRadius) + inwardBias;
        return (
          <group key={`wall-${i}`} position={[cx, wallHeight/2, cz]} rotation={[0, rotY, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[len, wallHeight, thickness]} />
              <meshStandardMaterial color="#6b7280" emissive="#1f2937" emissiveIntensity={0.15} />
            </mesh>
          </group>
        );
      })}

      {/* Shop fronts aligned with inner wall */}
      {new Array(shopCount).fill(0).map((_, i) => {
        const mid = ringYawOffset + (i / shopCount) * Math.PI * 2;
        const dist = innerRadius - (shopDepth / 2) - 0.02; // sit flush against inner wall
        const cx = Math.cos(mid) * dist;
        const cz = Math.sin(mid) * dist;
        const rotY = Math.atan2(Math.cos(mid) * centerRadius, Math.sin(mid) * centerRadius) + inwardBias;
        const shopHeight = wallHeight * 0.9; // taller facades
        const label = labels[i] || 'Shop';
        // Distinct color per shop
        const palette = [
          '#ef4444', '#f59e0b', '#eab308', '#84cc16', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
          '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316'
        ];
        const color = palette[i % palette.length];
        return (
          <group key={`shop-${i}`} position={[cx, shopHeight/2, cz]} rotation={[0, rotY, 0]}>
            {shopModels[label] ? (
              <primitive
                object={shopModels[label]!}
                position={[
                  (modelOffsets[label]?.[0] ?? 0),
                  -shopHeight/2 + (modelOffsets[label]?.[1] ?? 0),
                  (modelOffsets[label]?.[2] ?? 0)
                ]}
                rotation={modelRotations[label] || [0, 0, 0]}
                scale={
                  modelScales[label]
                    || (autoModelScales[label]
                          ? [
                              autoModelScales[label][0] * (modelScaleMultipliers[label] || 1),
                              autoModelScales[label][1] * (modelScaleMultipliers[label] || 1),
                              autoModelScales[label][2] * (modelScaleMultipliers[label] || 1)
                            ]
                          : [1, 1, 1])
                }
              />
            ) : (
              <mesh castShadow receiveShadow>
                <boxGeometry args={[shopWidth, shopHeight, shopDepth]} />
                <meshStandardMaterial color={color} roughness={0.9} metalness={0.05} />
              </mesh>
            )}
            <Text position={[0, shopHeight/2 + 0.18, shopDepth/2 + 0.02]} fontSize={0.22} color={'#e5e7eb'} anchorX="center">
              {label}
            </Text>
          </group>
        );
      })}

      {/* Central coffee shop with simple seating */}
      <group>
        {/* Bigger coffee shop in the center */}
        <mesh position={[0, 1.1, 0]} castShadow>
          <cylinderGeometry args={[2.2, 2.2, 2.2, 24]} />
          <meshStandardMaterial color="#6b7280" />
        </mesh>
        <Text position={[0, 2.4, 0]} fontSize={0.5} color={'#f3f4f6'} anchorX="center">Coffee</Text>
        {/* Seating layout: 10 tables in two arcs (5 inner, 5 outer) */}
        {(() => {
          // Increase spacing: larger radii and staggered angles
          const innerR = 6.5;
          const outerR = 9.0;
          const inner = Array.from({ length: 5 }, (_, i) => {
            const ang = (i / 5) * Math.PI * 2 + Math.PI / 12; // slight offset
            return { ang, r: innerR };
          });
          const outer = Array.from({ length: 5 }, (_, i) => {
            const ang = (i / 5) * Math.PI * 2 + Math.PI / 6; // stagger relative to inner arc
            return { ang, r: outerR };
          });
          const tables = [...inner, ...outer];
          return tables.map(({ ang, r }, idx) => {
            const x = Math.cos(ang) * r;
            const z = Math.sin(ang) * r;
            return (
              <group key={`seat-${idx}`} position={[x, 0, z]} rotation={[0, ang + Math.PI, 0]}>
                {tableModel ? (
                  <primitive object={tableModel.clone()} position={[0, tableYOffset, 0]} scale={[0.5, 0.5, 0.5]} />
                ) : (
                  <>
                    <mesh castShadow>
                      <cylinderGeometry args={[0.32, 0.32, 0.5, 14]} />
                      <meshStandardMaterial color="#9ca3af" />
                    </mesh>
                    <mesh position={[0, 0.32, -0.2]} castShadow>
                      <boxGeometry args={[0.46, 0.03, 0.28]} />
                      <meshStandardMaterial color="#d1d5db" />
                    </mesh>
                  </>
                )}
              </group>
            );
          });
        })()}
      </group>
    </group>
  );
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
          getAudio().play('pickup');
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
  // Pre-calculate all torch and prop data for instanced rendering
  const decorationData = useMemo(() => {
    const rnd = mulberry32(seed + 12345);
    const torches: { position: [number, number, number]; color: string; emissive: string; intensity: number }[] = [];
    const props: { position: [number, number, number]; color: string }[] = [];
    
    for (const r of rooms) {
      const cx = (r.cx + 0.5) * cellSize;
      const cz = (r.cy + 0.5) * cellSize;
      
      // Torch lights in lairs/treasure rooms
      if (r.tag === 'lair' || r.tag === 'treasure') {
        const count = r.tag === 'lair' ? 2 : 1;
        const color = r.tag === 'lair' ? '#ff4444' : '#ffb347';
        const intensity = r.tag === 'lair' ? 0.8 : 0.7;
        
        for (let i = 0; i < count; i++) {
          const angle = rnd() * Math.PI * 2;
          const rad = Math.max(0.6, Math.min(r.w, r.h) * 0.3) * cellSize;
          const x = cx + Math.cos(angle) * rad;
          const z = cz + Math.sin(angle) * rad;
          
          torches.push({
            position: [x, 0.9, z],
            color,
            emissive: '#ff8c00',
            intensity
          });
        }
      }
      
      // Simple props in normal rooms  
      if (r.tag === 'normal' && rnd() < 0.4) {
        const px = cx + (rnd() - 0.5) * Math.max(0.5, r.w * 0.3) * cellSize;
        const pz = cz + (rnd() - 0.5) * Math.max(0.5, r.h * 0.3) * cellSize;
        
        props.push({
          position: [px, 0.4, pz],
          color: '#6b6f7a'
        });
      }
    }
    
    return { torches, props };
  }, [rooms, cellSize, seed]);

  return (
    <group>
      <InstancedTorches torches={decorationData.torches} />
      <InstancedProps props={decorationData.props} />
    </group>
  );
}

// Instanced props component
function InstancedProps({ props }: { props: { position: [number, number, number]; color: string }[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  useEffect(() => {
    if (!meshRef.current || props.length === 0) return;
    
    const mesh = meshRef.current;
    
    for (let i = 0; i < props.length; i++) {
      const prop = props[i];
      const matrix = new THREE.Matrix4().makeTranslation(
        prop.position[0], 
        prop.position[1], 
        prop.position[2]
      );
      mesh.setMatrixAt(i, matrix);
    }
    
    mesh.instanceMatrix.needsUpdate = true;
  }, [props]);

  if (props.length === 0) return null;

  return (
    <instancedMesh 
      ref={meshRef}
      args={[undefined, undefined, props.length]}
      castShadow
    >
      <boxGeometry args={[0.4, 0.8, 0.4]} />
      <meshStandardMaterial color="#6b6f7a" />
    </instancedMesh>
  );
}


