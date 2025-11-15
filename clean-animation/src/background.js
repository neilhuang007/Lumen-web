import * as THREE from 'three';
import { BACKGROUND_VERTEX_SHADER, BACKGROUND_FRAGMENT_SHADER } from './shaders.js';
import { SETTINGS } from './config.js';

export class BackgroundLayer {
  constructor(scene, screenPaint, blueNoise) {
    this.scene = scene;
    this.screenPaint = screenPaint;
    this.blueNoise = blueNoise;
    this.mesh = null;
  }

  init() {
    const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);
    const uniforms = {
      u_color0: { value: new THREE.Color('#141515') },
      u_color1: { value: new THREE.Color('#101010') },
      u_colorPaint: { value: new THREE.Color('#1a2ffb') },
      u_aspect: { value: 1 },
      u_smooth: { value: new THREE.Vector2(0.2, 0.95) },
      u_resolution: { value: new THREE.Vector2(1, 1) },
      u_activeRatio: { value: 0 },
      u_screenPaintTexture: this.screenPaint.sharedUniforms.u_currPaintTexture,
      ...this.blueNoise.sharedUniforms
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: BACKGROUND_VERTEX_SHADER,
      fragmentShader: BACKGROUND_FRAGMENT_SHADER,
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  update(rendererSize) {
    if (!this.mesh) return;
    const uniforms = this.mesh.material.uniforms;
    uniforms.u_aspect.value = rendererSize.x / Math.max(rendererSize.y, 1);
    uniforms.u_resolution.value.copy(rendererSize);
  }
}
