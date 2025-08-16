# Ranged Enemies and Projectile System

## Overview
Advanced projectile-based combat system with flying ranged enemies that shoot at the player.

## Features Implemented

### Projectile System (v1)
- **ProjectileManager**: Centralized system for managing all projectiles in the game
- **Multiple Projectile Types**: Arrow, Fireball, Spit, Magic with different visuals and properties
- **Physics Integration**: Collision detection with players, walls, and environment
- **Lifetime Management**: Automatic cleanup of expired or out-of-bounds projectiles
- **Visual Rendering**: Dynamic 3D projectile rendering with appropriate materials and effects

### Bat Enemy (v1)
- **Flying AI**: 3D movement with hovering, evasive maneuvers, and height maintenance
- **Ranged Combat**: Shoots projectiles at the player from a distance
- **Predictive Targeting**: Aims ahead of moving players for better hit accuracy
- **Wing Animation**: Realistic wing-flapping animation with dynamic scaling
- **State-Based Behavior**: Uses the advanced AI system for patrol, chase, attack, and search states

## Technical Implementation

### ProjectileManager Class
```typescript
class ProjectileManager {
  - createProjectile(): Creates new projectiles with physics properties
  - update(): Updates all projectile positions and lifetimes
  - checkCollisions(): Handles collision detection with targets
  - checkWallCollisions(): Prevents projectiles from passing through walls
  - getProjectileVisualData(): Returns rendering data for different projectile types
}
```

### Projectile Types
- **Arrow**: Brown cylindrical projectile, oriented in flight direction
- **Fireball**: Orange glowing sphere with emissive properties
- **Spit**: Green acidic projectile used by bats
- **Magic**: Purple mystical projectile with magical effects

### Bat AI Behavior
- **Idle/Patrol**: Gentle hovering with floating motion
- **Chase**: Approaches player while maintaining optimal shooting distance
- **Attack**: Hovers and shoots projectiles with predictive aiming
- **Search**: Flies around looking for the player after losing sight
- **Evasive Movement**: Uses sine wave patterns for unpredictable flight

### Combat Mechanics
- **Damage System**: Projectiles deal damage on contact with player
- **Cooldown System**: Prevents spam shooting with 2-second intervals
- **Range Management**: Bats maintain 8-unit attack range
- **Collision Detection**: Accurate sphere-to-sphere collision detection
- **Wall Blocking**: Projectiles are stopped by walls and obstacles

## Visual Features

### Projectile Rendering
- **Dynamic Materials**: Different colors, emissive properties, and scales
- **Orientation**: Arrows rotate to face their direction of travel
- **Transparency**: Some projectiles have transparent or glowing effects
- **Performance**: Efficient instanced rendering for multiple projectiles

### Bat Visuals
- **Wing Animation**: Realistic flapping with phase-based movement
- **State Colors**: Visual feedback showing AI state (gray → red when aggressive)
- **Alert Indicators**: Yellow warning lights when player is detected
- **Shooting Effects**: Green flash when firing projectiles
- **Scale Animation**: Dynamic sizing based on wing flap and alert level

## Gameplay Integration

### Enemy Placement
- **Treasure Rooms**: Bats spawn in treasure rooms as guardians
- **Flying Height**: Positioned at 2.5 units above ground for 3D combat
- **Strategic Positioning**: Use room centers for optimal patrol routes

### Player Interaction
- **Health System**: Projectiles deal 12 damage to player on hit
- **Evasion Gameplay**: Players must dodge projectiles while navigating
- **Range Combat**: Encourages different tactics than melee spider enemies
- **Vertical Threat**: Adds 3D combat dimension with flying enemies

## Performance Optimizations
- **Projectile Culling**: Automatic removal of expired or distant projectiles
- **Collision Optimization**: Efficient sphere-based collision detection
- **State Caching**: Minimal React re-renders with state management
- **Memory Management**: Proper cleanup of projectile instances

## Usage
```typescript
// Create a projectile
const projectileManager = getProjectileManager();
projectileManager.createProjectile(
  startPosition,
  targetPosition,
  speed,
  damage,
  'spit',
  ownerId
);

// Spawn a bat enemy
<Bat 
  grid={navGrid} 
  cellSize={cellSize} 
  position={[x, y, z]} 
/>

// Render projectiles
<ProjectileRenderer />
```

## How to Try
```bash
cd client && npm run dev
```
- Navigate to treasure rooms (rooms with single torches)
- Encounter flying bats that shoot green projectiles
- Dodge projectiles while collecting treasures
- Observe different AI behaviors and wing animations

### Advanced Projectile System (v2) ✅ **NEW**
- **Ricochet Projectiles**: Bounce off walls up to 3 times with energy loss
- **Explosive Projectiles**: Area damage with falloff and visual effects
- **Enhanced Wall Collision**: Proper physics reflection and explosion triggers
- **Visual Variety**: Metallic silver ricochet bullets, bright orange explosives
- **Audio Integration**: Distinct sounds for ricochet impacts and explosions
- **Particle Effects**: Sparks for ricochets, explosions for area damage

### Player Combat System (v2) ✅ **NEW**
- **Ranged Attacks**: Player can shoot projectiles using action button
- **Weapon Switching**: 3 weapon types (magic, ricochet, explosive)
- **Ammo System**: 20 rounds with auto-reload (2 second reload time)
- **Cooldown Management**: Balanced firing rates for different weapon types
- **Keyboard Shortcuts**: Press 1/2/3 keys to switch weapon types
- **Console API**: `window.gameApi.setWeapon()` for runtime testing

### Additional Enemy Types (v2) ✅ **NEW**
- **Archer Enemy**: Bow-shooting humanoid with strategic positioning
- **Enhanced Difficulty**: Enemy stats scale with room depth
- **Slime Integration**: Acidic projectiles from slime enemies
- **Improved AI**: All ranged enemies use group coordination

### Performance Optimizations (v2) ✅ **NEW**
- **Instanced Rendering**: All projectiles use InstancedMesh for performance
- **Efficient Collision**: Optimized collision detection with explosion support
- **Memory Management**: Proper cleanup of expired projectiles and effects
- **Particle Integration**: Seamless integration with particle system

## Combat Mechanics Enhancement
### Weapon Balance
- **Magic**: 25 damage, standard speed, reliable projectile
- **Ricochet**: 20 damage, faster speed, bounces off walls (3x)
- **Explosive**: 15 direct + 40 area damage, slower speed, large blast radius

### Visual & Audio Feedback
- **Projectile Trails**: Different colors and effects per weapon type
- **Impact Effects**: Sparks, explosions, and particle systems
- **Audio Cues**: Distinct sounds for firing, impacts, and explosions
- **UI Integration**: Ammo counter and reload indicators

## Next Steps
- [x] Add more ranged enemy types (archers, mages) ✅
- [x] Implement player ranged attacks (bow, magic) ✅
- [x] Add projectile trails and particle effects ✅
- [x] Implement ricochet and explosive projectiles ✅
- [x] Add sound effects for shooting and impacts ✅
- [ ] Network synchronization for multiplayer projectiles
- [ ] Projectile upgrade system and special abilities
- [ ] Homing projectiles and advanced targeting
- [ ] Destructible environment with projectile damage

**Status**: ✅ Completed (v2) - Complete projectile system with advanced mechanics, player combat, and effects
