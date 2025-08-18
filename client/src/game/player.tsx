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
  const [cameraMode, setCameraMode] = useState<'third' | 'first'>('third');
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const smoothYawRef = useRef(0); // use ref to avoid per-frame state re-render
  const smoothCameraYRef = useRef(0); // Smooth Y position for camera to prevent jump jitter
  const lookActiveRef = useRef(false);
  // Model forward offset (0 = face exactly the input heading)
  const AVATAR_FORWARD_OFFSET = 0;

  // Expose a simple camera API for UI/mobile controls
  useEffect(() => {
    const win: any = window as any;
    win.gameCamera = win.gameCamera || {};
    win.gameCamera.toggle = () => setCameraMode((m: 'third' | 'first') => (m === 'third' ? 'first' : 'third'));
    // Controls preferences
    win.gameControls = win.gameControls || { invertLookY: true };
    win.gameControls.toggleInvertLook = () => { win.gameControls.invertLookY = !win.gameControls.invertLookY; };
    return () => {
      try { if (win.gameCamera) delete win.gameCamera; } catch {}
    };
  }, []);

  // Toggle camera mode with V; simple mouse-look while held (left button) in first-person
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyV') setCameraMode((m) => (m === 'third' ? 'first' : 'third'));
    };
    const onMouseDown = (e: MouseEvent) => {
      if (cameraMode === 'first' && e.button === 0) lookActiveRef.current = true;
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) lookActiveRef.current = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (cameraMode === 'first' && lookActiveRef.current) {
        const win: any = window as any;
        const invertY = !!win?.gameControls?.invertLookY;
        setYaw((prev) => prev + e.movementX * 0.003);
        const dy = (invertY ? 1 : -1) * e.movementY * 0.003;
        setPitch((prev) => Math.max(-0.9, Math.min(0.9, prev + dy)));
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [cameraMode]);

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

    // Publish camera state for movement system
    (window as any).gameCameraMode = cameraMode;
    // Use smoothed yaw in first-person to match actual camera look direction
    (window as any).gameCameraYaw = cameraMode === 'first' ? (smoothYawRef.current || yaw) : yaw;
    
    // RESTORE THIRD-PERSON WORKING VECTORS
    (window as any).gameForwardVec = { x: 0, z: -1 }; // Back to working third-person
    (window as any).gameRightVec = { x: 1, z: 0 };

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
    
    // Update avatar rotation using camera-relative world vector
    const rIn = input.state.right;
    const fIn = input.state.forward;
    const hasInput = Math.abs(rIn) > 0.01 || Math.abs(fIn) > 0.01;

    if (hasInput) {
      const camYaw = (window as any).gameCameraYaw || 0;
      const camMode: 'first' | 'third' = (window as any).gameCameraMode === 'first' ? 'first' : 'third';
      const cosYaw = Math.cos(camYaw);
      const sinYaw = Math.sin(camYaw);
      // Match prediction mapping for each camera mode
      const worldX = camMode === 'first'
        ? (rIn * cosYaw + fIn * sinYaw)
        : (rIn * cosYaw - fIn * sinYaw);
      const worldZ = camMode === 'first'
        ? (fIn * cosYaw - rIn * sinYaw)
        : (-rIn * sinYaw - fIn * cosYaw);

      let desiredYaw = Math.atan2(worldX, worldZ);

      // Smooth rotation (shortest angular path)
      const delta = Math.atan2(Math.sin(desiredYaw - avatarRotation), Math.cos(desiredYaw - avatarRotation));
      const smoothingRate = 10;
      const smoothedYaw = avatarRotation + delta * Math.min(1, smoothingRate * dt);
      setAvatarRotation(smoothedYaw);
      (window as any).lastInputHeadingYaw = smoothedYaw;
    } else if ((window as any).lastInputHeadingYaw !== undefined) {
      setAvatarRotation((window as any).lastInputHeadingYaw);
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
      // Direct position update - no interpolation to prevent jitter
      ref.current.position.set(p.x, p.y + 0.6, p.z);
    }
    setPlayerPos(p.x, p.z);
    if (cameraMode === 'first') {
      const head = new THREE.Vector3(p.x, p.y + 1.5, p.z);
      camera.position.lerp(head, 0.25);
      
      // First-person camera - smoothly face movement direction for mobile (no per-frame state set)
      const currentHasInput = Math.abs(input.state.right) > 0.01 || Math.abs(input.state.forward) > 0.01;
      const targetYaw = currentHasInput ? avatarRotation : smoothYawRef.current;
      
      // Smooth camera rotation (shortest path)
      let deltaYaw = targetYaw - smoothYawRef.current;
      if (deltaYaw > Math.PI) deltaYaw -= 2 * Math.PI;
      if (deltaYaw < -Math.PI) deltaYaw += 2 * Math.PI;
      smoothYawRef.current = smoothYawRef.current + deltaYaw * 0.1;
      
      const dir = new THREE.Vector3(Math.sin(smoothYawRef.current), 0, Math.cos(smoothYawRef.current));
      const look = head.clone().add(dir.multiplyScalar(10));
      camera.lookAt(look);
    } else {
      // simple chase cam with reduced interpolation
      const camOffset = new THREE.Vector3(4, 3, 6);
      const targetPos = new THREE.Vector3(p.x, p.y, p.z).add(camOffset);
      camera.position.lerp(targetPos, 0.2); // Faster interpolation to reduce lag
      camera.lookAt(p.x, p.y + 0.5, p.z);
    }
  });

  return (
    <group ref={ref}>
      {/* Hide avatar in first-person mode to prevent blocking view */}
      {cameraMode !== 'first' && (
        useModularAvatar ? (
          <ModularAvatarRoot position={[0, 0, 0]} rotation={avatarRotation} />
        ) : (
          <AvatarRoot position={[0, 0, 0]} rotation={avatarRotation} />
        )
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


