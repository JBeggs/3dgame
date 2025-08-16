import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { getInput } from './input';
import { getPhysics } from './physics';
import { connect } from '../net/net';
import { AvatarRoot } from '../avatar/Avatar';
import { setPlayerPos } from './worldState';
import { useNet } from '../net/net';
import { getAudio } from './audio';
import { getPlayerCombat, updatePlayerCombat } from './playerCombat';

export function PlayerMesh() {
  // Move all logic directly into the component to fix Fast Refresh
  const input = useMemo(() => getInput(), []);
  const physics = useMemo(() => getPhysics(), []);

  useEffect(() => {
    console.log('🔗 Attaching input system...');
    input.attach();
    
    // Test if input system is working
    setTimeout(() => {
      console.log('🧪 Input test after 2s:', {
        right: input.state.right,
        forward: input.state.forward,
        jump: input.state.jump,
        action: input.state.action
      });
    }, 2000);
    
    return () => {
      console.log('🔌 Detaching input system...');
      input.detach();
    };
  }, [input]);

  const net = useMemo(() => connect(), []);
  const netState = useNet();
  const combat = useMemo(() => getPlayerCombat(), []);
  const [avatarRotation, setAvatarRotation] = useState(0);

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
    
    // DEBUG: Show what's happening with thresholds
    if (Math.abs(input.state.right) > 1e-10 || Math.abs(input.state.forward) > 1e-10) {
      console.log('🔧 Input drift detected:', {
        right: input.state.right,
        forward: input.state.forward,
        rightAbs: Math.abs(input.state.right),
        forwardAbs: Math.abs(input.state.forward),
        aboveThreshold: hasRealInput
      });
    }
    
    if (hasRealInput) {
      console.log('🎮 Real Movement:', {
        direction: `${input.state.right.toFixed(2)}, ${input.state.forward.toFixed(2)}`,
        jump: input.state.jump ? 'YES' : 'no',
        grounded: physics.isGrounded() ? 'YES' : 'no'
      });
    }
    
    // Accelerate toward desired horizontal velocity for smoother motion
    const targetVx = move.x * speed;
    const targetVz = move.z * speed;
    const accel = 20;
    playerBody.velocity.x += (targetVx - playerBody.velocity.x) * Math.min(1, accel * dt);
    playerBody.velocity.z += (targetVz - playerBody.velocity.z) * Math.min(1, accel * dt);
    // basic jump
    if (input.state.jump && physics.isGrounded()) {
      playerBody.velocity.y = 4.5;
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
    
    // Update combat system
    updatePlayerCombat();
    
    // Update avatar rotation based on movement
    const movementSpeed = Math.hypot(playerBody.velocity.x, playerBody.velocity.z);
    if (movementSpeed > 0.1) {
      // Calculate angle to face movement direction
      // Avatar's default front is positive Z, so we need to adjust the calculation
      const angle = Math.atan2(playerBody.velocity.x, playerBody.velocity.z);
      setAvatarRotation(angle);
      
      // Debug logging for rotation
      console.log('🧭 Movement:', {
        velocity: `x:${playerBody.velocity.x.toFixed(2)}, z:${playerBody.velocity.z.toFixed(2)}`,
        angle: `${(angle * 180 / Math.PI).toFixed(0)}°`,
        speed: movementSpeed.toFixed(2)
      });
    }
    
    physics.step(dt);
    // send network position and rotation (throttled inside net api)
    net.sendPosition(playerBody.position.x, playerBody.position.y, playerBody.position.z, avatarRotation);
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

  const ref = useRef<THREE.Mesh>(null!);
  const { camera } = useThree();

  useFrame(() => {
    const p = physics.playerBody.position;
    ref.current.position.set(p.x, p.y, p.z);
    setPlayerPos(p.x, p.z);
    // simple chase cam
    const camOffset = new THREE.Vector3(4, 3, 6);
    camera.position.lerp(new THREE.Vector3(p.x, p.y, p.z).add(camOffset), 0.1);
    camera.lookAt(p.x, p.y + 0.5, p.z);
  });

  return (
    <group ref={ref}>
      <AvatarRoot rotation={avatarRotation} />
    </group>
  );
}


