import * as CANNON from 'cannon-es';

export type PhysicsAPI = {
  world: CANNON.World;
  playerBody: CANNON.Body;
  step: (dt: number) => void;
};

export function createPhysics(): PhysicsAPI {
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

  return { world, playerBody, step };
}


