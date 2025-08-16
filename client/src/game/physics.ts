import * as CANNON from 'cannon-es';

export type PhysicsAPI = {
  world: CANNON.World;
  playerBody: CANNON.Body;
  step: (dt: number) => void;
  addStaticBox: (x: number, y: number, z: number, sx: number, sy: number, sz: number) => CANNON.Body;
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
  // Make movement less sticky
  world.defaultContactMaterial.friction = 0.1;
  world.defaultContactMaterial.restitution = 0.0;

  // Ground plane
  const ground = new CANNON.Body({ mass: 0 });
  ground.addShape(new CANNON.Plane());
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(ground);

  // Player: simple sphere controller
  const radius = 0.4;
  const playerBody = new CANNON.Body({ mass: 1, linearDamping: 0.2, angularDamping: 1 });
  playerBody.addShape(new CANNON.Sphere(radius));
  playerBody.position.set(0, radius + 0.01, 0);
  world.addBody(playerBody);

  function step(dt: number) {
    world.step(1 / 60, dt, 3);
  }

  function addStaticBox(x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    const body = new CANNON.Body({ mass: 0 });
    body.addShape(new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2)));
    body.position.set(x, y, z);
    world.addBody(body);
    return body;
  }
  function removeBody(body: CANNON.Body) {
    try { world.removeBody(body); } catch {}
  }

  function isGrounded(): boolean {
    // Simple downward ray check under player
    const from = new CANNON.Vec3(playerBody.position.x, playerBody.position.y, playerBody.position.z);
    const to = new CANNON.Vec3(playerBody.position.x, playerBody.position.y - 0.7, playerBody.position.z);
    const result = new CANNON.RaycastResult();
    const hit = world.raycastClosest(from, to, { skipBackfaces: true }, result);
    if (!hit) return false;
    // Up-facing normal implies ground-like surface
    return result.hitNormalWorld.y > 0.5;
  }
  
  // Server position correction method
  function correctPosition(x: number, y: number, z: number) {
    console.log(`🔧 Correcting position: ${playerBody.position.x.toFixed(1)}, ${playerBody.position.y.toFixed(1)}, ${playerBody.position.z.toFixed(1)} -> ${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`);
    
    // Apply server-authoritative position
    playerBody.position.set(x, y, z);
    
    // Reset velocity to prevent jarring movement
    playerBody.velocity.set(0, 0, 0);
    playerBody.angularVelocity.set(0, 0, 0);
    
    console.log('✅ Position corrected by server authority');
  }

  singleton = { world, playerBody, step, addStaticBox, removeBody, isGrounded, correctPosition };
  
  // Listen for server position corrections (only set up once)
  if (typeof window !== 'undefined') {
    window.addEventListener('serverPositionCorrection', (event: any) => {
      const { x, y, z, reason } = event.detail;
      console.log(`🚨 Server position correction: ${reason}`);
      correctPosition(x, y, z);
    });
  }
  
  return singleton;
}


