### Mobile Controls and Movement Upgrades — Completed

What was added
- Upgraded input to a singleton with programmatic setters (`getInput()`), enabling shared keyboard + touch.
- `TouchControls` virtual joystick overlays on mobile and sets movement vector; supports mouse/trackpad drag.
- Grounded jump: proper raycast ground check in physics (`isGrounded()`), used by player controller.
- Keyboard handlers attached with `passive: false` and `preventDefault` for Space/Arrows to avoid page scroll.
- Joystick listeners marked `passive`, drag requires press-and-hold; context menu disabled; high z-index so it stays interactive.
- OrbitControls: pan disabled, zoom disabled (to avoid non-passive wheel handler).
- Files: `client/src/game/input.ts`, `client/src/ui/TouchControls.tsx`, `client/src/game/player.tsx`, `client/src/ui/GameCanvas.tsx`.

How to try
```
cd client && npm run dev
```
- Desktop: WASD + Space. Trackpad/mouse: click and drag inside the left circle. Mobile: press and drag inside the left circle.

### Joystick Smoothing Enhancements (v2) ✅ **NEW**
- **Advanced Smoothing Curve**: Configurable smoothing with power curve options (linear, quadratic, cubic)
- **Deadzone Tuning**: Adjustable deadzone (0-0.5) to prevent drift and improve precision  
- **Sensitivity Control**: Variable sensitivity multiplier (0.1-2.0) for different play styles
- **Extended Input Range**: Touch input works up to 2x trackpad radius for better usability
- **Visual Feedback**: Knob position clamped to trackpad bounds while input extends beyond
- **Debug Logging**: Real-time input value display for fine-tuning

### Enhanced Touch Controls (v2) ✅ **NEW**
- **Improved Responsiveness**: Reduced input lag with optimized event handling
- **Better Visual Feedback**: Enhanced knob positioning and trackpad boundaries
- **iOS Compatibility**: Fixed touch input issues on mobile Safari
- **Persistence**: Touch input continues even when finger leaves visual trackpad area
- **Configuration UI**: Accessible controls for deadzone, sensitivity, and smoothing adjustment

### Gamepad Support (v2) ✅ **NEW**
- **Controller Detection**: Automatic gamepad recognition and connection
- **Axis Mapping**: Left stick for movement, right stick for camera (when implemented)
- **Button Mapping**: A/B buttons for jump/action with Xbox/PlayStation controller support
- **Input Integration**: Seamless blending of keyboard, touch, and gamepad inputs
- **Debug Logging**: Gamepad state monitoring and button press feedback

### Input System Integration (v2) ✅ **NEW**
- **Weapon Switching**: Keyboard shortcuts (1/2/3) for changing weapon types
- **Action Button**: Unified action input for combat, interaction, and jumping
- **Multi-Input Support**: Simultaneous keyboard, touch, and gamepad input handling
- **Event Management**: Proper attachment/detachment to prevent input conflicts
- **Debug Systems**: Comprehensive logging for troubleshooting input issues

Files touched
- `client/src/game/input.ts` - Enhanced input management with gamepad and weapon switching
- `client/src/ui/TouchControls.tsx` - Advanced joystick with smoothing and extended range  
- `client/src/game/player.tsx` - Combat integration and multi-input coordination
- `client/src/game/playerCombat.ts` - New player combat system with ranged attacks
- `client/src/ui/GameCanvas.tsx` - UI integration and control rendering

**Status**: ✅ Completed (v2) - Complete mobile and desktop control system with advanced features


