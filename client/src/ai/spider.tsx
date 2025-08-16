import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getPhysics } from '../game/physics';
import { playerHealth } from '../game/health';
import { AIController, AIState } from './behaviors';
import { GridNav } from './pathfind';
import { getEnemyHealthManager, EnemyHealth } from '../game/enemyHealth';
import { getInput } from '../game/input';
import { getAudio } from '../game/audio';

// Enhanced spider with AI behaviors
export function Spider({ position = [6, 0.3, 6] as [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((_, dt) => {
    const p = getPhysics().playerBody.position;
    const m = ref.current.position;
    const dir = new THREE.Vector3(p.x - m.x, 0, p.z - m.z);
    const dist = dir.length();
    if (dist > 0.01) {
      dir.normalize();
      const speed = 1.5;
      m.x += dir.x * speed * dt;
      m.z += dir.z * speed * dt;
    }
    if (dist < 0.8) {
      playerHealth.damage(5 * dt);
    }
  });

  return (
    <mesh ref={ref} position={position as any} castShadow>
      <sphereGeometry args={[0.25, 12, 12]} />
      <meshStandardMaterial color="#3c0" />
    </mesh>
  );
}

// Advanced spider with AI behaviors and pathfinding
export function SmartSpider({ 
  grid, 
  cellSize, 
  position = [6, 0.3, 6] as [number, number, number],
  healthMultiplier = 1,
  damageMultiplier = 1,
  speedMultiplier = 1,
  alertnessBonus = 0
}: { 
  grid: GridNav; 
  cellSize: number; 
  position?: [number, number, number];
  healthMultiplier?: number;
  damageMultiplier?: number;
  speedMultiplier?: number;
  alertnessBonus?: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const [aiController] = useState(() => new AIController(grid, cellSize, new THREE.Vector3(...position)));
  const [currentState, setCurrentState] = useState<AIState>('idle');
  const [alertLevel, setAlertLevel] = useState(0);
  const [enemyId] = useState(() => `spider-${Math.random().toString(36).substr(2, 9)}`);
  const [health, setHealth] = useState<EnemyHealth | null>(null);
  const [lastAttackTime, setLastAttackTime] = useState(0);

  useEffect(() => {
    if (ref.current) {
      ref.current.position.set(...position);
    }
    
    // Initialize health with scaling
    const enemyHealthManager = getEnemyHealthManager();
    const scaledHealth = Math.floor(30 * healthMultiplier);
    const initialHealth = enemyHealthManager.createEnemy(enemyId, scaledHealth);
    setHealth(initialHealth);
    
    return () => {
      // Cleanup on unmount
      enemyHealthManager.removeEnemy(enemyId);
    };
  }, [position, enemyId]);

  useFrame((_, dt) => {
    const enemyHealthManager = getEnemyHealthManager();
    const currentHealth = enemyHealthManager.getEnemy(enemyId);
    
    // Update health state
    if (currentHealth && currentHealth !== health) {
      setHealth(currentHealth);
    }
    
    // If dead, don't update AI, just handle death animation
    if (currentHealth?.isDead) {
      const timeSinceDeath = currentHealth.deathTime ? Date.now() - currentHealth.deathTime : 0;
      const deathProgress = Math.min(timeSinceDeath / 1500, 1); // 1.5 second death animation
      
      // Death animation: scale down and fade
      const scale = 1 - deathProgress;
      const rotation = deathProgress * Math.PI * 4; // Spin while dying
      
      ref.current.scale.setScalar(scale);
      ref.current.rotation.y = rotation;
      
      return; // Skip normal AI behavior
    }

    const playerPos = getPhysics().playerBody.position;
    const playerVec = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z);
    const dist = ref.current.position.distanceTo(playerVec);
    
    // Player can damage spider with action key when close
    if (dist < 1.5 && getInput().state.action) {
      const now = Date.now();
      if (now - lastAttackTime > 500) { // 500ms cooldown
        const justDied = enemyHealthManager.damageEnemy(enemyId, 15);
        if (justDied) {
          getAudio().play('hit');
        } else {
          getAudio().play('hit', 0.5); // Quieter hit sound for non-fatal hits
        }
        setLastAttackTime(now);
      }
    }
    
    // Update AI controller
    const moveVector = aiController.update(dt, playerVec);
    aiController.updatePosition(ref.current.position);
    
    // Apply movement with speed scaling
    if (moveVector.length() > 0) {
      const baseSpeed = currentState === 'chase' ? 2.5 : 1.5;
      const maxSpeed = baseSpeed * speedMultiplier;
      const actualMove = moveVector.clone().multiplyScalar(Math.min(dt * maxSpeed, moveVector.length()));
      ref.current.position.add(actualMove);
    }
    
    // Update visual state with alertness bonus
    const newState = aiController.getState();
    const baseAlert = aiController.getAlertLevel();
    const boostedAlert = Math.min(1, baseAlert + alertnessBonus);
    
    if (newState !== currentState) {
      setCurrentState(newState);
    }
    if (Math.abs(boostedAlert - alertLevel) > 0.1) {
      setAlertLevel(boostedAlert);
    }
    
    // Attack logic - spider damages player with scaling
    if (aiController.canAttack() && dist < 1.2) {
      const scaledDamage = 8 * damageMultiplier * dt;
      playerHealth.damage(scaledDamage);
    }
  });

  // Color based on state, alert level, and health
  const getSpiderColor = () => {
    const baseColor = new THREE.Color('#3c0');
    const alertColor = new THREE.Color('#c30');
    const hurtColor = new THREE.Color('#960');
    const dyingColor = new THREE.Color('#300');
    
    // If dead or dying, show death color
    if (health?.isDead) {
      return dyingColor;
    }
    
    // If hurt, mix in hurt color
    let color = baseColor;
    if (health && health.hp < health.maxHp) {
      const hurtRatio = 1 - (health.hp / health.maxHp);
      color = baseColor.clone().lerp(hurtColor, hurtRatio * 0.6);
    }
    
    // Apply alert state coloring
    switch (currentState) {
      case 'chase':
      case 'attack':
        return color.clone().lerp(alertColor, 0.7);
      case 'search':
        return color.clone().lerp(alertColor, 0.4);
      default:
        return color.clone().lerp(alertColor, alertLevel * 0.3);
    }
  };

  // Scale based on state
  const getScale = () => {
    const baseScale = 1;
    const alertScale = 1.2;
    
    if (currentState === 'attack') {
      return alertScale * 1.1;
    }
    
    return baseScale + (alertScale - baseScale) * alertLevel;
  };

  // Don't render if dead for too long
  if (health?.isDead && health.deathTime && (Date.now() - health.deathTime) > 3000) {
    return null;
  }

  return (
    <group>
      <mesh 
        ref={ref} 
        position={position as any} 
        scale={getScale()}
        castShadow
      >
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshStandardMaterial color={getSpiderColor()} />
      </mesh>
      
      {/* Alert indicator - don't show when dead */}
      {alertLevel > 0.3 && !health?.isDead && (
        <mesh position={[ref.current?.position.x || position[0], (ref.current?.position.y || position[1]) + 0.8, ref.current?.position.z || position[2]]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial 
            color="#ff0" 
            emissive="#ff0" 
            emissiveIntensity={alertLevel} 
          />
        </mesh>
      )}
      
      {/* Health bar when damaged but not dead */}
      {health && !health.isDead && health.hp < health.maxHp && (
        <group position={[ref.current?.position.x || position[0], (ref.current?.position.y || position[1]) + 0.6, ref.current?.position.z || position[2]]}>
          {/* Background bar */}
          <mesh>
            <planeGeometry args={[0.6, 0.08]} />
            <meshBasicMaterial color="#300" />
          </mesh>
          {/* Health bar */}
          <mesh position={[-(0.6 * (1 - health.hp / health.maxHp)) / 2, 0, 0.01]}>
            <planeGeometry args={[0.6 * (health.hp / health.maxHp), 0.06]} />
            <meshBasicMaterial color="#c30" />
          </mesh>
        </group>
      )}
    </group>
  );
}


