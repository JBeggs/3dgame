import React from 'react';
import { NavGrid } from '../gen/navGrid';

interface NavGridDebugProps {
  navGrid: NavGrid;
  cellSize: number;
  visible?: boolean;
}

export function NavGridDebug({ navGrid, cellSize, visible = false }: NavGridDebugProps) {
  if (!visible) return null;

  return (
    <group>
      {/* Choke points - red markers */}
      {navGrid.chokePoints.map((point, i) => (
        <mesh 
          key={`choke-${i}`} 
          position={[(point.x + 0.5) * cellSize, 0.8, (point.y + 0.5) * cellSize]}
        >
          <cylinderGeometry args={[0.1, 0.1, 0.3, 8]} />
          <meshStandardMaterial 
            color="#ff4444" 
            emissive="#ff0000" 
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}

      {/* Safe zones - green markers */}
      {navGrid.safeZones.map((point, i) => (
        <mesh 
          key={`safe-${i}`} 
          position={[(point.x + 0.5) * cellSize, 0.6, (point.y + 0.5) * cellSize]}
        >
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial 
            color="#44ff44" 
            emissive="#00ff00" 
            emissiveIntensity={0.2}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}

      {/* Room connections - lines between connected rooms */}
      {Array.from(navGrid.roomConnections.entries()).map(([roomId, connections]) => {
        const room = navGrid.rooms[roomId];
        if (!room) return null;
        
        return connections.map(connectedRoomId => {
          const connectedRoom = navGrid.rooms[connectedRoomId];
          if (!connectedRoom || connectedRoomId <= roomId) return null; // Avoid duplicate lines
          
          const start = [(room.cx + 0.5) * cellSize, 1.0, (room.cy + 0.5) * cellSize];
          const end = [(connectedRoom.cx + 0.5) * cellSize, 1.0, (connectedRoom.cy + 0.5) * cellSize];
          
          return (
            <ConnectionLine 
              key={`conn-${roomId}-${connectedRoomId}`}
              start={start as [number, number, number]}
              end={end as [number, number, number]}
            />
          );
        });
      })}
    </group>
  );
}

function ConnectionLine({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
  const points = React.useMemo(() => {
    return [start, end];
  }, [start, end]);

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flat())}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#ffff00" opacity={0.5} transparent />
    </line>
  );
}
