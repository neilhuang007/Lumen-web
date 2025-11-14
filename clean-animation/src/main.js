/**
 * Main Entry Point for Floating Spheres Animation
 * Orchestrates all components and manages the animation loop
 */

import * as THREE from 'three';
import { CONFIG, getEffectiveConfig } from './config.js';
import { SceneManager } from './scene-manager.js';
import { SpherePhysics } from './sphere-physics.js';
import { SphereRenderer } from './sphere-renderer.js';
import { PaintEffect } from './paint-effect.js';
import { PostEffects } from './post-effects.js';

export class FloatingSpheresAnimation {
  constructor(container) {
    this.container = container;
    this.config = getEffectiveConfig();

    // Core components
    this.sceneManager = null;
    this.spherePhysics = null;
    this.sphereRenderer = null;
    this.paintEffect = null;
    this.postEffects = null;

    // Animation state
    this.isRunning = false;
    this.time = 0;
    this.deltaTime = 0;
    this.lastFrameTime = 0;

    // Input state
    this.mouse = { x: 0, y: 0, prevX: 0, prevY: 0 };
    this.scroll = { delta: 0, total: 0 };

    // Color state
    this.currentColorIndex = Math.floor(Math.random() * this.config.spheres.colorPalette.length);
  }

  /**
   * Initialize all animation components
   */
  async init() {
    console.log('Initializing Floating Spheres Animation...');

    // Initialize scene manager
    this.sceneManager = new SceneManager(this.container, this.config);
    await this.sceneManager.init();

    // Initialize physics engine
    this.spherePhysics = new SpherePhysics(this.config);
    this.spherePhysics.init(this.getTotalSphereCount());

    // Initialize sphere renderer
    this.sphereRenderer = new SphereRenderer(
      this.sceneManager.scene,
      this.sceneManager.camera,
      this.config
    );
    await this.sphereRenderer.init(this.spherePhysics.bodies);

    // Initialize paint effect
    this.paintEffect = new PaintEffect(this.config);
    this.paintEffect.init(this.sceneManager.renderer);

    // Initialize post-processing effects
    this.postEffects = new PostEffects(this.sceneManager.renderer, this.config);
    this.postEffects.init(this.sceneManager.scene, this.sceneManager.camera);

    console.log('Animation initialized successfully');
  }

  /**
   * Calculate total number of spheres based on config
   */
  getTotalSphereCount() {
    const counts = this.config.spheres.counts;
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  }

  /**
   * Start the animation loop
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.animate();

    console.log('Animation started');
  }

  /**
   * Stop the animation loop
   */
  stop() {
    this.isRunning = false;
    console.log('Animation stopped');
  }

  /**
   * Main animation loop
   */
  animate = () => {
    if (!this.isRunning) return;

    requestAnimationFrame(this.animate);

    // Calculate delta time
    const currentTime = performance.now();
    this.deltaTime = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1); // Cap at 100ms
    this.lastFrameTime = currentTime;
    this.time += this.deltaTime;

    // Update components
    this.update(this.deltaTime);

    // Render
    this.render();
  }

  /**
   * Update all animation components
   */
  update(deltaTime) {
    // Update paint effect
    if (this.paintEffect) {
      this.paintEffect.update(deltaTime, this.mouse, this.scroll);
      this.scroll.delta *= 0.9; // Decay scroll delta
    }

    // Update physics
    if (this.spherePhysics) {
      this.spherePhysics.update(deltaTime, this.mouse, this.sceneManager.camera);
    }

    // Update sphere renderer (sync visual spheres with physics bodies)
    if (this.sphereRenderer) {
      this.sphereRenderer.update(deltaTime, this.spherePhysics.bodies);
    }

    // Update scene manager (camera animations, etc.)
    if (this.sceneManager) {
      this.sceneManager.update(deltaTime, this.time);
    }

    // Store previous mouse position
    this.mouse.prevX = this.mouse.x;
    this.mouse.prevY = this.mouse.y;
  }

  /**
   * Render the scene
   */
  render() {
    if (!this.sceneManager || !this.postEffects) return;

    // Render the scene
    this.postEffects.render(
      this.sceneManager.scene,
      this.sceneManager.camera,
      this.paintEffect
    );
  }

  /**
   * Handle window resize
   */
  resize() {
    if (this.sceneManager) {
      this.sceneManager.resize();
    }
    if (this.postEffects) {
      this.postEffects.resize();
    }
    if (this.paintEffect) {
      this.paintEffect.resize(window.innerWidth, window.innerHeight);
    }
  }

  /**
   * Handle mouse move
   */
  onMouseMove(clientX, clientY) {
    // Convert to normalized device coordinates (-1 to +1)
    this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
  }

  /**
   * Handle scroll
   */
  onScroll(scrollDelta) {
    this.scroll.delta += scrollDelta;
    this.scroll.total += scrollDelta;
  }

  /**
   * Change the color scheme
   */
  changeColor() {
    // Cycle to next color in palette
    this.currentColorIndex = (this.currentColorIndex + 1) % this.config.spheres.colorPalette.length;
    const newColor = this.config.spheres.colorPalette[this.currentColorIndex];

    console.log('Changing color to:', newColor);

    // Apply impulse to all spheres for visual feedback
    if (this.spherePhysics) {
      this.spherePhysics.bodies.forEach(body => {
        body.applyImpulse();
      });
    }

    // Update sphere colors
    if (this.sphereRenderer) {
      this.sphereRenderer.updateColors(newColor);
    }
  }

  /**
   * Cleanup and dispose resources
   */
  dispose() {
    this.stop();

    if (this.postEffects) this.postEffects.dispose();
    if (this.paintEffect) this.paintEffect.dispose();
    if (this.sphereRenderer) this.sphereRenderer.dispose();
    if (this.sceneManager) this.sceneManager.dispose();

    console.log('Animation disposed');
  }
}

/**
 * Factory function to create and initialize the animation
 */
export async function createAnimation(container) {
  const animation = new FloatingSpheresAnimation(container);
  await animation.init();
  animation.start();
  return animation;
}
