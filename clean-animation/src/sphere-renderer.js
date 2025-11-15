import * as THREE from 'three';
import { BufLoader } from './buf-loader.js';
import { SPHERES_DATA, NEIGHBOUR_COUNT, SETTINGS } from './config.js';
import { SPHERE_VERTEX_SHADER, SPHERE_FRAGMENT_SHADER } from './shaders.js';

function generateMatcapTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(1, '#555566');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createMaterialConfig(sphere, matcapTexture, blueNoiseUniforms) {
  const uniforms = {
    u_color: { value: new THREE.Color(sphere.color) },
    u_bgColor: { value: SETTINGS.BACKGROUND_COLOR.clone() },
    u_sssColor: { value: new THREE.Color(sphere.sssColor) },
    u_sss: { value: sphere.sss },
    u_matcap: { value: matcapTexture },
    u_lightPosition: { value: SETTINGS.LIGHT_POSITION.clone() },
    u_selfPositionRadius: { value: new THREE.Vector4() },
    u_selfRotation: { value: new THREE.Quaternion() },
    u_nearPositionRadiusList: { value: Array.from({ length: NEIGHBOUR_COUNT }, () => new THREE.Vector4()) },
    u_nearRotationList: { value: Array.from({ length: NEIGHBOUR_COUNT }, () => new THREE.Quaternion()) },
    u_nearColorList: { value: Array.from({ length: NEIGHBOUR_COUNT }, () => new THREE.Color()) },
    u_nearTransparencyLumaList: { value: Array.from({ length: NEIGHBOUR_COUNT }, () => new THREE.Vector2()) },
    u_roughness: { value: sphere.isRough ? 0.8 : 0.1 },
    u_time: { value: 0 }
  };

  Object.assign(uniforms, blueNoiseUniforms);

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: SPHERE_VERTEX_SHADER,
    fragmentShader: `#define NEIGHBOUR_COUNT ${NEIGHBOUR_COUNT}\n${SPHERE_FRAGMENT_SHADER}`,
    transparent: false,
    depthWrite: true,
    side: THREE.FrontSide
  });

  material.defines = { NEIGHBOUR_COUNT };

  material.extensions = { derivatives: true };
  return material;
}

export class SphereRenderer {
  constructor(scene, blueNoise) {
    this.scene = scene;
    this.blueNoise = blueNoise;
    this.meshes = [];
    this.materials = [];
    this.geometry = null;
    this.matcapTexture = null;
  }

  async init(physicsBodies) {
    const loader = new BufLoader();
    try {
      this.geometry = await loader.load(`${SETTINGS.MODEL_PATH}${SETTINGS.CROSS_MODEL}`);
    } catch (error) {
      console.warn('Falling back to procedural sphere geometry:', error);
      this.geometry = new THREE.SphereGeometry(1, 32, 32);
    }

    this.matcapTexture = generateMatcapTexture();

    for (let i = 0; i < SPHERES_DATA.length; i += 1) {
      const sphere = SPHERES_DATA[i];
      const body = physicsBodies[i];
      const material = createMaterialConfig(sphere, this.matcapTexture, this.blueNoise.sharedUniforms);
      const mesh = new THREE.Mesh(this.geometry, material);
      mesh.scale.setScalar(sphere.radius);
      mesh.userData.physicsBody = body;
      mesh.userData.config = sphere;
      mesh.userData.uniforms = material.uniforms;
      this.scene.add(mesh);
      this.meshes.push(mesh);
      this.materials.push(material);
    }
  }

  update(deltaTime) {
    this.blueNoise.update();

    for (let i = 0; i < this.meshes.length; i += 1) {
      const mesh = this.meshes[i];
      const body = mesh.userData.physicsBody;
      mesh.position.copy(body.position);
      mesh.quaternion.copy(body.quaternion);

      const uniforms = mesh.userData.uniforms;
      uniforms.u_selfPositionRadius.value.set(body.position.x, body.position.y, body.position.z, body.radius);
      uniforms.u_selfRotation.value.copy(body.quaternion);
      uniforms.u_time.value += deltaTime;
    }

    const neighbourBuffer = [];
    for (let i = 0; i < this.meshes.length; i += 1) {
      const mesh = this.meshes[i];
      neighbourBuffer.length = 0;
      for (let j = 0; j < this.meshes.length; j += 1) {
        if (i === j) continue;
        const other = this.meshes[j];
        neighbourBuffer.push({ mesh: other, distance: mesh.position.distanceToSquared(other.position) });
      }
      neighbourBuffer.sort((a, b) => a.distance - b.distance);

      const uniforms = mesh.userData.uniforms;
      for (let n = 0; n < NEIGHBOUR_COUNT; n += 1) {
        const neighbour = neighbourBuffer[n];
        const otherMesh = neighbour.mesh;
        const otherBody = otherMesh.userData.physicsBody;
        const uniformPos = uniforms.u_nearPositionRadiusList.value[n];
        uniformPos.set(otherBody.position.x, otherBody.position.y, otherBody.position.z, otherBody.radius);
        uniforms.u_nearRotationList.value[n].copy(otherBody.quaternion);
        const neighborColor = uniforms.u_nearColorList.value[n];
        neighborColor.copy(otherMesh.userData.uniforms.u_color.value);
        const luma = neighborColor.r * 0.299 + neighborColor.g * 0.587 + neighborColor.b * 0.114;
        uniforms.u_nearTransparencyLumaList.value[n].set(otherMesh.userData.config.isSemitransparent ? 1 : 0, luma);
      }
    }
  }
}
