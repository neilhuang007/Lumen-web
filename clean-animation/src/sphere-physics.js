import * as THREE from 'three';
import { PHYSICS_CONSTANTS } from './config.js';
import { math } from './utils.js';

const { GRAVITY_FACTOR, MOUSE_RADIUS, MOUSE_INFLUENCE, MOUSE_PUSH_FORCE, VELOCITY_DAMPING, RANDOM_FN } = PHYSICS_CONSTANTS;

const random = RANDOM_FN;

class SphereBody {
  constructor(sphereConfig, isSemitransparent = false) {
    this.radius = 1.05 * sphereConfig.radius;
    this.density = sphereConfig.density;
    this.friction = sphereConfig.friction;
    this.restitution = sphereConfig.restitution;
    this.isSemitransparent = isSemitransparent;

    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.position0 = new THREE.Vector3();
    this.velocity0 = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();

    this.gravityForce = new THREE.Vector3();
    this.gravityAcc = new THREE.Vector3();

    this.angularVelocity = new THREE.Vector3();
    this.frictionTot = 0;

    const volume = Math.PI * this.radius * 1.333333;
    this.mass = volume * this.radius * this.radius * this.density;
    this.inertia = this.mass * this.radius * this.radius * 0.4;

    this.reset();
  }

  reset() {
    this.position0.set(
      (random() - 0.5) * 12,
      (random() - 0.5) * 12,
      this.isSemitransparent ? 7 + random() : (random() - 0.5) * 6
    );
    this.velocity0.copy(this.position0).multiplyScalar(-2);
    this.position.copy(this.position0);
    this.velocity.copy(this.velocity0);
    this.quaternion.identity();
    this.frictionTot = 0;
  }

  applyImpulse() {
    this.gravityForce.copy(this.position).negate().multiplyScalar(10);
    this.gravityAcc.copy(this.gravityForce);
    this.gravityForce.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(80);
    this.gravityAcc.add(this.gravityForce).multiplyScalar(1 / this.mass);
    this.velocity.negate();
    this.velocity.add(this.gravityAcc);
  }

  updateGravity(deltaTime) {
    this.gravityForce.copy(this.position).negate().multiplyScalar(GRAVITY_FACTOR);
    this.gravityAcc.copy(this.gravityForce).multiplyScalar(1 / this.mass);
    this.gravityAcc.multiplyScalar(1 / (1 + this.frictionTot));
    this.velocity.addScaledVector(this.gravityAcc, deltaTime);
    this.frictionTot *= 0.5;
  }

  integrate(deltaTime) {
    this.position.addScaledVector(this.velocity, deltaTime);
    this.velocity.multiplyScalar(Math.pow(VELOCITY_DAMPING, deltaTime));
  }
}

export class SpherePhysics {
  constructor(bodies = []) {
    this.bodies = bodies;
    this.isActive = true;

    this._mouse = new THREE.Vector3();
    this._mousePrev = new THREE.Vector3();
    this._mousePushForce = new THREE.Vector3();
    this._mouseBA = new THREE.Vector3();

    this._tempVec0 = new THREE.Vector3();
    this._tempVec1 = new THREE.Vector3();
    this._tempVec2 = new THREE.Vector3();
    this._tempVec3 = new THREE.Vector3();
    this._normal = new THREE.Vector3();
    this._tempQuat = new THREE.Quaternion();
  }

  static createBodies(sphereData) {
    return sphereData.map((config) => new SphereBody(config, config.isSemitransparent));
  }

  reset() {
    for (const body of this.bodies) {
      body.reset();
    }
  }

  update(deltaTime, camera, mouseNDC) {
    if (!this.isActive || this.bodies.length === 0) {
      return;
    }

    const mouseRay = this._tempVec0.set(mouseNDC.x, mouseNDC.y, 0.5).unproject(camera);
    mouseRay.sub(camera.position).normalize();
    const distance = -camera.position.z / mouseRay.z;
    this._mouse.copy(camera.position).addScaledVector(mouseRay, distance);

    this._mousePushForce.copy(this._mouse).sub(this._mousePrev).multiplyScalar(MOUSE_PUSH_FORCE / Math.max(deltaTime, 1e-4));
    this._mouseBA.copy(this._mouse).sub(camera.position);
    const mouseLenSq = Math.max(this._mouseBA.lengthSq(), 1e-6);

    this._mousePrev.copy(this._mouse);

    for (let i = 0; i < this.bodies.length; i += 1) {
      const body = this.bodies[i];
      body.updateGravity(deltaTime);

      this._tempVec1.copy(body.velocity);
      this._tempVec2.copy(body.position);

      for (let j = i + 1; j < this.bodies.length; j += 1) {
        const other = this.bodies[j];

        this._tempVec3.copy(other.position);
        this._tempVec0.copy(other.velocity);

        const normal = this._normal.copy(this._tempVec2).sub(this._tempVec3);
        const distanceBetween = normal.length();
        const minDistance = body.radius + other.radius;

        if (distanceBetween < minDistance) {
          const frictionMix = Math.sqrt(body.friction * other.friction);
          body.frictionTot += frictionMix;
          other.frictionTot += frictionMix;

          normal.normalize();
          const correction = 0.5 * (distanceBetween - minDistance);
          this._tempVec2.addScaledVector(normal, -correction);
          this._tempVec3.addScaledVector(normal, correction);
          normal.normalize();

          const velA = this._tempVec1.dot(normal);
          const velB = this._tempVec0.dot(normal);
          const massA = body.mass;
          const massB = other.mass;
          const restitutionA = body.restitution;
          const restitutionB = other.restitution;

          const newVelA = (massA * velA + massB * velB - massB * (velA - velB) * restitutionA) / (massA + massB);
          const newVelB = (massA * velA + massB * velB - massA * (velB - velA) * restitutionB) / (massA + massB);

          this._tempVec1.addScaledVector(normal, (newVelA - velA) / (1 + frictionMix));
          this._tempVec0.addScaledVector(normal, (newVelB - velB) / (1 + frictionMix));

          other.position.copy(this._tempVec3);
          other.velocity.copy(this._tempVec0);
        }
      }

      this._tempVec0.copy(this._tempVec2).sub(camera.position);
      let mouseProj = this._tempVec0.dot(this._mouseBA) / mouseLenSq;
      mouseProj = this._tempVec0.sub(this._tempVec3.copy(this._mouseBA).multiplyScalar(mouseProj)).length() - body.radius - MOUSE_RADIUS;

      if (mouseProj < 0) {
        this._tempVec0.copy(this._tempVec2).sub(camera.position).cross(this._mouseBA).normalize();
        this._tempVec3.copy(this._mouseBA).cross(this._tempVec0).normalize();
        this._tempVec2.addScaledVector(this._tempVec3, MOUSE_INFLUENCE * mouseProj);
        this._tempVec3.multiplyScalar(-MOUSE_PUSH_FORCE / Math.max(deltaTime, 1e-4));
        this._tempVec1.add(this._tempVec3);
        this._tempVec1.add(this._mousePushForce);
      }

      const len = this._tempVec2.length();
      if (len > 0) {
        this._tempVec0.set(1, 1, 1).normalize();
        let angle = 1 - Math.abs(this._tempVec0.dot(this._tempVec3.copy(this._tempVec2).normalize()));
        angle *= deltaTime * math.fit(len, 0, 2, 0, 1) * 0.5;
        angle *= (i % 2) * 2 - 1;
        this._tempQuat.setFromAxisAngle(this._tempVec0, angle);
        this._tempVec3.copy(this._tempVec2).applyQuaternion(this._tempQuat).sub(this._tempVec0.copy(this._tempVec2));
        this._tempVec1.add(this._tempVec3);
      }

      this._tempVec0.copy(this._tempVec1).cross(this._tempVec2);
      let angularLen = this._tempVec0.length();
      angularLen /= body.inertia;
      if (angularLen > 0) {
        this._tempVec0.normalize();
        this._tempQuat.setFromAxisAngle(this._tempVec0, angularLen * deltaTime);
        body.quaternion.premultiply(this._tempQuat);
      }

      body.position.copy(this._tempVec2);
      body.velocity.copy(this._tempVec1);
      body.integrate(deltaTime);
    }
  }
}
