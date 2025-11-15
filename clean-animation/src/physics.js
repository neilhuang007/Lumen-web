import * as THREE from 'three';

const GRAVITY_FACTOR = 40;

export class PhysicsBody {
  constructor(radius = 1.0, isFarBack = false, randomFn) {
    this.radius = radius * 1.05;
    this.position = new THREE.Vector3(
      (randomFn() - 0.5) * 12,
      (randomFn() - 0.5) * 12,
      isFarBack ? 7 + randomFn() : (randomFn() - 0.5) * 6
    );
    this.velocity = this.position.clone().multiplyScalar(-2);
    this.quaternion = new THREE.Quaternion();
    this.angularVelocity = new THREE.Vector3();

    this.density = 1.0;
    this.mass = this.radius * this.radius * this.radius * this.density;
    this.inertia = this.mass * this.radius * this.radius * 0.4;
    this.friction = 2.0;
    this.frictionTot = 0;
    this.restitution = 0.8;
  }

  updateGravity(dt) {
    const gravityForce = this.position.clone().negate().multiplyScalar(GRAVITY_FACTOR);
    const gravityAcc = gravityForce.multiplyScalar(1 / this.mass);
    gravityAcc.multiplyScalar(1 / (1 + this.frictionTot));

    this.velocity.addScaledVector(gravityAcc, dt);
    this.frictionTot *= 0.5;
  }

  update(dt) {
    this.position.addScaledVector(this.velocity, dt);
    this.velocity.multiplyScalar(Math.pow(0.2, dt));

    // Update rotation
    const angularSpeed = this.angularVelocity.length();
    if (angularSpeed > 0) {
      const axis = this.angularVelocity.clone().normalize();
      const deltaQ = new THREE.Quaternion().setFromAxisAngle(axis, angularSpeed * dt);
      this.quaternion.premultiply(deltaQ);
    }
  }
}

export function updatePhysics(physicsBodies, dt) {
  // Update gravity
  for (let i = 0; i < physicsBodies.length; i++) {
    physicsBodies[i].updateGravity(dt);
  }

  // Collision detection
  for (let i = 0; i < physicsBodies.length; i++) {
    const body1 = physicsBodies[i];

    for (let j = i + 1; j < physicsBodies.length; j++) {
      const body2 = physicsBodies[j];

      const delta = body1.position.clone().sub(body2.position);
      const dist = delta.length();
      const minDist = body1.radius + body2.radius;

      if (dist < minDist) {
        // Collision response
        const normal = delta.normalize();
        const overlap = minDist - dist;

        body1.position.addScaledVector(normal, overlap * 0.5);
        body2.position.addScaledVector(normal, -overlap * 0.5);

        // Velocity response
        const relVel = body1.velocity.clone().sub(body2.velocity);
        const velAlongNormal = relVel.dot(normal);

        if (velAlongNormal < 0) {
          const e = (body1.restitution + body2.restitution) * 0.5;
          const j = -(1 + e) * velAlongNormal / (1 / body1.mass + 1 / body2.mass);

          const impulse = normal.multiplyScalar(j);
          body1.velocity.addScaledVector(impulse, 1 / body1.mass);
          body2.velocity.addScaledVector(impulse, -1 / body2.mass);
        }

        // Friction
        const combinedFriction = Math.sqrt(body1.friction * body2.friction);
        body1.frictionTot += combinedFriction;
        body2.frictionTot += combinedFriction;
      }
    }
  }

  // Update positions
  for (let i = 0; i < physicsBodies.length; i++) {
    physicsBodies[i].update(dt);
  }
}
