import * as THREE from 'three';

// Vertex shader
const vertexShader = `
  uniform vec3 u_lightPosition;
  uniform vec4 u_selfPositionRadius;
  uniform vec4 u_selfRotation;

  varying vec3 v_viewPosition;
  varying vec3 v_worldPosition;
  varying vec3 v_viewNormal;
  varying vec3 v_smoothViewNormal;
  varying vec2 v_uv;
  varying vec3 v_localPosition;
  varying float v_ao;
  varying float v_selfShadow;

  vec3 qrotate(vec3 v, vec4 q) {
    return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
  }

  void main() {
    v_localPosition = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;

    // Calculate self-shadowing from light
    vec4 invertedQuat = vec4(-u_selfRotation.xyz, u_selfRotation.w);
    vec3 L = (u_lightPosition - worldPosition) / u_selfPositionRadius.w;
    L = normalize(qrotate(L, invertedQuat));

    // Simple AO/shadow calculation
    vec3 absDir = abs(L);
    float selfShadow = (absDir.x + absDir.y + absDir.z) / 3.0;
    selfShadow = min(pow(selfShadow * 3.0, 0.3) * 1.45, 1.0);

    v_worldPosition = worldPosition;
    v_viewNormal = normalMatrix * normal;
    v_smoothViewNormal = normalMatrix * normal;
    v_viewPosition = -mvPosition.xyz;
    v_uv = uv;
    v_ao = 1.0;
    v_selfShadow = selfShadow;
  }
`;

// Fragment shader
const fragmentShader = `
  #define NEIGHBOUR_COUNT 49

  precision highp float;

  varying vec3 v_viewNormal;
  varying vec3 v_smoothViewNormal;
  varying vec3 v_viewPosition;
  varying vec3 v_worldPosition;
  varying vec2 v_uv;
  varying vec3 v_localPosition;
  varying float v_ao;
  varying float v_selfShadow;

  uniform vec4 u_nearPositionRadiusList[NEIGHBOUR_COUNT];
  uniform vec3 u_nearColorList[NEIGHBOUR_COUNT];
  uniform vec2 u_nearTransparencyLumaList[NEIGHBOUR_COUNT];

  uniform float u_roughness;
  uniform vec3 u_bgColor;
  uniform vec3 u_color;
  uniform vec3 u_lightPosition;

  const float PI = 3.14159265359;

  vec3 inverseTransformDirection(in vec3 dir, in mat4 matrix) {
    return normalize((vec4(dir, 0.0) * matrix).xyz);
  }

  // Simplified neighbor AO/GI calculation
  float calculateNeighborAO(vec3 worldPos, vec3 normal, vec4 nearPosRadius) {
    vec3 toNeighbor = nearPosRadius.xyz - worldPos;
    float dist = length(toNeighbor);
    float radius = nearPosRadius.w;

    if (dist < radius * 2.5) {
      vec3 dir = normalize(toNeighbor);
      float alignment = max(0.0, -dot(normal, dir));
      float falloff = 1.0 - smoothstep(radius * 0.5, radius * 2.5, dist);
      return 1.0 - (alignment * falloff * 0.5);
    }
    return 1.0;
  }

  vec3 calculateNeighborGI(vec3 worldPos, vec4 nearPosRadius, vec3 nearColor, float nearLuma) {
    vec3 toNeighbor = nearPosRadius.xyz - worldPos;
    float dist = length(toNeighbor);
    float radius = nearPosRadius.w;

    if (dist < radius * 3.0) {
      float falloff = 1.0 - smoothstep(radius, radius * 3.0, dist);
      return nearColor * falloff * (1.0 - nearLuma * 0.5) * 0.3;
    }
    return vec3(0.0);
  }

  void main() {
    vec3 viewNormal = normalize(v_viewNormal);
    vec3 V = normalize(cameraPosition - v_worldPosition);
    vec3 N = normalize(v_viewNormal);
    vec3 L = normalize(u_lightPosition - v_worldPosition);

    float NdL = max(dot(N, L), 0.0);
    float NdV = max(dot(N, V), 0.0);

    // Neighbor-based AO and GI
    float ao = 1.0;
    float shadow = 1.0;
    vec3 gi = vec3(0.0);

    for (int i = 0; i < NEIGHBOUR_COUNT; i++) {
      vec3 nearColor = u_nearColorList[i];
      vec2 nearTransparencyLuma = u_nearTransparencyLumaList[i];
      vec4 nearPosRadius = u_nearPositionRadiusList[i];

      float neighborAO = calculateNeighborAO(v_worldPosition, N, nearPosRadius);
      ao *= neighborAO;

      vec3 neighborGI = calculateNeighborGI(v_worldPosition, nearPosRadius, nearColor, nearTransparencyLuma.y);
      gi += neighborGI;
    }

    gi /= float(NEIGHBOUR_COUNT);
    gi *= 3.0;

    // Lighting
    vec3 ambient = u_bgColor * 0.3;
    vec3 diffuse = u_color * NdL;
    diffuse *= v_selfShadow;

    // Specular
    vec3 R = reflect(-L, N);
    float spec = pow(max(dot(R, V), 0.0), mix(5.0, 50.0, 1.0 - u_roughness));
    vec3 specular = vec3(spec) * (1.0 - u_roughness);

    // Fresnel
    float fresnel = pow(1.0 - NdV, 3.0) * 0.3;

    // Final color
    vec3 color = ambient + diffuse + specular + fresnel;
    color *= ao * v_ao;
    color += gi;
    color *= shadow;

    // Tone mapping
    color = color / (color + vec3(1.0));
    color = pow(color, vec3(1.0/2.2));

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createShaderMaterial(config, body, neighbourCount) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      u_color: { value: new THREE.Color(config.color) },
      u_bgColor: { value: new THREE.Color(0x141515) },
      u_lightPosition: { value: new THREE.Vector3(10, 10, 5) },
      u_roughness: { value: config.roughness },
      u_selfPositionRadius: { value: new THREE.Vector4(0, 0, 0, body.radius) },
      u_selfRotation: { value: new THREE.Vector4(0, 0, 0, 1) },
      u_nearPositionRadiusList: { value: Array.from({ length: neighbourCount }, () => new THREE.Vector4()) },
      u_nearColorList: { value: Array.from({ length: neighbourCount }, () => new THREE.Color()) },
      u_nearTransparencyLumaList: { value: Array.from({ length: neighbourCount }, () => new THREE.Vector2()) }
    },
    defines: {
      NEIGHBOUR_COUNT: neighbourCount
    }
  });
}
