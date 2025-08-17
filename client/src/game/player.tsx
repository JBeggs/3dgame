import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { getInput } from './input';
import { getPhysics } from './physics';
import { connect } from '../net/net';
import { AvatarRoot } from '../avatar/Avatar';
import { ModularAvatarRoot } from '../avatar/ModularAvatar';
import { setPlayerPos } from './worldState';
import { useNet } from '../net/net';
import { getAudio } from './audio';
import { getPlayerCombat, updatePlayerCombat } from './playerCombat';
import { getClientPrediction } from '../net/prediction';

export function PlayerMesh() {
  // Move all logic directly into the component to fix Fast Refresh
  const input = useMemo(() => getInput(), []);
  const physics = useMemo(() => getPhysics(), []);

  useEffect(() => {
    input.attach();
    
    // Input system is working properly now
    
    return () => {
      input.detach();
    };
  }, [input]);

  const net = useMemo(() => connect(), []);
  const netState = useNet();
  const combat = useMemo(() => getPlayerCombat(), []);
  const prediction = useMemo(() => getClientPrediction(), []);
  const [avatarRotation, setAvatarRotation] = useState(0);
  const [useModularAvatar, setUseModularAvatar] = useState(false); // TEMP: Use old system until we debug

  useFrame((_, dt) => {
    const { playerBody } = physics;
    // Apply threshold to actual movement to prevent tiny drift
    const rightInput = Math.abs(input.state.right) > 0.01 ? input.state.right : 0;
    const forwardInput = Math.abs(input.state.forward) > 0.01 ? input.state.forward : 0;
    const move = new THREE.Vector3(rightInput, 0, -forwardInput);
    const speed = 5.5;
    if (move.lengthSq() > 1) move.normalize();
    
    // Fix floating point precision issues - use proper threshold
    const threshold = 0.01; // Ignore tiny gamepad/touch drift
    const hasRealInput = Math.abs(input.state.right) > threshold || Math.abs(input.state.forward) > threshold || input.state.jump;
    
    // no console spam
    
    // CLIENT PREDICTION: Send input to prediction system instead of direct physics
    const inputCommand = prediction.sendInput(net);
    
    //
    
    // Audio feedback for jump (client-side for immediate response)
    if (input.state.jump && physics.isGrounded()) {
      getAudio().play('jump');
    }
    
    // Handle combat input
    if (input.state.action && combat.canAttack()) {
      // Aim towards camera forward direction (simple targeting)
      const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
      const targetPos = new THREE.Vector3(
        playerBody.position.x + cameraDirection.x * 10,
        playerBody.position.y + 0.5,
        playerBody.position.z + cameraDirection.z * 10
      );
      combat.performRangedAttack(targetPos);
    }
    
    // Handle grenade throwing
    if (input.state.grenade) {
      const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
      const grenadeTarget = new THREE.Vector3(
        playerBody.position.x + cameraDirection.x * 8,
        playerBody.position.y + 0.5,
        playerBody.position.z + cameraDirection.z * 8
      );
      combat.throwGrenade(grenadeTarget);
    }
    
    // Handle blocking
    if (input.state.block && !combat.isBlocking()) {
      combat.startBlocking();
    } else if (!input.state.block && combat.isBlocking()) {
      combat.stopBlocking();
    }
    
    // Update combat system
    updatePlayerCombat();
    
    // Update avatar rotation based on movement
    const movementSpeed = Math.hypot(playerBody.velocity.x, playerBody.velocity.z);
    if (movementSpeed > 0.1) {
      // Calculate angle to face movement direction
      // Avatar's default front is positive Z, so we need to adjust the calculation
      const angle = Math.atan2(playerBody.velocity.x, playerBody.velocity.z);
      setAvatarRotation(angle);
      
      //
    }
    
    //
    
    // NOTE: physics.step() and net.sendPosition() are handled by prediction system
    // simple reconciliation: if server pos diverges a lot, snap toward it
    // TEMPORARILY DISABLED - causing respawn loop issue
    /*
    const sp = netState.selfPos;
    if (sp) {
      const dx = sp.x - playerBody.position.x;
      const dy = sp.y - playerBody.position.y;
      const dz = sp.z - playerBody.position.z;
      const err = Math.hypot(dx, dz);
      if (err > 2.0) {
        playerBody.position.x += dx * 0.5;
        playerBody.position.z += dz * 0.5;
      }
    }
    */
  });

  const ref = useRef<THREE.Group>(null!);
  const { camera } = useThree();

  useFrame(() => {
    const p = physics.playerBody.position;
    if (ref.current) {
      // Add Y offset to lift avatar so feet touch ground, and smooth the movement to prevent jumping
      ref.current.position.lerp(new THREE.Vector3(p.x, p.y + 0.6, p.z), 0.1);
    }
    setPlayerPos(p.x, p.z);
    // simple chase cam
    const camOffset = new THREE.Vector3(4, 3, 6);
    camera.position.lerp(new THREE.Vector3(p.x, p.y, p.z).add(camOffset), 0.1);
    camera.lookAt(p.x, p.y + 0.5, p.z);
  });

  return (
    <group ref={ref}>
      {useModularAvatar ? (
        <ModularAvatarRoot position={[0, 0, 0]} rotation={avatarRotation} />
      ) : (
        <AvatarRoot position={[0, 0, 0]} rotation={avatarRotation} />
      )}
      
      {/* Pan blocking shield indicator */}
      {combat.isBlocking() && (
        <group position={[0, 0.8, 0.4]} rotation={[0, avatarRotation, 0]}>
          {/* Shield/Pan visual */}
          <mesh castShadow>
            <cylinderGeometry args={[0.3, 0.25, 0.05, 12]} />
            <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Shield rim */}
          <mesh position={[0, 0, 0.025]} castShadow>
            <torusGeometry args={[0.3, 0.02, 8, 16]} />
            <meshStandardMaterial color="#B8860B" />
          </mesh>
          {/* Blocking effect */}
          <mesh position={[0, 0, 0.03]}>
            <circleGeometry args={[0.35, 16]} />
            <meshStandardMaterial color="#87CEEB" opacity={0.3} transparent />
          </mesh>
        </group>
      )}
    </group>
  );
}


