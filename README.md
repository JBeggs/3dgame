# 🎮 Advanced 3D Dungeon Game

A sophisticated multiplayer 3D dungeon crawler built with React Three Fiber, featuring advanced AI, combat mechanics, and mobile controls.

## 🚀 Quick Start

### Client
```bash
cd client
npm install
npm run dev
```

### Server  
```bash
cd server
npm install
npm run start
```

Open the client dev server URL that Vite prints (default `http://localhost:5173`).  
For LAN access from mobile devices: `http://<your-ip>:5173`

## ✨ Feature Highlights

### 🧠 **Advanced AI & Combat** ✅
- **Group AI**: Pack hunting with leader/flanker coordination  
- **Smart Enemies**: Spiders, Bats, Archers, Slimes with behavioral states
- **Difficulty Scaling**: Progressive challenge based on room depth
- **Enemy Health System**: Visual health bars and death animations
- **Sound & Particle Effects**: Combat audio and visual feedback

### 🏹 **Player Combat System** ✅  
- **Ranged Weapons**: Magic, Ricochet, and Explosive projectiles
- **Weapon Switching**: Press 1/2/3 keys to change weapon types
- **Ammo System**: 20 rounds with auto-reload mechanics
- **Advanced Projectiles**: Bouncing ricochet shots and area-damage explosions
- **Combat Balance**: Carefully tuned damage, speed, and cooldown values

### 📱 **Mobile & Input Controls** ✅
- **Advanced Touch Joystick**: Smoothing curves, deadzone, sensitivity tuning
- **Extended Input Range**: Touch works beyond visual trackpad boundaries  
- **Gamepad Support**: Xbox/PlayStation controller compatibility
- **Multi-Input**: Seamless keyboard + touch + gamepad integration
- **iOS Optimized**: Mobile Safari compatibility and touch improvements

### 🎭 **Avatar System** ✅
- **Modular Design**: Swappable body, head, outfit, and accessories
- **Animation Blending**: 5-state system (idle, run, jump, fall, land)
- **GLB Asset Support**: Real 3D models with fallback primitive shapes
- **Runtime Customization**: Console API for testing and configuration
- **Color System**: 4-channel color customization (primary, secondary, accent, accessory)

### 🏗️ **Performance & Assets** ✅
- **Mesh Instancing**: 5-10x fewer draw calls through batched rendering
- **CI Size Budget**: Automated 10MB asset limit enforcement  
- **Asset Pipeline**: GLB compression and KTX2 texture tools
- **Debug Tools**: Navigation grid overlay, size reporting, performance monitoring

### 🌍 **World Generation** ✅
- **Procedural Dungeons**: Room-based generation with corridors and connections
- **Interactive Elements**: Color-coded keys/doors with proximity interaction
- **Visual Enhancements**: Doorframes, torches, decorative props with instanced rendering
- **Minimap System**: Real-time dungeon layout and player tracking

## 🎮 How to Play

### Controls
- **Desktop**: WASD + Space (jump) + E (action) + Mouse look
- **Mobile**: Virtual joystick + jump/action buttons  
- **Gamepad**: Left stick (move) + A/B buttons (jump/action)
- **Weapons**: Press 1/2/3 to switch between Magic/Ricochet/Explosive

### Gameplay
1. Navigate through procedurally generated dungeons
2. Collect coins while avoiding or fighting enemies
3. Use color-coded keys to unlock matching doors
4. Experience progressive difficulty as you go deeper
5. Master different weapon types for tactical advantage

## 🛠️ Development Features

### Console API
```javascript
// Avatar system testing
window.gameApi.testAvatar()      // Test avatar functionality  
window.gameApi.testBodyB()       // Switch to BrainStem model
window.gameApi.setAvatar({...})  // Runtime avatar configuration

// Combat system testing  
window.gameApi.setWeapon('ricochet')  // Switch weapon types
window.gameApi.getPlayerCombat()      // Access combat manager

// Debug tools
Press 'N' in-game to toggle navigation debug overlay
Press 'R' to respawn player (development)
```

### Asset Management
```bash
# Size reporting
npm run assets:report

# Budget validation  
npm run size:budget

# Build with size check
npm run build
```

## 📊 Implementation Status

| Feature Category | Status | Progress |
|------------------|--------|----------|
| **Core Gameplay** | ✅ Complete | 100% |
| **AI & Combat** | ✅ Complete | 100% |
| **Mobile Controls** | ✅ Complete | 100% |
| **Avatar System** | ✅ Complete | 90% |
| **Performance** | ✅ Complete | 95% |
| **Multiplayer** | 🟡 Partial | 60% |
| **Asset Pipeline** | 🟡 Partial | 70% |

## 🎯 Next Steps
- [ ] Server authority for combat validation
- [ ] Asset compression (KTX2, Draco, Meshopt)  
- [ ] Advanced group AI tactics
- [ ] Complete dress-up system
- [ ] Boss enemies and special mechanics

## 📋 Documentation
Detailed feature documentation available in individual `.md` files:
- `ENEMIES_AND_COMBAT.md` - AI behaviors and combat mechanics
- `RANGED_ENEMIES_AND_PROJECTILES.md` - Projectile system and weapons  
- `MOBILE_CONTROLS_AND_MOVEMENT.md` - Input and control systems
- `AVATAR_SYSTEM.md` - Character customization and animations
- `ASSET_PIPELINE.md` - Performance optimizations and asset management


