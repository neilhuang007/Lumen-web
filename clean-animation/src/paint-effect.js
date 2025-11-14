/**
 * Paint Effect - Creates interactive paint/distortion effect based on mouse and scroll
 * Simulates fluid dynamics for organic motion
 */

import * as THREE from 'three';

export class PaintEffect {
  constructor(config) {
    this.config = config;

    // Render targets for paint simulation
    this.renderTargetA = null;
    this.renderTargetB = null;
    this.blurTarget = null;

    // Materials
    this.paintMaterial = null;
    this.blurMaterial = null;

    // State
    this.prevMousePos = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.enabled = true;
  }

  /**
   * Initialize paint effect
   */
  init(renderer) {
    const width = Math.floor(window.innerWidth / 4);
    const height = Math.floor(window.innerHeight / 4);

    // Create render targets
    this.renderTargetA = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType
    });

    this.renderTargetB = this.renderTargetA.clone();
    this.blurTarget = this.renderTargetA.clone();

    // Create paint material (simplified)
    this.paintMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: null },
        uMouse: { value: new THREE.Vector2() },
        uPrevMouse: { value: new THREE.Vector2() },
        uVelocity: { value: new THREE.Vector2() },
        uRadius: { value: 0.1 },
        uDissipation: { value: this.config.paintEffect.fluid.velocityDissipation },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform vec2 uMouse;
        uniform vec2 uPrevMouse;
        uniform vec2 uVelocity;
        uniform float uRadius;
        uniform float uDissipation;
        varying vec2 vUv;

        void main() {
          vec4 color = texture2D(uTexture, vUv);

          // Distance from current point to mouse line
          vec2 toMouse = vUv - uMouse;
          float dist = length(toMouse);

          // Add paint where mouse moved
          if (dist < uRadius) {
            float strength = 1.0 - (dist / uRadius);
            strength = smoothstep(0.0, 1.0, strength);
            color.rg += uVelocity * strength * 0.5;
            color.b += strength * 0.8;
          }

          // Dissipate over time
          color *= uDissipation;

          gl_FragColor = color;
        }
      `
    });

    // Simple blur material
    this.blurMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: null },
        uResolution: { value: new THREE.Vector2(width, height) },
        uDirection: { value: new THREE.Vector2(1, 0) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform vec2 uResolution;
        uniform vec2 uDirection;
        varying vec2 vUv;

        void main() {
          vec2 texelSize = 1.0 / uResolution;
          vec4 color = vec4(0.0);

          // Simple 5-tap blur
          color += texture2D(uTexture, vUv - texelSize * uDirection * 2.0) * 0.05;
          color += texture2D(uTexture, vUv - texelSize * uDirection) * 0.25;
          color += texture2D(uTexture, vUv) * 0.4;
          color += texture2D(uTexture, vUv + texelSize * uDirection) * 0.25;
          color += texture2D(uTexture, vUv + texelSize * uDirection * 2.0) * 0.05;

          gl_FragColor = color;
        }
      `
    });

    console.log('Paint Effect initialized');
  }

  /**
   * Update paint effect
   */
  update(deltaTime, mouse, scroll) {
    if (!this.enabled) return;

    // Calculate velocity
    const velX = mouse.x - this.prevMousePos.x;
    const velY = mouse.y - this.prevMousePos.y;

    // Update velocity with decay
    this.velocity.x = this.velocity.x * 0.9 + velX * 10;
    this.velocity.y = this.velocity.y * 0.9 + velY * 10;

    // Calculate brush radius based on movement speed
    const speed = Math.sqrt(velX * velX + velY * velY);
    const radius = THREE.MathUtils.clamp(
      speed * 100,
      this.config.paintEffect.brush.minRadius,
      this.config.paintEffect.brush.maxRadius
    ) / window.innerHeight;

    // Update uniforms
    this.paintMaterial.uniforms.uMouse.value.set(
      (mouse.x + 1) * 0.5,
      (mouse.y + 1) * 0.5
    );
    this.paintMaterial.uniforms.uVelocity.value.set(this.velocity.x, this.velocity.y);
    this.paintMaterial.uniforms.uRadius.value = radius;
    this.paintMaterial.uniforms.uTime.value += deltaTime;

    // Store previous mouse position
    this.prevMousePos.x = mouse.x;
    this.prevMousePos.y = mouse.y;
  }

  /**
   * Get the current paint texture
   */
  getTexture() {
    return this.renderTargetA.texture;
  }

  /**
   * Handle resize
   */
  resize(width, height) {
    const w = Math.floor(width / 4);
    const h = Math.floor(height / 4);

    this.renderTargetA.setSize(w, h);
    this.renderTargetB.setSize(w, h);
    this.blurTarget.setSize(w, h);

    if (this.blurMaterial) {
      this.blurMaterial.uniforms.uResolution.value.set(w, h);
    }
  }

  /**
   * Cleanup resources
   */
  dispose() {
    if (this.renderTargetA) this.renderTargetA.dispose();
    if (this.renderTargetB) this.renderTargetB.dispose();
    if (this.blurTarget) this.blurTarget.dispose();
    if (this.paintMaterial) this.paintMaterial.dispose();
    if (this.blurMaterial) this.blurMaterial.dispose();
  }
}
