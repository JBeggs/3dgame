import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getPhysics } from '../game/physics';
import { playerHealth } from '../game/health';
import { AIController, AIState } from './behaviors';
import { GridNav } from './pathfind';
import { getAudio } from '../game/audio';
import { getEnemyHealthManager, EnemyHealth } from '../game/enemyHealth';
import { getInput } from '../game/input';
import { getParticleManager } from '../effects/ParticleSystem';

// Bouncy slime enemy that jumps around and can split when damaged
export function Slime({ 
  grid, 
  cellSize, 
  position = [4, 0.4, 4] as [number, number, number],
  size = 'normal' as 'small' | 'normal' | 'large',
  healthMultiplier = 1,
  damageMultiplier = 1,
  speedMultiplier = 1,
  alertnessBonus = 0
}: { 
  grid: GridNav; 
  cellSize: number; 
  position?: [number, number, number];
  size?: 'small' | 'normal' | 'large';
  healthMultiplier?: number;
  damageMultiplier?: number;
  speedMultiplier?: number;
  alertnessBonus?: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const [aiController] = useState(() => new AIController(grid, cellSize, new THREE.Vector3(...position)));
  const [currentState, setCurrentState] = useState<AIState>('idle');
  const [alertLevel, setAlertLevel] = useState(0);
  const [enemyId] = useState(() => `slime-${size}-${Math.random().toString(36).substr(2, 9)}`);
  const [health, setHealth] = useState<EnemyHealth | null>(null);
  const [lastAttackTime, setLastAttackTime] = useState(0);
  const [bouncePhase, setBouncePhase] = useState(Math.random() * Math.PI * 2);
  const [lastBounceTime, setLastBounceTime] = useState(0);
  const [velocity, setVelocity] = useState(new THREE.Vector3());
  
  // Size-based properties
  const sizeMultipliers = {
    small: { scale: 0.6, health: 15, damage: 4, speed: 1.4, bounceHeight: 0.8 },
    normal: { scale: 1.0, health: 30, damage: 8, speed: 1.0, bounceHeight: 1.2 },
    large: { scale: 1.4, health: 50, damage: 12, speed: 0.7, bounceHeight: 1.6 }
  };
  
  const sizeProps = sizeMultipliers[size];
  const bounceInterval = 1500; // Bounce every 1.5 seconds
  const attackRange = 1.8;

  useEffect(() => {
    if (ref.current) {
      ref.current.position.set(...position);
    }
    
    // Initialize health with scaling
    const enemyHealthManager = getEnemyHealthManager();
    const scaledHealth = Math.floor(sizeProps.health * healthMultiplier);
    const initialHealth = enemyHealthManager.createEnemy(enemyId, scaledHealth);
    setHealth(initialHealth);
    
    return () => {
      // Cleanup on unmount
      enemyHealthManager.removeEnemy(enemyId);
    };
  }, [position, enemyId, size, healthMultiplier]);

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
      
      // Create death particle effect on first death frame
      if (currentHealth.deathTime && timeSinceDeath < 100) { // First 100ms after death
        const slimePos = ref.current.position;
        getParticleManager().createEffect(new THREE.Vector3(slimePos.x, slimePos.y + 0.2, slimePos.z), 'death');
      }
      
      const deathProgress = Math.min(timeSinceDeath / 1200, 1); // 1.2 second death animation
      
      // Death animation: flatten and spread out
      const scaleY = Math.max(0.1, 1 - deathProgress);
      const scaleXZ = 1 + deathProgress * 0.5;
      
      ref.current.scale.set(scaleXZ, scaleY, scaleXZ);
      
      return; // Skip normal AI behavior
    }

    const playerPos = getPhysics().playerBody.position;
    const playerVec = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z);
    const dist = ref.current.position.distanceTo(playerVec);
    
    // Player can damage slime with action key when close
    if (dist < 1.5 && getInput().state.action) {
      const now = Date.now();
      if (now - lastAttackTime > 500) { // 500ms cooldown
        const damage = size === 'large' ? 25 : size === 'normal' ? 20 : 15;
        const justDied = enemyHealthManager.damageEnemy(enemyId, damage);
        
        if (justDied) {
          getAudio().play('hit');
          // Chance to split into smaller slimes
          if (size === 'large' && Math.random() < 0.7) {
            // TODO: Spawn 2-3 normal slimes
          } else if (size === 'normal' && Math.random() < 0.5) {
            // TODO: Spawn 2 small slimes
          }
        } else {
          getAudio().play('hit', 0.5);
        }
        
        // Knockback effect
        const knockDirection = ref.current.position.clone().sub(playerVec).normalize();
        setVelocity(knockDirection.multiplyScalar(3));
        
        setLastAttackTime(now);
      }
    }
    
    // Update AI controller
    const moveVector = aiController.update(dt, playerVec);
    aiController.updatePosition(ref.current.position);
    
    const currentPos = ref.current.position;
    const distanceToPlayer = currentPos.distanceTo(playerVec);
    
    // Update visual state with alertness bonus
    const newState = aiController.getState();
    const baseAlert = aiController.getAlertLevel();
    const boostedAlert = Math.min(1, baseAlert + alertnessBonus);
    
    // Handle bouncing mechanics
    const now = Date.now();
    const timeSinceLastBounce = now - lastBounceTime;
    const shouldBounce = timeSinceLastBounce > bounceInterval || 
                        (newState === 'attack' && distanceToPlayer < attackRange);
    
    if (shouldBounce && Math.abs(velocity.y) < 0.1) {
      // Initiate bounce
      const bounceDirection = newState === 'attack' ? 
        playerVec.clone().sub(currentPos).normalize() : 
        moveVector.length() > 0 ? moveVector.normalize() : new THREE.Vector3(0, 0, 0);
      
      bounceDirection.y = 0;
      const horizontalSpeed = sizeProps.speed * speedMultiplier * 3;
      const verticalSpeed = sizeProps.bounceHeight * 4;
      
      setVelocity(new THREE.Vector3(
        bounceDirection.x * horizontalSpeed,
        verticalSpeed,
        bounceDirection.z * horizontalSpeed
      ));
      
      setLastBounceTime(now);
      getAudio().play('jump', 0.3); // Quiet bounce sound
    }
    
    // Apply physics-like movement
    const newVel = velocity.clone();
    newVel.y -= 12 * dt; // Gravity
    
    // Apply air resistance
    newVel.x *= 0.98;
    newVel.z *= 0.98;
    
    // Ground collision (simple)
    const groundY = position[1];
    if (currentPos.y <= groundY && newVel.y <= 0) {
      newVel.y = 0;
      ref.current.position.y = groundY;
    }
    
    // Apply movement
    ref.current.position.add(newVel.clone().multiplyScalar(dt));
    setVelocity(newVel);
    
    // Attack player when close
    if (newState === 'attack' && distanceToPlayer < attackRange) {
      const scaledDamage = sizeProps.damage * damageMultiplier * dt;
      playerHealth.damage(scaledDamage);
    }
    
    // Bouncing animation
    setBouncePhase(prev => prev + dt * 6);
    const bounceOffset = Math.abs(velocity.y) > 0.1 ? 0 : Math.sin(bouncePhase) * 0.05;
    const squashStretch = Math.abs(velocity.y) > 0.1 ? 
      { x: 0.9, y: 1.1, z: 0.9 } : // Stretch when jumping
      { x: 1 + bounceOffset * 0.2, y: 1 - bounceOffset * 0.1, z: 1 + bounceOffset * 0.2 }; // Idle bounce
    
    ref.current.scale.set(
      squashStretch.x * sizeProps.scale,
      squashStretch.y * sizeProps.scale,
      squashStretch.z * sizeProps.scale
    );
    
    // Update visual state
    if (newState !== currentState) {
      setCurrentState(newState);
    }
    if (Math.abs(boostedAlert - alertLevel) > 0.1) {
      setAlertLevel(boostedAlert);
    }
  });

  // Color based on size and state
  const getSlimeColor = () => {
    const colors = {
      small: new THREE.Color('#90EE90'), // Light green
      normal: new THREE.Color('#32CD32'), // Lime green
      large: new THREE.Color('#228B22')   // Forest green
    };
    
    const baseColor = colors[size];
    const alertColor = new THREE.Color('#FF6347'); // Tomato red when alert
    const hurtColor = new THREE.Color('#DAA520'); // Golden rod when hurt
    
    if (health?.hp && health.hp < health.maxHp * 0.3) {
      return hurtColor; // Hurt
    }
    
    return baseColor.lerp(alertColor, alertLevel * 0.3);
  };

  return (
    <group>
      {/* Slime body */}
      <mesh ref={ref} castShadow>
        <sphereGeometry args={[0.4, 12, 8]} />
        <meshStandardMaterial 
          color={getSlimeColor()} 
          roughness={0.3} 
          metalness={0.1}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Slime eyes */}
      <mesh position={[
        ref.current?.position.x - 0.15 || 0, 
        (ref.current?.position.y || 0) + 0.1, 
        ref.current?.position.z + 0.25 || 0
      ]}>
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh position={[
        ref.current?.position.x + 0.15 || 0, 
        (ref.current?.position.y || 0) + 0.1, 
        ref.current?.position.z + 0.25 || 0
      ]}>
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      
      {/* Simple health bar */}
      {health && health.hp < health.maxHp && (
        <group position={[0, 0.8, 0]}>
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[0.6, 0.06]} />
            <meshBasicMaterial color="#003300" transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.02]} scale={[(health.hp / health.maxHp), 1, 1]}>
            <planeGeometry args={[0.6, 0.04]} />
            <meshBasicMaterial color="#00cc00" />
          </mesh>
        </group>
      )}
    </group>
  );
}
