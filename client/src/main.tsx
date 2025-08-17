import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GameCanvas } from './ui/GameCanvas';
import { MainLandingPage } from './ui/MainLandingPage';
import { AvatarSetupScreen } from './ui/LandingScreen';
import { RoomSelectionScreen } from './ui/RoomSelectionScreen';
import { connect } from './net/net';

type AppScreen = 'landing' | 'avatar' | 'rooms' | 'game';

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('landing');
  
  return (
    <div style={{ width: '100%', height: '100%' }}>
      {/* Only show game canvas and controls when in game mode */}
      {currentScreen === 'game' && <GameCanvas showConfigPanels={false} />}
      
      {/* Multi-page flow */}
      {currentScreen === 'landing' && (
        <MainLandingPage onPlayGame={() => setCurrentScreen('avatar')} />
      )}
      
      {currentScreen === 'avatar' && (
        <AvatarSetupScreen onContinue={() => setCurrentScreen('rooms')} />
      )}
      
      {currentScreen === 'rooms' && (
        <RoomSelectionScreen onContinue={() => setCurrentScreen('game')} />
      )}
      
      {/* Quick bypass for development - remove this in production */}
      {currentScreen !== 'game' && (
        <button
          onClick={() => setCurrentScreen('game')}
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            background: '#22c55e',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            zIndex: 1000
          }}
        >
          🎮 Skip to Game
        </button>
      )}
    </div>
  );
}

const el = document.getElementById('root')!;
createRoot(el).render(<App />);

// Expose quick room APIs
const net = connect();
(window as any).netJoin = (room: string) => net.joinRoom(room);
(window as any).netList = () => net.getRooms();
(window as any).netCreate = (name: string) => net.createRoom(name);

// Expose avatar API for console testing
import { avatarStore } from './avatar/store';
import { clearAvatarCache, loadGLTFPart } from './avatar/loader';
import { getPlayerCombat } from './game/playerCombat';
(window as any).gameApi = {
  ...((window as any).gameApi || {}),
  setAvatar: avatarStore.set.bind(avatarStore),
  getAvatar: avatarStore.get.bind(avatarStore),
  getPlayerCombat: () => getPlayerCombat(),
  clearAvatarCache,
  testAvatar: () => {
    console.log('🎭 Current avatar config:', avatarStore.get());
    console.log('🎨 Testing color change...');
    avatarStore.set({ colors: { primary: '#ff0000', secondary: '#00ff00' } });
    console.log('✅ Try: window.gameApi.setAvatar({ colors: { primary: "#0000ff" } })');
  },
  testAnimations: () => {
    console.log('🎬 Testing animation system...');
    clearAvatarCache();
    avatarStore.set({ bodyId: 'bodyA' }); // Force reload
    console.log('✅ Cache cleared and bodyA reloading. Check console for animation debug info.');
  },
  testBodyB: () => {
    console.log('🧠 Testing BrainStem model (bodyB) - should have animations...');
    clearAvatarCache();
    avatarStore.set({ bodyId: 'bodyB' });
    console.log('✅ Switched to bodyB. Check console for animation debug info.');
  },
  testBodyC: () => {
    console.log('🤖 Testing RiggedFigure model (bodyC)...');
    clearAvatarCache();
    avatarStore.set({ bodyId: 'bodyC' });
    console.log('✅ Switched to bodyC. Check console for animation debug info.');
  },
  // Advanced projectile testing
  testProjectiles: () => {
    const combat = getPlayerCombat();
    console.log('💥 Testing advanced projectiles...');
    console.log('Current type:', combat.getProjectileType());
    console.log('Available: magic, ricochet, explosive');
    console.log('✅ Use: window.gameApi.setWeapon("ricochet") to switch');
  },
        setWeapon: (type: string) => {
        const combat = getPlayerCombat();
        if (['magic', 'ricochet', 'explosive'].includes(type)) {
          combat.setProjectileType(type as any);
          console.log(`🔫 Weapon switched to: ${type}`);
        } else {
          console.log('❌ Invalid weapon. Use: magic, ricochet, or explosive');
        }
      },
      // GLB inspection commands
      inspectGLB: async (id: string) => {
        console.log(`🔍 Inspecting GLB file: ${id}.glb`);
        try {
          const obj = await loadGLTFPart(id);
          if (!obj) {
            console.log('❌ GLB not found or failed to load');
            return;
          }
          
          console.log(`📦 GLB "${id}" structure:`);
          console.log('- Root object:', obj);
          console.log('- Children count:', obj.children.length);
          
          let meshCount = 0;
          let boneCount = 0;
          const meshNames: string[] = [];
          
          obj.traverse((child: any) => {
            console.log(`  - ${child.type}: "${child.name}" (visible: ${child.visible})`);
            if (child.isMesh) {
              meshCount++;
              meshNames.push(child.name || `Mesh${meshCount}`);
              console.log(`    Geometry: vertices=${child.geometry.attributes.position?.count || 0}`);
              console.log(`    Material: ${child.material?.type || 'none'} (color: ${child.material?.color?.getHexString?.() || 'none'})`);
            }
            if (child.isBone) {
              boneCount++;
            }
          });
          
          console.log(`📊 Summary: ${meshCount} meshes, ${boneCount} bones`);
          console.log(`🎭 Mesh names: ${meshNames.join(', ')}`);
          
          if (obj.animations) {
            console.log(`🎬 Animations: ${obj.animations.map((a: any) => a.name).join(', ')}`);
          }
          
          const box = new (window as any).THREE.Box3().setFromObject(obj);
          const size = box.getSize(new (window as any).THREE.Vector3());
          console.log(`📏 Bounding box size: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
          
        } catch (error) {
          console.error('❌ GLB inspection failed:', error);
        }
      },
      inspectBodyA: () => (window as any).gameApi.inspectGLB('bodyA'),
      inspectBodyB: () => (window as any).gameApi.inspectGLB('bodyB'),
      inspectBodyC: () => (window as any).gameApi.inspectGLB('bodyC'),
      inspectHeadA: () => (window as any).gameApi.inspectGLB('headA')
};


