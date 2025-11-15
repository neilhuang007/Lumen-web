import * as THREE from 'three';
import { CAMERA_SETTINGS, SETTINGS } from './config.js';
import { math, ease } from './utils.js';

export class SceneManager {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = SETTINGS.BACKGROUND_COLOR.clone();
    this.camera = null;
    this.renderer = null;
    this.width = 0;
    this.height = 0;
    this.time = 0;
  }

  async init() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.container.appendChild(this.renderer.domElement);

    const { fov, near, far, initialPosition, lookAt } = CAMERA_SETTINGS;
    this.camera = new THREE.PerspectiveCamera(fov, 1, near, far);
    this.camera.position.copy(initialPosition);
    this.camera.lookAt(lookAt);

    this.resize();
  }

  resize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  update(deltaTime) {
    this.time += deltaTime;
    const startZ = 25;
    const endZ = CAMERA_SETTINGS.initialPosition.z;
    const animatedZ = math.fit(this.time, 0.3, 2, startZ, endZ, ease.backOut);
    this.camera.position.z = animatedZ;
    this.camera.updateMatrixWorld();
  }
}
