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
import { GamepadControls } from './GamepadControls';
import { avatarStore } from '../avatar/store';
import { useEffect } from 'react';
import { Nameplate, idToColor } from './Nameplate';
import { getPhysics } from '../game/physics';
import { LobbyPanel } from './LobbyPanel';
import { AvatarRoot, NetworkedAvatarRoot } from '../avatar/Avatar';
import { RemoteProjectileRenderer } from './RemoteProjectileRenderer';
import { CombatFeedback } from './CombatFeedback';
import { AvatarDressUpPanel } from './AvatarDressUpPanel';
import { ClothingPanel } from './ClothingPanel';


function Scene() {
  const net = useNet();
  const physics = getPhysics();
  
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
      {null}
      {/* Other players with enhanced nameplates */}
      {(() => {
        const otherPlayers = Array.from(net.players.values()).filter(p => p.id !== net.selfId);
        
        return otherPlayers;
      })().map((p) => {
        const prev = net.playersPrev.get(p.id) || p;
        const dt = Math.max(16, net.tCurr - net.tPrev);
        const alpha = Math.min(1, (performance.now() - net.tCurr) / dt);
        let ix = prev.x + (p.x - prev.x) * alpha;
        let iy = prev.y + (p.y - prev.y) * alpha;
        let iz = prev.z + (p.z - prev.z) * alpha;

        // Use interpolation for smooth remote movement
        const SIMPLE_REMOTE = false;
        if (SIMPLE_REMOTE) {
          ix = p.x;
          iy = p.y;
          iz = p.z;
        }
        
        // Remote player coordinate system is working correctly
        
        // Interpolate rotation with proper angle wrapping
        const prevRot = prev.rotation || 0;
        const currRot = p.rotation || 0;
        let rotDiff = currRot - prevRot;
        // Handle angle wrapping (shortest rotation path)
        if (rotDiff > Math.PI) rotDiff -= 2 * Math.PI;
        if (rotDiff < -Math.PI) rotDiff += 2 * Math.PI;
        let rotation = prevRot + rotDiff * alpha;
        if (SIMPLE_REMOTE) rotation = currRot;
        
        const color = idToColor(p.id);
        
        // Calculate distance from local player
        const playerPos = physics.playerBody.position;
        const distance = Math.sqrt(
          Math.pow(ix - playerPos.x, 2) + 
          Math.pow(iz - playerPos.z, 2)
        );
        
        // rotation is now interpolated above
        
        return (
          <group key={p.id}>
            {/* Player avatar with proper position, rotation and networked config */}
            <NetworkedAvatarRoot 
              position={[ix, iy + 0.6, iz]}
              rotation={rotation}
              config={net.playerAvatars.get(p.id)}
            />
            
            {/* Enhanced nameplate */}
            <Nameplate 
              playerId={p.id}
              position={[0, 0, 0]}
              name={p.name}
              color={color}
              distance={distance}
            />
          </group>
        );
      })}
      {/* Remote projectiles from other players */}
      <RemoteProjectileRenderer />
      
    </>
  );
}



export function GameCanvas({ showConfigPanels = false }: { showConfigPanels?: boolean }) {
  const inv = useInventory();
  const won = inv.items.coin >= getCoinTarget();
  const net = useNet();
  useEffect(() => {
    (window as any).gameApi = {
      setAvatar: (cfg: any) => avatarStore.set(cfg || {}),
    };
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Digit1') (window as any).netJoin?.('lobby');
      if (e.code === 'Digit2') (window as any).netCreate?.('Private Room');
      if (e.code === 'Digit3') (window as any).netList?.();
    };
    window.addEventListener('keydown', handler);
    return () => { try { delete (window as any).gameApi; } catch {} };
  }, []);
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas shadows camera={{ position: [4, 3, 6], fov: 60 }}>
        <color attach="background" args={[0.06, 0.07, 0.1]} />
        <Suspense fallback={null}>
          <Scene />
          {/* Disable complex interactables for lobby testing */}
          {/* <Interactables /> */}
        </Suspense>
        <OrbitControls makeDefault enableDamping enablePan={false} enableZoom={false} />
        <StatsGl />
      </Canvas>
      {/* Simplified UI for lobby testing */}
      <HUD />
      {/* Current room indicator */}
      <div style={{
        position: 'fixed',
        top: 12,
        left: 12,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        color: '#fff',
        padding: '6px 10px',
        borderRadius: 6,
        fontSize: 12,
        fontFamily: 'Arial, sans-serif'
      }}>
        Room: {net.currentRoom || 'lobby'}
      </div>
      <TouchControls />
      
      {/* Hide complex panels for now - uncomment when needed */}
      {/* <LobbyPanel /> */}
      {/* {showConfigPanels ? <AvatarPanel /> : null} */}
      {/* <GamepadControls /> */}
      {/* {showConfigPanels ? <MapControlsPanel /> : null} */}
      {/* <MiniMap /> */}
      {/* <WinOverlay visible={won} /> */}
      
      {/* Combat feedback */}
      <CombatFeedback />
      
      {/* Avatar dress-up system */}
      {null}
      
      {/* Hide the old clothing panel since we integrated it into dress up panel */}
      {/* <ClothingPanel /> */}
      
      {null}
    </div>
  );
}


