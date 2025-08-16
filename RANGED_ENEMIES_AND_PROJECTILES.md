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

## Next Steps
- [ ] Add more ranged enemy types (archers, mages)
- [ ] Implement player ranged attacks (bow, magic)
- [ ] Add projectile trails and particle effects
- [ ] Implement ricochet and explosive projectiles
- [ ] Add sound effects for shooting and impacts
- [ ] Network synchronization for multiplayer projectiles

**Status**: ✅ Completed (v1) - Flying ranged enemies with projectile combat system
