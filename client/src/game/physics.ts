import * as CANNON from 'cannon-es';

export type PhysicsAPI = {
  world: CANNON.World;
  playerBody: CANNON.Body;
  step: (dt: number) => void;
  addStaticBox: (x: number, y: number, z: number, sx: number, sy: number, sz: number) => CANNON.Body;
  addStaticBoxRotated: (x: number, y: number, z: number, sx: number, sy: number, sz: number, rotY: number) => CANNON.Body;
  clearStaticBodies: () => void;
  removeBody: (body: CANNON.Body) => void;
  isGrounded: () => boolean;
  correctPosition: (x: number, y: number, z: number) => void;
};

let singleton: PhysicsAPI | null = null;

export function getPhysics(): PhysicsAPI {
  if (singleton) return singleton;

  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;
  // Optimize contact material for stable ground contact
  world.defaultContactMaterial.friction = 0.3;
  world.defaultContactMaterial.restitution = 0.0;
  world.defaultContactMaterial.contactEquationStiffness = 1e8;
  world.defaultContactMaterial.contactEquationRelaxation = 3;

  // Ground plane
  const ground = new CANNON.Body({ mass: 0 });
  ground.addShape(new CANNON.Plane());
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(ground);

  // Player: simple sphere with natural physics
  const radius = 0.4;
  const playerBody = new CANNON.Body({ 
    mass: 1, 
    linearDamping: 0.1, // Let physics work naturally
    angularDamping: 0.1,
    type: CANNON.Body.DYNAMIC,
    material: new CANNON.Material({ friction: 0.3, restitution: 0.0 })
  });
  
  // Use sphere - most stable for ground contact
  const sphereShape = new CANNON.Sphere(radius);
  playerBody.addShape(sphereShape);
  
  // Don't set position here - let map generation place the player safely
  playerBody.position.set(0, 100, 0); // Start high above map until proper spawn is set
  world.addBody(playerBody);

  function step(dt: number) {
    // Use fixed timestep for maximum stability
    const fixedStep = 1 / 60; // Fixed 60fps timestep
    const maxSubsteps = 2; // Fewer substeps to reduce jitter
    
    world.step(fixedStep, dt, maxSubsteps);
    
    // Match server ground collision logic exactly
    if (playerBody.position.y <= 0.5) {
      playerBody.position.y = 0.5;
      playerBody.velocity.y = Math.max(0, playerBody.velocity.y);
    }
  }

  const staticBodies: CANNON.Body[] = [];
  function addStaticBox(x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    const body = new CANNON.Body({ mass: 0 });
    body.addShape(new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2)));
    body.position.set(x, y, z);
    world.addBody(body);
    staticBodies.push(body);
    return body;
  }
  function addStaticBoxRotated(x: number, y: number, z: number, sx: number, sy: number, sz: number, rotY: number) {
    const body = new CANNON.Body({ mass: 0 });
    body.addShape(new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2)));
    body.position.set(x, y, z);
    body.quaternion.setFromEuler(0, rotY, 0);
    world.addBody(body);
    staticBodies.push(body);
    return body;
  }
  function clearStaticBodies() {
    for (const b of staticBodies) {
      try { world.removeBody(b); } catch {}
    }
    staticBodies.length = 0;
  }
  function removeBody(body: CANNON.Body) {
    try { world.removeBody(body); } catch {}
  }

  function isGrounded(): boolean {
    // Ray check from sphere bottom
    const from = new CANNON.Vec3(playerBody.position.x, playerBody.position.y, playerBody.position.z);
    const to = new CANNON.Vec3(playerBody.position.x, playerBody.position.y - (radius + 0.1), playerBody.position.z);
    const result = new CANNON.RaycastResult();
    const hit = world.raycastClosest(from, to, { skipBackfaces: true }, result);
    if (!hit) return false;
    // Up-facing normal implies ground-like surface
    return result.hitNormalWorld.y > 0.5;
  }
  
  // No ground stabilization - let physics handle it naturally
  
  // Server position correction method
  function correctPosition(x: number, y: number, z: number) {
    // Apply server-authoritative position
    playerBody.position.set(x, y, z);
    
    // Reset velocity to prevent jarring movement
    playerBody.velocity.set(0, 0, 0);
    playerBody.angularVelocity.set(0, 0, 0);
  }

  singleton = { world, playerBody, step, addStaticBox, addStaticBoxRotated, clearStaticBodies, removeBody, isGrounded, correctPosition };
  
  // Listen for server position corrections (only set up once)
  if (typeof window !== 'undefined') {
    window.addEventListener('serverPositionCorrection', (event: any) => {
      const { x, y, z } = event.detail;
      correctPosition(x, y, z);
    });
  }
  
  return singleton;
}


