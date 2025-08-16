import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { getInput } from './input';
import { getPhysics } from './physics';
import { connect } from '../net/net';
import { AvatarRoot } from '../avatar/Avatar';
import { setPlayerPos } from './worldState';
import { useNet } from '../net/net';

export function usePlayerController() {
  const input = useMemo(() => getInput(), []);
  const physics = useMemo(() => getPhysics(), []);
  const cameraTarget = useRef(new THREE.Vector3());

  useEffect(() => {
    input.attach();
    return () => input.detach();
  }, [input]);

  const net = useMemo(() => connect(), []);
  const netState = useNet();

  useFrame((_, dt) => {
    const { playerBody } = physics;
    const move = new THREE.Vector3(input.state.right, 0, -input.state.forward);
    const speed = 5.5;
    if (move.lengthSq() > 1) move.normalize();
    // Accelerate toward desired horizontal velocity for smoother motion
    const targetVx = move.x * speed;
    const targetVz = move.z * speed;
    const accel = 20;
    playerBody.velocity.x += (targetVx - playerBody.velocity.x) * Math.min(1, accel * dt);
    playerBody.velocity.z += (targetVz - playerBody.velocity.z) * Math.min(1, accel * dt);
    // basic jump
    if (input.state.jump && physics.isGrounded()) {
      playerBody.velocity.y = 4.5;
    }
    physics.step(dt);
    // send network position (throttled inside net api)
    net.sendPosition(playerBody.position.x, playerBody.position.y, playerBody.position.z);
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

  return { input, physics, cameraTarget } as const;
}

export function PlayerMesh() {
  const { physics } = usePlayerController();
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
      <AvatarRoot 
        speed={physics.playerBody.velocity.length()} 
        isGrounded={physics.isGrounded()}
        verticalVelocity={physics.playerBody.velocity.y}
      />
    </group>
  );
}


