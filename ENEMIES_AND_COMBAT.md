# Enemies and Combat System

## Overview
Advanced enemy AI with sophisticated pathfinding, behavioral states, and combat mechanics.

## Features Implemented

### Enhanced AI System (v2)
- **Behavioral States**: Idle, Patrol, Chase, Attack, Flee, Search
- **Advanced Pathfinding**: Diagonal movement, path smoothing, line-of-sight
- **Smart Navigation**: Uses enhanced nav grid with choke points and safe zones
- **Alert System**: Dynamic awareness levels affecting behavior

### Spider Enemies

#### Basic Spider (v1)
- **Simple AI**: Direct seek behavior toward player
- **Contact Damage**: Deals damage when touching player
- **Basic Pathfinding**: Grid-based A* navigation

#### Smart Spider (v2)
- **State Machine**: Complex behavioral patterns
- **Patrol Routes**: Generates and follows patrol points
- **Line of Sight**: Detects player visibility through walls
- **Alert Levels**: Visual and behavioral changes based on awareness
- **Attack Cooldowns**: Prevents spam attacks
- **Search Behavior**: Investigates last known player position

### Navigation Grid System (v2)
- **Enhanced A* Algorithm**: 
  - Diagonal movement support
  - Better heuristics for pathfinding
  - Path smoothing to reduce waypoints
  - Line-of-sight optimization
- **Nav Grid Analysis**:
  - Room connectivity mapping
  - Choke point identification
  - Safe zone detection
  - Strategic position analysis
- **NavMesh Generation**: High-level pathfinding nodes and connections
- **Debug Visualization**: Press 'N' to toggle nav grid overlay

### Combat Mechanics
- **Damage System**: Contact-based damage with cooldowns
- **Visual Feedback**: Color changes and scaling based on AI state
- **Alert Indicators**: Yellow warning lights when enemies are alerted

## Technical Implementation

### AIController Class
```typescript
class AIController {
  - State management (idle, patrol, chase, attack, search)
  - Patrol point generation around spawn
  - Line-of-sight calculations
  - Dynamic pathfinding with caching
  - Alert level tracking
}
```

### Enhanced Pathfinding
- **Diagonal Movement**: 8-directional pathfinding with proper cost calculation
- **Path Smoothing**: Removes unnecessary waypoints using line-of-sight
- **Utility Functions**: 
  - `findNearestWalkable()`: Find closest valid position
  - `getWalkableNeighbors()`: Get adjacent walkable cells
  - `hasLineOfSight()`: Check visibility between points

### Navigation Grid Features
- **Room Analysis**: Automatic connection detection between rooms
- **Choke Points**: Narrow passages identified for tactical AI
- **Safe Zones**: Large open areas marked for retreat behaviors
- **Export System**: JSON export of nav data for external tools

### Debug Tools
- **Visual Overlay**: Press 'N' to show/hide nav grid debug
- **Choke Points**: Red cylindrical markers
- **Safe Zones**: Green spherical markers  
- **Room Connections**: Yellow lines between connected rooms

## Performance Optimizations
- **Path Caching**: Paths updated every 500ms instead of every frame
- **State Transitions**: Efficient state machine with clear conditions
- **Line-of-Sight**: Optimized Bresenham algorithm
- **Instanced Rendering**: Efficient rendering of multiple enemies

## Usage
```typescript
// Basic spider (legacy)
<Spider position={[x, y, z]} />

// Smart spider with AI
<SmartSpider 
  grid={navGrid} 
  cellSize={cellSize} 
  position={[x, y, z]} 
/>

// Debug navigation
Press 'N' in-game to toggle nav grid visualization
```

## How to Try
```bash
cd client && npm run dev
```
- Navigate to lair rooms (darker rooms with torches)
- Observe smart spiders with different behavioral states
- Press 'N' to toggle navigation debug overlay
- Watch spiders patrol, chase, and search for the player

### Group AI System (v3) ✅ **NEW**
- **Pack Hunting**: Coordinated group attacks with leader/flanker roles
- **Surrounding Tactics**: Strategic positioning around the player
- **Ambush Behaviors**: Setting up intercept positions when player is lost
- **Intelligence Sharing**: Groups share player location and tactical information
- **Dynamic Roles**: Leader, flanker, supporter, scout assignments
- **Formation Management**: Coordinated movement and positioning

### Enemy Health System (v3) ✅ **NEW**
- **Health Tracking**: Individual health pools for each enemy type
- **Damage System**: Progressive damage with visual feedback
- **Death Animations**: Scaling and rotation effects on enemy death
- **Health Bars**: Visual health indicators when enemies are damaged
- **Player Combat**: Action button melee attacks on enemies

### Difficulty Scaling (v3) ✅ **NEW**
- **Room Depth Calculation**: Progressive difficulty based on distance from start
- **Stat Multipliers**: Health, damage, speed, and alertness scaling
- **Enemy Spawn Scaling**: More enemies in deeper rooms
- **HUD Integration**: Visual difficulty indicator showing current room depth
- **Balanced Progression**: Carefully tuned multipliers for fair challenge

### Additional Enemies (v3) ✅ **NEW**
- **Archer**: Ranged bow-shooting humanoid with strategic positioning
- **Slime**: Bouncing acidic enemy with unique movement patterns
- **Enhanced Bat**: Flying enemy with improved AI and ranged attacks

### Sound & Particle Effects (v3) ✅ **NEW**
- **Audio System**: Web Audio API with iOS support for combat sounds
- **Hit Effects**: Audio feedback for attacks, deaths, and interactions
- **Particle System**: Death effects, impact particles, and visual feedback
- **Environmental Audio**: Jump sounds, projectile firing, and ambient effects

## Next Steps
- [x] Add ranged enemies with projectile systems ✅
- [x] Implement player combat abilities ✅
- [x] Add enemy health and death animations ✅  
- [x] Group AI behaviors (pack hunting) ✅
- [x] Sound effects and particle systems ✅
- [x] Difficulty scaling based on room depth ✅
- [ ] Server authority for combat validation
- [ ] Network synchronization for multiplayer combat
- [ ] Advanced group tactics (flanking, retreating)
- [ ] Boss enemies with unique mechanics

**Status**: ✅ Completed (v3) - Complete combat system with group AI, health, scaling, and effects