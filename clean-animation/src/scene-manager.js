/**
 * Scene Manager - Sets up and manages the Three.js scene, camera, and renderer
 */

import * as THREE from 'three';

export class SceneManager {
  constructor(container, config) {
    this.container = container;
    this.config = config;

    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.width = 0;
    this.height = 0;
  }

  /**
   * Initialize the Three.js scene
   */
  async init() {
    // Create scene
    this.scene = new THREE.Scene();
    const bgColor = new THREE.Color(this.config.rendering.background.color);
    this.scene.background = bgColor;

    // Create camera
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(
      this.config.rendering.camera.fov,
      aspect,
      this.config.rendering.camera.near,
      this.config.rendering.camera.far
    );

    const camPos = this.config.rendering.camera.position;
    this.camera.position.set(camPos[0], camPos[1], camPos[2]);

    const lookAt = this.config.rendering.camera.lookAt;
    this.camera.lookAt(new THREE.Vector3(lookAt[0], lookAt[1], lookAt[2]));

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.config.rendering.antialias,
      alpha: true
    });

    this.renderer.setPixelRatio(this.config.rendering.pixelRatio);
    this.resize();

    this.container.appendChild(this.renderer.domElement);

    // Add lights
    this.setupLights();

    console.log('Scene Manager initialized');
  }

  /**
   * Setup scene lighting
   */
  setupLights() {
    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // Directional light for main illumination
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    this.scene.add(directionalLight);

    // Add subtle point lights for more interesting lighting
    const pointLight1 = new THREE.PointLight(0x4080ff, 0.3);
    pointLight1.position.set(-5, 5, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff8040, 0.2);
    pointLight2.position.set(5, -5, -5);
    this.scene.add(pointLight2);
  }

  /**
   * Update camera animation
   */
  update(deltaTime, time) {
    // Subtle camera movement based on time
    const camConfig = this.config.rendering.camera;
    const baseZ = camConfig.position[2];

    // Gentle Z-axis breathing
    this.camera.position.z = baseZ + Math.sin(time * 0.2) * 0.5;

    // Optional: Slight rotation for more dynamic feel
    // this.camera.rotation.z = Math.sin(time * 0.1) * 0.02;
  }

  /**
   * Handle window resize
   */
  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height);
  }

  /**
   * Cleanup resources
   */
  dispose() {
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
