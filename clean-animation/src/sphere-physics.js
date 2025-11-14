/**
 * Sphere Physics - Manages physics simulation for all spheres
 * Handles gravity, collisions, mouse interaction, and rotation
 */

import * as THREE from 'three';

export class SphereBody {
  constructor(config, index) {
    this.config = config;
    this.index = index;

    // Physical properties
    this.radius = config.spheres.baseRadius;
    this.mass = 1.0;
    this.density = 1.0;
    this.friction = 2.0;
    this.restitution = 0.8;
    this.frictionTotal = 0;

    // Kinematic state
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.position0 = new THREE.Vector3();
    this.velocity0 = new THREE.Vector3();

    // Rotation
    this.quaternion = new THREE.Quaternion();
    this.angularVelocity = new THREE.Vector3();

    // Gravity
    this.gravityForce = new THREE.Vector3();
    this.gravityAcceleration = new THREE.Vector3();

    this.initialize();
  }

  /**
   * Initialize position and velocity
   */
  initialize() {
    const spread = this.config.physics.initialConditions.positionSpread;
    const velFactor = this.config.physics.initialConditions.velocityFactor;

    // Random position within spread
    this.position0.set(
      (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * spread / 2 // Less spread in Z
    );

    // Initial velocity based on position
    this.velocity0.copy(this.position0).multiplyScalar(velFactor);

    this.reset();

    // Calculate mass and volume
    const volume = (4 / 3) * Math.PI * Math.pow(this.radius, 3);
    this.mass = volume * this.density;
  }

  /**
   * Reset to initial conditions
   */
  reset() {
    this.position.copy(this.position0);
    this.velocity.copy(this.velocity0);
    this.quaternion.identity();
    this.angularVelocity.set(0, 0, 0);
  }

  /**
   * Apply impulse force (for user interactions)
   */
  applyImpulse() {
    // Push away from center with random force
    this.gravityForce.copy(this.position).negate().multiplyScalar(10);
    this.gravityAcceleration.copy(this.gravityForce);

    // Add random component
    const randomForce = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).multiplyScalar(80);

    this.gravityAcceleration.add(randomForce).multiplyScalar(1 / this.mass);
    this.velocity.negate().add(this.gravityAcceleration);
  }

  /**
   * Update gravity acceleration
   */
  updateGravity(deltaTime) {
    const gravityFactor = this.config.physics.gravity.factor;

    // Force toward center
    this.gravityForce.copy(this.position).negate().multiplyScalar(gravityFactor);

    // F = ma, so a = F/m
    this.gravityAcceleration.copy(this.gravityForce).multiplyScalar(1 / this.mass);

    // Apply friction damping
    this.gravityAcceleration.multiplyScalar(1 / (1 + this.frictionTotal));

    // Update velocity
    this.velocity.addScaledVector(this.gravityAcceleration, deltaTime);

    // Decay friction accumulation
    this.frictionTotal *= 0.5;
  }

  /**
   * Update position and apply damping
   */
  update(deltaTime) {
    // Update position
    this.position.addScaledVector(this.velocity, deltaTime);

    // Apply velocity damping (air resistance)
    const damping = this.config.physics.damping.velocity;
    this.velocity.multiplyScalar(Math.pow(damping, deltaTime));
  }
}

export class SpherePhysics {
  constructor(config) {
    this.config = config;
    this.bodies = [];

    // Temp vectors to avoid allocations
    this._tempVec1 = new THREE.Vector3();
    this._tempVec2 = new THREE.Vector3();
    this._tempVec3 = new THREE.Vector3();
    this._mousePos3D = new THREE.Vector3();
    this._mousePrev3D = new THREE.Vector3();
  }

  /**
   * Initialize physics bodies
   */
  init(count) {
    console.log(`Initializing ${count} physics bodies...`);

    for (let i = 0; i < count; i++) {
      const body = new SphereBody(this.config, i);
      this.bodies.push(body);
    }
  }

  /**
   * Update all physics bodies
   */
  update(deltaTime, mouse, camera) {
    // Update mouse position in 3D world space
    this.updateMousePosition(mouse, camera);

    // Update each body
    for (let i = 0; i < this.bodies.length; i++) {
      const body = this.bodies[i];

      // Apply gravity
      if (this.config.physics.gravity.enabled) {
        body.updateGravity(deltaTime);
      }

      // Handle collisions with other bodies
      if (this.config.physics.collisions.enabled) {
        this.handleCollisions(body, i, deltaTime);
      }

      // Handle mouse interaction
      if (this.config.physics.mouse.enabled) {
        this.handleMouseInteraction(body, deltaTime);
      }

      // Update kinematics
      body.update(deltaTime);

      // Update rotation based on velocity
      this.updateRotation(body, deltaTime);
    }
  }

  /**
   * Convert mouse position to 3D world space
   */
  updateMousePosition(mouse, camera) {
    // Unproject mouse position to 3D space at z=0 plane
    this._tempVec1.set(mouse.x, mouse.y, 0.5);
    this._tempVec1.unproject(camera);

    // Ray from camera through mouse position
    this._tempVec1.sub(camera.position).normalize();

    // Find intersection with z=0 plane
    const t = -camera.position.z / this._tempVec1.z;
    this._tempVec1.multiplyScalar(t);
    this._mousePos3D.copy(camera.position).add(this._tempVec1);
  }

  /**
   * Handle collisions between bodies
   */
  handleCollisions(bodyA, indexA, deltaTime) {
    for (let j = indexA + 1; j < this.bodies.length; j++) {
      const bodyB = this.bodies[j];

      // Check for collision
      const normal = this._tempVec1.copy(bodyA.position).sub(bodyB.position);
      const distance = normal.length();
      const minDistance = bodyA.radius + bodyB.radius;

      if (distance < minDistance && distance > 0) {
        // Collision detected - separate spheres
        normal.normalize();
        const separation = (minDistance - distance) * 0.5;

        bodyA.position.addScaledVector(normal, separation);
        bodyB.position.addScaledVector(normal, -separation);

        // Add friction
        const friction = Math.sqrt(bodyA.friction * bodyB.friction);
        bodyA.frictionTotal += friction;
        bodyB.frictionTotal += friction;

        // Calculate collision response (elastic collision)
        const vDiff = this._tempVec2.copy(bodyA.velocity).sub(bodyB.velocity);
        const vRel = vDiff.dot(normal);

        if (vRel < 0) continue; // Bodies moving apart

        // Calculate impulse
        const restitution = Math.min(bodyA.restitution, bodyB.restitution);
        const massA = bodyA.mass;
        const massB = bodyB.mass;

        const impulse = -(1 + restitution) * vRel / (1 / massA + 1 / massB);

        // Apply impulse
        bodyA.velocity.addScaledVector(normal, impulse / massA / (1 + friction));
        bodyB.velocity.addScaledVector(normal, -impulse / massB / (1 + friction));
      }
    }
  }

  /**
   * Handle mouse interaction with body
   */
  handleMouseInteraction(body, deltaTime) {
    const mouseConfig = this.config.physics.mouse;

    // Vector from camera to body
    const toBody = this._tempVec1.copy(body.position);
    const toMouse = this._tempVec2.copy(this._mousePos3D);

    // Find closest point on line from camera to mouse
    const dot = toBody.dot(toMouse) / toMouse.lengthSq();
    const closest = this._tempVec3.copy(toMouse).multiplyScalar(dot);

    // Distance from body to mouse ray
    const dist = toBody.sub(closest).length();
    const minDist = body.radius + mouseConfig.influenceRadius;

    if (dist < minDist) {
      // Mouse is close enough - apply repulsion force
      const normal = this._tempVec1.normalize();
      const pushAmount = mouseConfig.pushForce * (1 - dist / minDist);

      body.position.addScaledVector(normal, pushAmount);
      body.velocity.addScaledVector(normal, -pushAmount / deltaTime);
    }
  }

  /**
   * Update body rotation based on velocity
   */
  updateRotation(body, deltaTime) {
    if (body.velocity.lengthSq() < 0.0001) return;

    // Cross product to get rotation axis
    const axis = this._tempVec1.set(1, 1, 1).normalize().cross(body.velocity);
    const angularSpeed = body.velocity.length();

    if (angularSpeed > 0.001) {
      axis.normalize();
      const angle = angularSpeed * deltaTime * 0.5; // Slow down rotation

      const rotation = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      body.quaternion.premultiply(rotation);
    }
  }

  /**
   * Reset all bodies
   */
  reset() {
    this.bodies.forEach(body => body.reset());
  }
}
