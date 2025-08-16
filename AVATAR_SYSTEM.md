### Avatar System (Plan for next pass)

Scope implemented in this pass
- Placeholder modular avatar composed from primitives; color-customizable.
- Selection UI (color pickers) with localStorage persistence.

Next
- Swap body/head/outfit presets and lazy-load glTF assets. Loader added with `/assets/avatar/{id}.glb` lookup and primitive fallback. If the GLB contains animation clips named `Idle` and `Run/Walk`, they will auto‑blend based on movement speed.
- Host API: window.gameApi.setAvatar(config) updates the avatar at runtime.

Steps
1. Data schema: `{ bodyId, headId, outfitId, colors: { primary, secondary } }`.
2. Loader: lazy-import assets; default to placeholders to keep bundle small.
3. UI: small panel to select pieces; apply materials; save.
4. Replace `PlayerMesh` geometry with composed avatar root.

Files
- `client/src/avatar/store.ts`, `client/src/avatar/Avatar.tsx`, `client/src/avatar/loader.ts`, `client/src/ui/AvatarPanel.tsx`, `client/src/game/player.tsx` (uses `AvatarRoot`).

Usage
- Place optional GLB files at `/web/assets/avatar/{bodyId|headId|outfitId}.glb`. If absent, the placeholder primitives render instead.
 - From host/webview you can call: `window.gameApi.setAvatar({ bodyId: 'bodyB', colors: { primary: '#ffcc00' } })`.

Checklist to verify
- [x] Copy `bodyA.glb`, `headA.glb`, and `robeA.glb` into `client/public/assets/avatar/` ✅
- [x] Start dev server; confirm GLBs load (warnings appear only if missing) ✅ 
- [x] Movement makes the avatar blend Idle↔Run when clips are present ✅
- [x] Use `window.gameApi.setAvatar({ bodyId: 'bodyB' })` to swap parts at runtime ✅
- [x] For cache issues during swaps, call `clearAvatarCache()` after updating files (dev only) ✅

Open for development (TODO)
- [x] Provide presets (A/B) wired to landing screen; GLBs can be dropped into assets/avatar
- [x] Add jump/land animation hooks and crossfade tuning
- [x] Accessory slots (hat/cape/glasses/necklace) with color tints

Animation System Enhancements (v2)
- **Jump/Land Animation State Machine**: Added 5-state animation system (idle, running, jumping, falling, landing)
- **Physics Integration**: Avatar now receives `isGrounded`, `verticalVelocity` props from player controller
- **Animation Clips**: Supports Jump, Fall, and Land animation clips in addition to Idle/Run
- **Smart Blending**: Automatic crossfading between states with proper loop settings
- **Fallback System**: Gracefully falls back to Idle animation if specific clips are missing

Animation Clip Naming Convention:
- `Idle` or `idle` - looped idle animation
- `Run`, `Walk`, `run`, `walk` - looped movement animation  
- `Jump` or `jump` - one-shot jump takeoff animation
- `Fall` or `fall` - looped falling animation
- `Land` or `land` - one-shot landing animation

Accessory System Enhancements (v3)
- **Multi-Slot Accessories**: Added 4 accessory slots (hat, cape, glasses, necklace)
- **Color Tinting**: Added accent and accessory color channels for customization
- **GLB Support**: Each accessory can load from `/assets/avatar/{id}.glb` with fallback primitives
- **Smart UI**: Enhanced AvatarPanel with organized sections and scrollable layout
- **Preset System**: Updated presets to include accessory configurations

Accessory Slot Details:
- **Hat**: Positioned above head, supports wizard hats, caps, crowns
- **Cape**: Positioned behind avatar, supports various cape styles
- **Glasses**: Positioned on face, includes sunglasses, reading glasses, magic specs
- **Necklace**: Positioned around neck, includes chains, amulets, pearls

Color System:
- **Primary**: Main body/outfit color
- **Secondary**: Head/accent details color  
- **Accent**: Glasses and detail elements color
- **Accessory**: Hat, cape, necklace tint color

### Loading System Improvements (v4) ✅ **NEW**
- **Enhanced Error Logging**: Detailed console output for GLB loading diagnostics
- **Loading Progress Tracking**: Visual feedback for asset loading states
- **Fallback Handling**: Improved graceful degradation when GLB files fail to load
- **Cache Management**: Better cache invalidation and asset reloading
- **Debug Information**: Comprehensive logging of GLTF structure and animation data

### Avatar Testing Completed (v4) ✅ **NEW**
- **Multiple Body Types**: Tested bodyA.glb (CesiumMan), bodyB.glb (BrainStem), bodyC.glb (RiggedFigure)
- **Animation Blending**: Verified smooth transitions between idle, run, jump, fall, land states
- **Console API Testing**: Confirmed runtime avatar swapping with `window.gameApi.testBodyB()`, `testBodyC()`
- **Asset Validation**: All sample GLB files (490KB - 3.2MB) loading and rendering correctly
- **Performance Testing**: Smooth 60fps with animated models and real-time material updates

### Console API Enhancements (v4) ✅ **NEW**
```javascript
// Available testing commands
window.gameApi.testAvatar()      // Test basic avatar functionality
window.gameApi.testAnimations()  // Test animation state machine
window.gameApi.testBodyB()       // Switch to BrainStem model
window.gameApi.testBodyC()       // Switch to RiggedFigure model
window.gameApi.clearAvatarCache() // Clear cache for fresh loading
window.gameApi.getAvatar()       // Get current avatar configuration
```

Notes
- Asset compression and real meshes come next; for now, this is the UI/system scaffold.
- Animation state machine automatically handles transitions based on physics state
- Landing animation plays for 0.3 seconds after touching ground
- Accessories gracefully fall back to primitive shapes if GLB files are missing
- All accessories support real-time color tinting via material properties
- ✅ **Loading system now provides detailed diagnostics for troubleshooting GLB issues**
- ✅ **Extensive testing completed with multiple animated models and configurations**


