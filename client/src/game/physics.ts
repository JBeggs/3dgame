import * as CANNON from 'cannon-es';

export type PhysicsAPI = {
  world: CANNON.World;
  playerBody: CANNON.Body;
  step: (dt: number) => void;
  addStaticBox: (x: number, y: number, z: number, sx: number, sy: number, sz: number) => CANNON.Body;
  removeBody: (body: CANNON.Body) => void;
};

let singleton: PhysicsAPI | null = null;

export function getPhysics(): PhysicsAPI {
  if (singleton) return singleton;

  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;

  // Ground plane
  const ground = new CANNON.Body({ mass: 0 });
  ground.addShape(new CANNON.Plane());
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(ground);

  // Player: simple sphere controller
  const radius = 0.4;
  const playerBody = new CANNON.Body({ mass: 1, linearDamping: 0.9, angularDamping: 1 });
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

  singleton = { world, playerBody, step, addStaticBox, removeBody };
  return singleton;
}


