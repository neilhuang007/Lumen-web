import * as THREE from 'three';
import { SCREEN_PAINT_FRAGMENT_SHADER } from './shaders.js';

const FULLSCREEN_GEOMETRY = new THREE.PlaneGeometry(2, 2);

export class ScreenPaint {
  constructor() {
    this.renderer = null;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.lowRenderTarget = null;
    this.lowBlurRenderTarget = null;
    this.prevPaintRenderTarget = null;
    this.currPaintRenderTarget = null;

    this.material = null;
    this.copyMaterial = null;
    this.quad = null;

    this.drawFrom = new THREE.Vector4();
    this.drawTo = new THREE.Vector4();
    this.velocity = new THREE.Vector2();

    this.mouse = new THREE.Vector2();
    this.prevMouse = new THREE.Vector2();
    this.scrollOffset = new THREE.Vector2();
    this._targetVelocity = new THREE.Vector2();

    this.enabled = true;
    this.useNoise = false;
    this.minRadius = 0;
    this.maxRadius = 100;
    this.radiusDistanceRange = 100;
    this.pushStrength = 25;
    this.accelerationDissipation = 0.8;
    this.velocityDissipation = 0.985;
    this.weight1Dissipation = 0.985;
    this.weight2Dissipation = 0.5;

    this.sharedUniforms = {
      u_paintTexelSize: { value: new THREE.Vector2() },
      u_paintTextureSize: { value: new THREE.Vector2() },
      u_prevPaintTexture: { value: null },
      u_currPaintTexture: { value: null },
      u_lowPaintTexture: { value: null }
    };
  }

  init(renderer) {
    this.renderer = renderer;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        u_lowPaintTexture: { value: null },
        u_prevPaintTexture: this.sharedUniforms.u_prevPaintTexture,
        u_paintTexelSize: this.sharedUniforms.u_paintTexelSize,
        u_drawFrom: { value: this.drawFrom },
        u_drawTo: { value: this.drawTo },
        u_pushStrength: { value: this.pushStrength },
        u_curlScale: { value: 0 },
        u_curlStrength: { value: 0 },
        u_vel: { value: this.velocity },
        u_dissipations: { value: new THREE.Vector3(this.velocityDissipation, this.weight1Dissipation, this.weight2Dissipation) },
        u_scrollOffset: { value: this.scrollOffset }
      },
      fragmentShader: SCREEN_PAINT_FRAGMENT_SHADER,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position,1.0); }`,
      transparent: false
    });

    this.copyMaterial = new THREE.MeshBasicMaterial({ map: null });
    this.quad = new THREE.Mesh(FULLSCREEN_GEOMETRY, this.material);
    this.scene.add(this.quad);

    this.lowRenderTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
    this.lowBlurRenderTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
    this.prevPaintRenderTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
    this.currPaintRenderTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });

    this.sharedUniforms.u_lowPaintTexture.value = this.lowRenderTarget.texture;
    this.sharedUniforms.u_prevPaintTexture.value = this.prevPaintRenderTarget.texture;
    this.sharedUniforms.u_currPaintTexture.value = this.currPaintRenderTarget.texture;

    this.material.uniforms.u_lowPaintTexture.value = this.lowRenderTarget.texture;

    this.clear();
  }

  clear() {
    if (!this.renderer) return;
    const clearColor = new THREE.Color(0.5, 0.5, 0);
    this.renderer.setRenderTarget(this.lowRenderTarget);
    this.renderer.setClearColor(clearColor, 0);
    this.renderer.clear(true, true, true);

    this.renderer.setRenderTarget(this.lowBlurRenderTarget);
    this.renderer.clear(true, true, true);

    this.renderer.setRenderTarget(this.prevPaintRenderTarget);
    this.renderer.clear(true, true, true);

    this.renderer.setRenderTarget(this.currPaintRenderTarget);
    this.renderer.clear(true, true, true);

    this.velocity.set(0, 0);
    this.renderer.setRenderTarget(null);
  }

  resize(width, height) {
    const targetWidth = Math.max(1, Math.floor(width / 4));
    const targetHeight = Math.max(1, Math.floor(height / 4));

    this.currPaintRenderTarget.setSize(targetWidth, targetHeight);
    this.prevPaintRenderTarget.setSize(targetWidth, targetHeight);
    this.lowRenderTarget.setSize(Math.max(1, targetWidth >> 1), Math.max(1, targetHeight >> 1));
    this.lowBlurRenderTarget.setSize(Math.max(1, targetWidth >> 1), Math.max(1, targetHeight >> 1));

    this.sharedUniforms.u_paintTexelSize.value.set(1 / targetWidth, 1 / targetHeight);
    this.sharedUniforms.u_paintTextureSize.value.set(targetWidth, targetHeight);
    this.clear();
  }

  update(deltaTime, mousePosition, scrollDelta = 0) {
    if (!this.renderer || !this.enabled) return;

    this._targetVelocity.set(mousePosition.x - this.prevMouse.x, mousePosition.y - this.prevMouse.y);
    this.velocity.lerp(this._targetVelocity, 0.2);
    this.prevMouse.copy(mousePosition);

    const radius = THREE.MathUtils.clamp(
      this.velocity.length() * this.radiusDistanceRange,
      this.minRadius,
      this.maxRadius
    );

    const texSize = this.sharedUniforms.u_paintTextureSize.value;
    const toPixels = new THREE.Vector2(mousePosition.x, mousePosition.y);
    toPixels.x = (toPixels.x + 1) * 0.5 * texSize.x;
    toPixels.y = (toPixels.y + 1) * 0.5 * texSize.y;

    this.drawFrom.set(this.drawTo.x, this.drawTo.y, this.drawTo.z, this.drawTo.w);
    this.drawTo.set(toPixels.x, toPixels.y, radius, THREE.MathUtils.clamp(radius / this.maxRadius, 0, 1));

    const swap = this.prevPaintRenderTarget;
    this.prevPaintRenderTarget = this.currPaintRenderTarget;
    this.currPaintRenderTarget = swap;
    this.sharedUniforms.u_prevPaintTexture.value = this.prevPaintRenderTarget.texture;
    this.sharedUniforms.u_currPaintTexture.value = this.currPaintRenderTarget.texture;

    this.material.uniforms.u_lowPaintTexture.value = this.lowRenderTarget.texture;
    this.material.uniforms.u_dissipations.value.set(this.velocityDissipation, this.weight1Dissipation, this.weight2Dissipation);

    this.renderer.setRenderTarget(this.currPaintRenderTarget);
    this.quad.material = this.material;
    this.renderer.render(this.scene, this.camera);

    this.renderer.setRenderTarget(this.lowRenderTarget);
    this.copyMaterial.map = this.currPaintRenderTarget.texture;
    this.quad.material = this.copyMaterial;
    this.renderer.render(this.scene, this.camera);

    this.renderer.setRenderTarget(null);
  }
}

export const screenPaint = new ScreenPaint();
