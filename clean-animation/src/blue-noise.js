import * as THREE from 'three';
import { SETTINGS } from './config.js';

export class BlueNoise {
  constructor() {
    this.sharedUniforms = {
      u_blueNoiseTexture: { value: null },
      u_blueNoiseTexelSize: { value: new THREE.Vector2() },
      u_blueNoiseCoordOffset: { value: new THREE.Vector2() }
    };

    this.texture = null;
    this.linearTexture = null;
    this.TEXTURE_SIZE = 128;
  }

  async init() {
    const loader = new THREE.TextureLoader();
    const basePath = SETTINGS.TEXTURE_PATH + SETTINGS.BLUE_NOISE_TEXTURE;
    const texture = await loader.loadAsync(basePath);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = false;
    texture.minFilter = texture.magFilter = THREE.NearestFilter;

    const linearTexture = texture.clone();
    linearTexture.needsUpdate = true;
    linearTexture.minFilter = linearTexture.magFilter = THREE.LinearFilter;

    this.texture = texture;
    this.linearTexture = linearTexture;
    this.sharedUniforms.u_blueNoiseTexture.value = this.texture;
    this.sharedUniforms.u_blueNoiseTexelSize.value.set(1 / this.TEXTURE_SIZE, 1 / this.TEXTURE_SIZE);
  }

  update() {
    this.sharedUniforms.u_blueNoiseCoordOffset.value.set(Math.random(), Math.random());
  }
}

export const blueNoise = new BlueNoise();
