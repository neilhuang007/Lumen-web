/**
 * Sphere Renderer - Creates and manages visual representation of spheres
 * Handles materials, colors, and rendering order
 */

import * as THREE from 'three';
import { BufLoader } from './buf-loader.js';

export class SphereRenderer {
  constructor(scene, camera, config) {
    this.scene = scene;
    this.camera = camera;
    this.config = config;

    this.sphereMeshes = [];
    this.materials = [];
    this.currentColor = null;
  }

  /**
   * Initialize sphere meshes
   */
  async init(physicsBodies) {
    console.log(`Creating ${physicsBodies.length} sphere meshes...`);

    // Get current accent color
    this.currentColor = this.config.spheres.colorPalette[0];

    // Create geometry (shared by all spheres)
    let geometry;

    // Try to load .buf model if assets are enabled
    if (this.config.assets.useExternalAssets) {
      try {
        const bufLoader = new BufLoader();
        const isMobile = window.innerWidth <= 768;
        const modelPath = isMobile
          ? this.config.assets.models.sphereMobile
          : this.config.assets.models.sphere;

        console.log(`Loading sphere geometry from: ${modelPath}`);
        geometry = await bufLoader.load(modelPath);
        console.log('✓ Sphere geometry loaded from .buf file');
      } catch (error) {
        console.warn('Failed to load .buf geometry, using procedural fallback:', error);
        geometry = null;
      }
    }

    // Fallback to procedural geometry
    if (!geometry) {
      const segments = window.innerWidth > 768 ? 32 : 16;
      geometry = new THREE.SphereGeometry(1, segments, segments);
      console.log('✓ Using procedural sphere geometry');
    }

    // Create spheres based on configuration
    let bodyIndex = 0;

    const counts = this.config.spheres.counts;

    // Colored matte spheres
    for (let i = 0; i < counts.coloredMatte; i++) {
      this.createSphere(geometry, physicsBodies[bodyIndex++], {
        color: this.currentColor,
        roughness: this.config.rendering.materials.roughness.matte,
        metalness: 0,
        isColored: true
      });
    }

    // Colored glossy spheres
    for (let i = 0; i < counts.coloredGlossy; i++) {
      this.createSphere(geometry, physicsBodies[bodyIndex++], {
        color: this.currentColor,
        roughness: this.config.rendering.materials.roughness.glossy,
        metalness: 0.3,
        isColored: true
      });
    }

    // White matte spheres
    for (let i = 0; i < counts.whiteMatte; i++) {
      this.createSphere(geometry, physicsBodies[bodyIndex++], {
        color: '#ffffff',
        roughness: this.config.rendering.materials.roughness.matte,
        metalness: 0
      });
    }

    // White glossy spheres
    for (let i = 0; i < counts.whiteGlossy; i++) {
      this.createSphere(geometry, physicsBodies[bodyIndex++], {
        color: '#ffffff',
        roughness: this.config.rendering.materials.roughness.glossy,
        metalness: 0.3
      });
    }

    // Black matte spheres
    for (let i = 0; i < counts.blackMatte; i++) {
      this.createSphere(geometry, physicsBodies[bodyIndex++], {
        color: '#111111',
        roughness: this.config.rendering.materials.roughness.matte,
        metalness: 0
      });
    }

    // Black glossy spheres
    for (let i = 0; i < counts.blackGlossy; i++) {
      this.createSphere(geometry, physicsBodies[bodyIndex++], {
        color: '#111111',
        roughness: this.config.rendering.materials.roughness.glossy,
        metalness: 0.5
      });
    }

    // Transparent spheres (if enabled)
    if (counts.transparentWhite > 0) {
      for (let i = 0; i < counts.transparentWhite; i++) {
        this.createSphere(geometry, physicsBodies[bodyIndex++], {
          color: '#ffffff',
          roughness: 0.1,
          metalness: 0,
          transparent: true,
          opacity: 0.3
        });
      }
    }

    if (counts.transparentTinted > 0) {
      // Create lighter version of current color
      const tintedColor = new THREE.Color(this.currentColor);
      tintedColor.offsetHSL(0, 0, 0.3);

      for (let i = 0; i < counts.transparentTinted; i++) {
        this.createSphere(geometry, physicsBodies[bodyIndex++], {
          color: '#' + tintedColor.getHexString(),
          roughness: 0.1,
          metalness: 0,
          transparent: true,
          opacity: 0.3,
          isColored: true
        });
      }
    }

    console.log('Sphere meshes created');
  }

  /**
   * Create a single sphere mesh
   */
  createSphere(geometry, physicsBody, options) {
    const material = new THREE.MeshStandardMaterial({
      color: options.color,
      roughness: options.roughness,
      metalness: options.metalness,
      transparent: options.transparent || false,
      opacity: options.opacity || 1.0,
      side: THREE.FrontSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(physicsBody.radius);
    mesh.castShadow = this.config.rendering.shadows;
    mesh.receiveShadow = this.config.rendering.shadows;

    // Store metadata
    mesh.userData.physicsBody = physicsBody;
    mesh.userData.isColored = options.isColored || false;
    mesh.userData.isTransparent = options.transparent || false;

    this.scene.add(mesh);
    this.sphereMeshes.push(mesh);
    this.materials.push(material);
  }

  /**
   * Update sphere positions and rotations from physics
   */
  update(deltaTime, physicsBodies) {
    // Sort spheres by distance from camera for proper transparency
    this.sphereMeshes.sort((a, b) => {
      const distA = a.position.distanceToSquared(this.camera.position);
      const distB = b.position.distanceToSquared(this.camera.position);
      return distB - distA; // Back to front
    });

    // Update transforms
    this.sphereMeshes.forEach((mesh, index) => {
      const body = mesh.userData.physicsBody;

      mesh.position.copy(body.position);
      mesh.quaternion.copy(body.quaternion);

      // Update render order for transparency
      if (mesh.userData.isTransparent) {
        mesh.renderOrder = -index; // Render transparent spheres last
      }
    });
  }

  /**
   * Update colors for colored spheres
   */
  updateColors(newColor) {
    this.currentColor = newColor;

    this.sphereMeshes.forEach((mesh) => {
      if (mesh.userData.isColored) {
        if (mesh.userData.isTransparent) {
          // For transparent tinted spheres, use lighter version
          const tintedColor = new THREE.Color(newColor);
          tintedColor.offsetHSL(0, 0, 0.3);
          mesh.material.color.set(tintedColor);
        } else {
          mesh.material.color.set(newColor);
        }
      }
    });
  }

  /**
   * Cleanup resources
   */
  dispose() {
    this.sphereMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });

    this.sphereMeshes = [];
    this.materials = [];
  }
}
