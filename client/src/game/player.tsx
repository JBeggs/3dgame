import React, { useEffect, useMemo, useRef } from 'react';
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
    return () => {
      console.log('🔌 Detaching input system...');
      input.detach();
    };
  }, [input]);

  const net = useMemo(() => connect(), []);
  const netState = useNet();
  const combat = useMemo(() => getPlayerCombat(), []);
  const avatarRotationRef = useRef(0);

  useFrame((_, dt) => {
    const { playerBody } = physics;
    const move = new THREE.Vector3(input.state.right, 0, -input.state.forward);
    const speed = 5.5;
    if (move.lengthSq() > 1) move.normalize();
    
    // Light debug logging - only log when input changes
    const hasInput = input.state.right !== 0 || input.state.forward !== 0 || input.state.jump;
    if (hasInput) {
      console.log('🎮 Movement:', {
        direction: `${input.state.right.toFixed(1)}, ${input.state.forward.toFixed(1)}`,
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
      avatarRotationRef.current = Math.atan2(playerBody.velocity.x, playerBody.velocity.z);
    }
    
    physics.step(dt);
    // send network position and rotation (throttled inside net api)
    net.sendPosition(playerBody.position.x, playerBody.position.y, playerBody.position.z, avatarRotationRef.current);
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
      <AvatarRoot rotation={avatarRotationRef.current} />
    </group>
  );
}


