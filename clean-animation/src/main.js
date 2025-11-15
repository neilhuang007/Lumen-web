import * as THREE from 'three';
import { SceneManager } from './scene-manager.js';
import { SpherePhysics } from './sphere-physics.js';
import { SphereRenderer } from './sphere-renderer.js';
import { screenPaint } from './paint-effect.js';
import { blueNoise } from './blue-noise.js';
import { BackgroundLayer } from './background.js';
import { SPHERES_DATA } from './config.js';

class SphereClusterApp {
  constructor(container) {
    this.container = container;
    this.sceneManager = new SceneManager(container);
    this.physics = null;
    this.renderer = null;
    this.sphereRenderer = null;
    this.background = null;
    this.mouse = new THREE.Vector2();
    this.lastTime = performance.now();
    this.running = false;
  }

  async init() {
    await this.sceneManager.init();
    await blueNoise.init();
    screenPaint.init(this.sceneManager.renderer);
    screenPaint.resize(this.sceneManager.width, this.sceneManager.height);

    this.background = new BackgroundLayer(this.sceneManager.scene, screenPaint, blueNoise);
    this.background.init();

    const bodies = SpherePhysics.createBodies(SPHERES_DATA);
    this.physics = new SpherePhysics(bodies);

    this.sphereRenderer = new SphereRenderer(this.sceneManager.scene, blueNoise);
    await this.sphereRenderer.init(bodies);

    this.renderer = this.sceneManager.renderer;
    this.addEventListeners();
  }

  addEventListeners() {
    window.addEventListener('resize', () => {
      this.sceneManager.resize();
      screenPaint.resize(this.sceneManager.width, this.sceneManager.height);
    });

    window.addEventListener('mousemove', (event) => {
      const rect = this.container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      this.mouse.set(x * 2 - 1, -(y * 2 - 1));
    });
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  loop = () => {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 1 / 20);
    this.lastTime = now;
    this.update(delta);
    this.render();
  };

  update(delta) {
    screenPaint.update(delta, this.mouse);
    this.physics.update(delta, this.sceneManager.camera, this.mouse);
    this.sphereRenderer.update(delta);
    this.sceneManager.update(delta);
    this.background.update(new THREE.Vector2(this.sceneManager.width, this.sceneManager.height));
  }

  render() {
    this.renderer.render(this.sceneManager.scene, this.sceneManager.camera);
  }

  getTotalSphereCount() {
    return this.physics ? this.physics.bodies.length : 0;
  }
}

export async function createAnimation(container = document.body) {
  const app = new SphereClusterApp(container);
  await app.init();
  app.start();
  return app;
}
