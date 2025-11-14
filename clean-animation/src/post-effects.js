/**
 * Post Effects - Bloom, god rays, and other post-processing effects
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export class PostEffects {
  constructor(renderer, config) {
    this.renderer = renderer;
    this.config = config;

    this.composer = null;
    this.bloomPass = null;
    this.finalPass = null;
  }

  /**
   * Initialize post-processing pipeline
   */
  init(scene, camera) {
    const bloomConfig = this.config.postEffects.bloom;

    // Create effect composer
    this.composer = new EffectComposer(this.renderer);

    // Add render pass
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // Add bloom pass
    if (bloomConfig.enabled) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        bloomConfig.amount,        // Strength
        bloomConfig.radius,         // Radius
        bloomConfig.threshold       // Threshold
      );

      this.composer.addPass(this.bloomPass);
    }

    // Add vignette & final color grading pass
    const vignetteConfig = this.config.postEffects.vignette;
    const colorConfig = this.config.postEffects.colorGrading;

    this.finalPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uVignetteFrom: { value: vignetteConfig.from },
        uVignetteTo: { value: vignetteConfig.to },
        uVignetteColor: { value: new THREE.Color(vignetteConfig.color) },
        uSaturation: { value: colorConfig.saturation },
        uContrast: { value: colorConfig.contrast },
        uBrightness: { value: colorConfig.brightness },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uVignetteFrom;
        uniform float uVignetteTo;
        uniform vec3 uVignetteColor;
        uniform float uSaturation;
        uniform float uContrast;
        uniform float uBrightness;
        uniform vec2 uResolution;
        varying vec2 vUv;

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);

          // Saturation
          float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          color.rgb = mix(vec3(luma), color.rgb, uSaturation);

          // Contrast
          color.rgb = 0.5 + (color.rgb - 0.5) * (1.0 + uContrast);

          // Brightness
          color.rgb += uBrightness - 1.0;

          // Vignette
          vec2 center = vUv - 0.5;
          float dist = length(center);
          float vignette = smoothstep(uVignetteTo, uVignetteFrom, dist * 2.0);
          color.rgb = mix(uVignetteColor, color.rgb, vignette);

          gl_FragColor = vec4(color.rgb, 1.0);
        }
      `
    });

    this.composer.addPass(this.finalPass);

    console.log('Post Effects initialized');
  }

  /**
   * Render with post-processing
   */
  render(scene, camera, paintEffect) {
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(scene, camera);
    }
  }

  /**
   * Handle resize
   */
  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (this.composer) {
      this.composer.setSize(width, height);
    }

    if (this.bloomPass) {
      this.bloomPass.resolution.set(width, height);
    }

    if (this.finalPass) {
      this.finalPass.uniforms.uResolution.value.set(width, height);
    }
  }

  /**
   * Cleanup resources
   */
  dispose() {
    if (this.composer) {
      this.composer.dispose();
    }
  }
}
