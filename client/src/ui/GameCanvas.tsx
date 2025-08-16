import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, StatsGl } from '@react-three/drei';
import { PlayerMesh } from '../game/player';
import { useNet } from '../net/net';
import { MapScene } from './MapScene';
import { HUD } from './HUD';
import { Interactables } from './Interactables';
import { TouchControls } from './TouchControls';
import { Prompt } from './Prompt';
import { AvatarPanel } from './AvatarPanel';
import { WinOverlay } from './WinOverlay';
import { useInventory } from '../game/inventory';
import { getCoinTarget } from '../game/config';
import { MiniMap } from './MiniMap';
import { MapControlsPanel } from './MapControlsPanel';
import { avatarStore } from '../avatar/store';
import { useEffect } from 'react';

function Scene() {
  const net = useNet();
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 2]} intensity={1.0} />
      <MapScene />
      <PlayerMesh />
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#2a2f39" />
      </mesh>
      <gridHelper args={[20, 20, '#444', '#333']} />
      {/* Other players */}
      {Array.from(net.players.values()).map((p) => {
        const prev = net.playersPrev.get(p.id) || p;
        const dt = Math.max(16, net.tCurr - net.tPrev);
        const alpha = Math.min(1, (performance.now() - net.tCurr) / dt);
        const ix = prev.x + (p.x - prev.x) * alpha;
        const iy = prev.y + (p.y - prev.y) * alpha;
        const iz = prev.z + (p.z - prev.z) * alpha;
        return (
        <mesh key={p.id} position={[ix, iy, iz]}>
          <sphereGeometry args={[0.25, 12, 12]} />
          <meshStandardMaterial color="#ff8a00" />
        </mesh>);
      })}
    </>
  );
}

export function GameCanvas({ showConfigPanels = false }: { showConfigPanels?: boolean }) {
  const inv = useInventory();
  const won = inv.items.coin >= getCoinTarget();
  useEffect(() => {
    (window as any).gameApi = {
      setAvatar: (cfg: any) => avatarStore.set(cfg || {}),
    };
    return () => { try { delete (window as any).gameApi; } catch {} };
  }, []);
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas shadows camera={{ position: [4, 3, 6], fov: 60 }}>
        <color attach="background" args={[0.06, 0.07, 0.1]} />
        <Suspense fallback={null}>
          <Scene />
          <Interactables />
        </Suspense>
        <OrbitControls makeDefault enableDamping enablePan={false} enableZoom={false} />
        <StatsGl />
      </Canvas>
      <HUD />
      {showConfigPanels ? <AvatarPanel /> : null}
      <TouchControls />
      {showConfigPanels ? <MapControlsPanel /> : null}
      <MiniMap />
      <WinOverlay visible={won} />
    </div>
  );
}


