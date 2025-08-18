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
  // Third-person camera controls
  const thirdOrbitYawRef = useRef(0);
  const thirdDistanceRef = useRef(22);
  const isOrbitingRef = useRef(false);
  const pinchStateRef = useRef<{ active: boolean; d0: number } | null>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
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

  // Third-person camera input: orbit and zoom (wheel + pinch)
  useEffect(() => {
    function onWheel(e: WheelEvent) {
      if (cameraMode !== 'third') return;
      const delta = Math.sign(e.deltaY) * 0.6;
      thirdDistanceRef.current = Math.max(6, Math.min(40, thirdDistanceRef.current + delta));
    }
    function onMouseDown(e: MouseEvent) {
      if (cameraMode !== 'third') return;
      if (e.button === 0 || e.button === 2) {
        isOrbitingRef.current = true;
      }
    }
    function onMouseUp(e: MouseEvent) {
      if (e.button === 0 || e.button === 2) {
        isOrbitingRef.current = false;
      }
    }
    function onMouseMove(e: MouseEvent) {
      if (cameraMode !== 'third') return;
      if (isOrbitingRef.current) {
        thirdOrbitYawRef.current += e.movementX * 0.003;
      }
    }
    function touchDistance(t0: Touch, t1: Touch) {
      const dx = t0.clientX - t1.clientX;
      const dy = t0.clientY - t1.clientY;
      return Math.hypot(dx, dy);
    }
    function onTouchStart(e: TouchEvent) {
      if (cameraMode !== 'third') return;
      if (e.touches.length === 2) {
        pinchStateRef.current = { active: true, d0: touchDistance(e.touches[0], e.touches[1]) };
        lastTouchRef.current = null;
      } else if (e.touches.length === 1) {
        lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (cameraMode !== 'third') return;
      const s = pinchStateRef.current;
      if (s && s.active && e.touches.length === 2) {
        const d = touchDistance(e.touches[0], e.touches[1]);
        const scale = s.d0 > 0 ? d / s.d0 : 1;
        const target = thirdDistanceRef.current / Math.max(0.7, Math.min(1.3, scale));
        thirdDistanceRef.current = Math.max(6, Math.min(40, target));
        s.d0 = d;
      } else if (!s && e.touches.length === 1 && lastTouchRef.current) {
        const tx = e.touches[0].clientX;
        const ty = e.touches[0].clientY;
        const dx = tx - lastTouchRef.current.x;
        // Horizontal drag to orbit yaw; ignore vertical for now
        thirdOrbitYawRef.current += dx * 0.003;
        lastTouchRef.current = { x: tx, y: ty };
      }
    }
    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) pinchStateRef.current = null;
      if (e.touches.length === 0) lastTouchRef.current = null;
    }
    window.addEventListener('wheel', onWheel, { passive: true } as any);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchstart', onTouchStart, { passive: true } as any);
    window.addEventListener('touchmove', onTouchMove, { passive: true } as any);
    window.addEventListener('touchend', onTouchEnd, { passive: true } as any);
    return () => {
      window.removeEventListener('wheel', onWheel as any);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchstart', onTouchStart as any);
      window.removeEventListener('touchmove', onTouchMove as any);
      window.removeEventListener('touchend', onTouchEnd as any);
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

    // Publish camera and facing state for movement system
    (window as any).gameCameraMode = cameraMode;
    // Use smoothed yaw in first-person to match actual camera look direction for rendering
    (window as any).gameCameraYaw = cameraMode === 'first' ? (smoothYawRef.current || yaw) : yaw;
    // Publish avatar facing yaw so first-person movement can follow body orientation
    (window as any).gameFacingYaw = avatarRotation;
    
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

    const camYaw = (window as any).gameCameraYaw || 0;
    const camMode: 'first' | 'third' = (window as any).gameCameraMode === 'first' ? 'first' : 'third';

    if (camMode === 'first') {
      // First-person steering: use left/right to gently turn body, no sudden spins
      const turnRate = 2.0; // rad/s max
      // Invert lateral so pressing left (A/left stick) turns left intuitively
      const steerInput = -rIn; // [-1,1]
      const deltaYaw = Math.max(-turnRate * dt, Math.min(turnRate * dt, steerInput * turnRate * dt));
      const newYaw = avatarRotation + deltaYaw;
      setAvatarRotation(newYaw);
      (window as any).lastInputHeadingYaw = newYaw;
    } else if (hasInput) {
      // Third-person: face movement direction but clamp turn rate to avoid drastic spins
      const c = Math.cos(camYaw);
      const s = Math.sin(camYaw);
      // Invert mapping to match updated third-person movement
      const worldX = -(rIn * c - fIn * s);
      const worldZ = -(-rIn * s - fIn * c);
      const desiredYaw = Math.atan2(worldX, worldZ);

      // Smooth rotation with max angular velocity
      const delta = Math.atan2(Math.sin(desiredYaw - avatarRotation), Math.cos(desiredYaw - avatarRotation));
      const maxTurnRate = 2.0; // rad/s
      const step = Math.max(-maxTurnRate * dt, Math.min(maxTurnRate * dt, delta));
      const smoothedYaw = avatarRotation + step;
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
      // Third-person orbit camera with zoomable distance
      const dist = thirdDistanceRef.current;
      const elev = Math.max(0.4, Math.min(0.9, 0.6)); // slightly higher
      const yaw = thirdOrbitYawRef.current;
      const offsetX = Math.sin(yaw) * dist;
      const offsetZ = Math.cos(yaw) * dist;
      const offsetY = dist * 0.4 + 2.0 * elev;
      const targetPos = new THREE.Vector3(p.x - offsetX, p.y + offsetY, p.z - offsetZ);
      camera.position.lerp(targetPos, 0.2);
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


