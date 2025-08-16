import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getPhysics } from '../game/physics';
import { AIController, AIState } from './behaviors';
import { GridNav } from './pathfind';
import { getProjectileManager } from '../game/projectiles';
import { getAudio } from '../game/audio';
import { getEnemyHealthManager, EnemyHealth } from '../game/enemyHealth';
import { getInput } from '../game/input';
import { getParticleManager } from '../effects/ParticleSystem';

// Ground-based archer that shoots arrows at the player
export function Archer({ 
  grid, 
  cellSize, 
  position = [8, 0.3, 8] as [number, number, number],
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
  const bowRef = useRef<THREE.Mesh>(null!);
  const [aiController] = useState(() => new AIController(grid, cellSize, new THREE.Vector3(...position)));
  const [currentState, setCurrentState] = useState<AIState>('idle');
  const [alertLevel, setAlertLevel] = useState(0);
  const [enemyId] = useState(() => `archer-${Math.random().toString(36).substr(2, 9)}`);
  const [health, setHealth] = useState<EnemyHealth | null>(null);
  const [lastAttackTime, setLastAttackTime] = useState(0);
  const [lastShotTime, setLastShotTime] = useState(0);
  const [aimDirection, setAimDirection] = useState(new THREE.Vector3());
  
  // Archer-specific properties
  const attackRange = 12.0; // Longer range than other enemies
  const shotCooldown = 2000; // 2 seconds between shots
  const aimTime = 800; // Time to aim before shooting

  useEffect(() => {
    if (ref.current) {
      ref.current.position.set(...position);
    }
    
    // Initialize health with scaling
    const enemyHealthManager = getEnemyHealthManager();
    const scaledHealth = Math.floor(25 * healthMultiplier); // Slightly less health than spiders
    const initialHealth = enemyHealthManager.createEnemy(enemyId, scaledHealth);
    setHealth(initialHealth);
    
    return () => {
      // Cleanup on unmount
      enemyHealthManager.removeEnemy(enemyId);
    };
  }, [position, enemyId, healthMultiplier]);

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
        const archerPos = ref.current.position;
        getParticleManager().createEffect(new THREE.Vector3(archerPos.x, archerPos.y + 0.2, archerPos.z), 'death');
      }
      
      const deathProgress = Math.min(timeSinceDeath / 1800, 1); // 1.8 second death animation
      
      // Death animation: fall backward and fade
      const fallAngle = deathProgress * Math.PI * 0.4; // Fall backward
      const scale = Math.max(0.2, 1 - deathProgress * 0.8);
      
      ref.current.rotation.z = -fallAngle;
      ref.current.scale.setScalar(scale);
      
      return; // Skip normal AI behavior
    }

    const playerPos = getPhysics().playerBody.position;
    const playerVec = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z);
    const dist = ref.current.position.distanceTo(playerVec);
    
    // Player can damage archer with action key when close
    if (dist < 1.5 && getInput().state.action) {
      const now = Date.now();
      if (now - lastAttackTime > 500) { // 500ms cooldown
        const justDied = enemyHealthManager.damageEnemy(enemyId, 20);
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
    
    const currentPos = ref.current.position;
    const distanceToPlayer = currentPos.distanceTo(playerVec);
    
    // Update visual state with alertness bonus
    const newState = aiController.getState();
    const baseAlert = aiController.getAlertLevel();
    const boostedAlert = Math.min(1, baseAlert + alertnessBonus);
    
    // Archer behavior: maintain distance and shoot
    switch (newState) {
      case 'idle':
      case 'patrol':
        // Slow patrol movement
        if (moveVector.length() > 0) {
          const baseSpeed = 1.2 * speedMultiplier;
          const actualMove = moveVector.clone().multiplyScalar(Math.min(dt * baseSpeed, moveVector.length()));
          ref.current.position.add(actualMove);
        }
        break;
        
      case 'search':
        // Search movement - more cautious
        if (moveVector.length() > 0) {
          const baseSpeed = 1.8 * speedMultiplier;
          const actualMove = moveVector.clone().multiplyScalar(Math.min(dt * baseSpeed, moveVector.length()));
          ref.current.position.add(actualMove);
        }
        break;
        
      case 'chase':
        // Keep optimal distance for shooting
        if (distanceToPlayer > attackRange) {
          // Get closer but slowly
          const direction = playerVec.clone().sub(currentPos).normalize();
          direction.y = 0;
          const moveSpeed = 2.0 * speedMultiplier;
          const movement = direction.multiplyScalar(dt * moveSpeed);
          ref.current.position.add(movement);
        } else if (distanceToPlayer < attackRange * 0.7) {
          // Back away to maintain distance
          const direction = currentPos.clone().sub(playerVec).normalize();
          direction.y = 0;
          const moveSpeed = 1.5 * speedMultiplier;
          const movement = direction.multiplyScalar(dt * moveSpeed);
          ref.current.position.add(movement);
        }
        break;
        
      case 'attack':
        // Stand still and aim/shoot
        const now = Date.now();
        if (distanceToPlayer <= attackRange && now - lastShotTime > shotCooldown) {
          // Calculate aim direction with prediction
          const playerBody = getPhysics().playerBody;
          const playerVelocity = new THREE.Vector3(
            playerBody.velocity.x,
            playerBody.velocity.y,
            playerBody.velocity.z
          );
          
          // Predict where player will be (arrows are slower than spit)
          const arrowSpeed = 12;
          const timeToHit = distanceToPlayer / arrowSpeed;
          const predictedPos = playerVec.clone().add(playerVelocity.multiplyScalar(timeToHit));
          
          const aimDir = predictedPos.clone().sub(currentPos).normalize();
          setAimDirection(aimDir);
          
          // Shoot after aiming
          if (now - lastShotTime > shotCooldown + aimTime) {
            const shootPos = currentPos.clone();
            shootPos.y += 0.5; // Shoot from chest level
            
            const scaledDamage = Math.floor(15 * damageMultiplier);
            getProjectileManager().createProjectile(
              shootPos,
              predictedPos,
              arrowSpeed,
              scaledDamage,
              'arrow', // Use arrow projectile type
              `archer-${ref.current.uuid}`
            );
            
            getAudio().play('fire', 0.7);
            setLastShotTime(now);
          }
        }
        break;
    }
    
    // Update visual state
    if (newState !== currentState) {
      setCurrentState(newState);
    }
    if (Math.abs(boostedAlert - alertLevel) > 0.1) {
      setAlertLevel(boostedAlert);
    }
  });

  // Color and appearance based on state
  const getArcherColor = () => {
    const baseColor = new THREE.Color('#8B4513'); // Brown leather
    const alertColor = new THREE.Color('#654321'); // Darker brown when alert
    const hurtColor = new THREE.Color('#A0522D'); // Sandy brown when hurt

    if (health?.hp && health.hp < health.maxHp * 0.3) {
      return hurtColor; // Hurt
    }
    
    return baseColor.lerp(alertColor, alertLevel);
  };

  return (
    <group>
      {/* Archer body */}
      <mesh ref={ref} castShadow>
        <capsuleGeometry args={[0.3, 0.8, 4, 8]} />
        <meshStandardMaterial 
          color={getArcherColor()} 
          roughness={0.8} 
          metalness={0.1}
        />
      </mesh>
      
      {/* Bow */}
      <mesh 
        ref={bowRef} 
        position={[ref.current?.position.x || 0, (ref.current?.position.y || 0) + 0.2, ref.current?.position.z || 0]}
        rotation={[0, aimDirection.length() > 0 ? Math.atan2(aimDirection.x, aimDirection.z) : 0, 0]}
      >
        <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      {/* Simple health bar */}
      {health && health.hp < health.maxHp && (
        <group position={[0, 1.2, 0]}>
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[0.8, 0.08]} />
            <meshBasicMaterial color="#330000" transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.02]} scale={[(health.hp / health.maxHp), 1, 1]}>
            <planeGeometry args={[0.8, 0.06]} />
            <meshBasicMaterial color="#cc0000" />
          </mesh>
        </group>
      )}
    </group>
  );
}
