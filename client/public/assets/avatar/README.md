# Avatar GLB Test Files

## Current Files:
- **bodyA.glb** (490KB) - CesiumMan from Khronos glTF samples - may not have animations
- **bodyB.glb** (3.2MB) - BrainStem from Khronos glTF samples - **ANIMATED** brain character
- **bodyC.glb** - RiggedFigure from Khronos glTF samples - simple rigged character  
- **headA.glb** (163KB) - Fox from Khronos glTF samples - animated fox model  
- **robeA.glb** (15KB) - RiggedSimple from Khronos glTF samples - basic rigged character

## Testing:
All files are valid glTF v2 binary models and should load automatically when the game starts.

## Console Commands:
Test the avatar system in the browser console:
```js
// Test different body models for animations
window.gameApi.testBodyB();  // BrainStem - should have animations!
window.gameApi.testBodyC();  // RiggedFigure 
window.gameApi.testAnimations(); // Back to bodyA

// Test colors and accessories
window.gameApi.setAvatar({ colors: { primary: '#ff0000' } });
window.gameApi.setAvatar({ bodyId: 'bodyB', colors: { primary: '#00ff00' } });

// Check current configuration
console.log('Current avatar:', window.gameApi.getAvatar());
```

## Animation Support:
- CesiumMan (bodyA.glb) includes animation clips that the system will auto-detect
- The avatar system looks for clips named "Idle", "Run", "Walk", "Jump", "Fall", "Land"
- Smooth blending between idle and run based on movement speed

## Source:
Files downloaded from: https://github.com/KhronosGroup/glTF-Sample-Models
