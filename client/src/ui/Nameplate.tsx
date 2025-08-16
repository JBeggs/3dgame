import React, { useRef } from 'react';
import { Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type NameplateProps = {
  playerId: number;
  position: [number, number, number];
  name?: string;
  color?: string;
  distance?: number;
};

export function Nameplate({ playerId, position, name, color, distance = 0 }: NameplateProps) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null!);
  const displayName = name || `Player ${playerId}`;
  const nameColor = color || idToColor(playerId);
  
  // Make nameplate always face the camera
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.lookAt(camera.position);
    }
  });
  
  // Calculate opacity based on distance (fade out when far)
  const opacity = Math.max(0.3, Math.min(1, 1 - (distance - 5) / 15));
  const scale = Math.max(0.5, Math.min(1, 1 - (distance - 5) / 20));
  
  return (
    <group ref={groupRef} position={[position[0], position[1] + 0.8, position[2]]} scale={scale}>
      {/* Background plate */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[displayName.length * 0.12 + 0.3, 0.4]} />
        <meshBasicMaterial 
          color="#000000" 
          transparent 
          opacity={opacity * 0.6}
          depthWrite={false}
        />
      </mesh>
      
      {/* Player name */}
      <Text
        position={[0, 0, 0]}
        fontSize={0.2}
        color={nameColor}
        anchorX="center"
        anchorY="middle"
        material-transparent
        material-opacity={opacity}
        material-depthWrite={false}
      >
        {displayName}
      </Text>
      
      {/* Distance indicator (only show if far) */}
      {distance > 8 && (
        <Text
          position={[0, -0.15, 0]}
          fontSize={0.12}
          color="#aaaaaa"
          anchorX="center"
          anchorY="middle"
          material-transparent
          material-opacity={opacity * 0.7}
          material-depthWrite={false}
        >
          {Math.round(distance)}m
        </Text>
      )}
      
      {/* Status indicator dot */}
      <mesh position={[displayName.length * 0.06 + 0.1, 0.1, 0]}>
        <circleGeometry args={[0.03, 8]} />
        <meshBasicMaterial 
          color={getStatusColor(playerId)} 
          transparent 
          opacity={opacity}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// Enhanced color generation with better distribution
export function idToColor(id: number): string {
  const colors = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
    '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43',
    '#10ac84', '#ee5a24', '#0984e3', '#6c5ce7', '#a29bfe',
    '#fd79a8', '#fdcb6e', '#e17055', '#74b9ff', '#81ecec'
  ];
  return colors[id % colors.length];
}

// Status color based on player activity/state
function getStatusColor(playerId: number): string {
  // For now, just use a simple online indicator
  // Could be enhanced to show different states (idle, moving, in combat, etc.)
  return '#00ff00'; // Green = online/active
}
