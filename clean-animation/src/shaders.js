export const TEXTURE_BICUBIC_CHUNK = `
vec4 cubic(float v){
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
  vec4 s = n * n * n;
  float x = s.x;
  float y = s.y - 4.0 * s.x;
  float z = s.z - 4.0 * s.y + 6.0 * s.x;
  float w = 6.0 - x - y - z;
  return vec4(x, y, z, w);
}

vec4 textureBicubic(sampler2D tex, vec2 uv, vec2 textureSize) {
  vec2 invTexSize = 1.0 / textureSize;
  uv = uv * textureSize - 0.5;
  vec2 fxy = fract(uv);
  uv -= fxy;

  vec4 xcubic = cubic(fxy.x);
  vec4 ycubic = cubic(fxy.y);
  vec4 c = uv.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 s = vec4(xcubic.xz + xcubic.yw, ycubic.xz + ycubic.yw);
  vec4 offset = c + vec4(xcubic.yw, ycubic.yw) / s;
  offset *= invTexSize.xxyy;

  vec4 sample0 = texture2D(tex, offset.xz);
  vec4 sample1 = texture2D(tex, offset.yz);
  vec4 sample2 = texture2D(tex, offset.xw);
  vec4 sample3 = texture2D(tex, offset.yw);

  float sx = s.x / (s.x + s.y);
  float sy = s.z / (s.z + s.w);
  return mix(mix(sample3, sample2, sx), mix(sample1, sample0, sx), sy);
}

vec4 textureBicubic(sampler2D tex, vec2 uv, vec2 textureSize, vec4 clampRect) {
  vec2 invTexSize = 1.0 / textureSize;
  uv = uv * textureSize - 0.5;
  vec2 fxy = fract(uv);
  uv -= fxy;

  vec4 xcubic = cubic(fxy.x);
  vec4 ycubic = cubic(fxy.y);
  vec4 c = uv.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 s = vec4(xcubic.xz + xcubic.yw, ycubic.xz + ycubic.yw);
  vec4 offset = c + vec4(xcubic.yw, ycubic.yw) / s;
  offset *= invTexSize.xxyy;

  vec4 sample0 = texture2D(tex, clamp(offset.xz, clampRect.xy, clampRect.zw));
  vec4 sample1 = texture2D(tex, clamp(offset.yz, clampRect.xy, clampRect.zw));
  vec4 sample2 = texture2D(tex, clamp(offset.xw, clampRect.xy, clampRect.zw));
  vec4 sample3 = texture2D(tex, clamp(offset.yw, clampRect.xy, clampRect.zw));

  float sx = s.x / (s.x + s.y);
  float sy = s.z / (s.z + s.w);
  return mix(mix(sample3, sample2, sx), mix(sample1, sample0, sx), sy);
}
`;

export const BLUE_NOISE_CHUNK = `
uniform sampler2D u_blueNoiseTexture;
uniform vec2 u_blueNoiseTexelSize;
uniform vec2 u_blueNoiseCoordOffset;

vec3 getBlueNoise(vec2 coord) {
  return texture2D(u_blueNoiseTexture, coord * u_blueNoiseTexelSize + u_blueNoiseCoordOffset).rgb;
}

vec3 getStaticBlueNoise(vec2 coord) {
  return texture2D(u_blueNoiseTexture, coord * u_blueNoiseTexelSize).rgb;
}
`;

export const SPHERE_VERTEX_SHADER = `
attribute vec3 daoN;
attribute vec3 daoP;
attribute float ao;
attribute float thickness;
attribute vec3 SN;

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
varying float v_thickness;
varying float v_selfShadow;

vec3 qrotate(vec3 v, vec4 q) {
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

void main() {
  v_localPosition = position;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  vec4 invertedQuat = vec4(-u_selfRotation.xyz, u_selfRotation.w);
  vec3 L = (u_lightPosition - worldPosition) / u_selfPositionRadius.w;
  L = normalize(qrotate(L, invertedQuat));
  vec3 dao = mix(daoN, daoP, sign(L) * 0.5 + 0.5);
  vec3 absDir = abs(L);
  float selfShadow = dot(absDir, dao) / (absDir.x + absDir.y + absDir.z);
  selfShadow = min(pow(selfShadow * 3.0, 0.3) * 1.45, 1.0);

  v_worldPosition = worldPosition;
  v_viewNormal = normalMatrix * normal;
  v_smoothViewNormal = normalMatrix * SN;
  v_viewPosition = -mvPosition.xyz;
  v_uv = uv;
  v_ao = ao;
  v_thickness = thickness;
  v_selfShadow = selfShadow;
}
`;

export const SPHERE_FRAGMENT_SHADER = `
#define saturate(a) clamp(a, 0.0, 1.0)

varying vec3 v_viewNormal;
varying vec3 v_smoothViewNormal;
varying vec3 v_viewPosition;
varying vec3 v_worldPosition;
varying vec2 v_uv;
varying vec3 v_localPosition;
varying float v_ao;
varying float v_selfShadow;
varying float v_thickness;

uniform vec4 u_nearPositionRadiusList[NEIGHBOUR_COUNT];
uniform vec4 u_nearRotationList[NEIGHBOUR_COUNT];
uniform vec3 u_nearColorList[NEIGHBOUR_COUNT];
uniform vec2 u_nearTransparencyLumaList[NEIGHBOUR_COUNT];
uniform float u_roughness;
uniform vec3 u_bgColor;
uniform vec3 u_color;
uniform float u_time;
uniform sampler2D u_matcap;
uniform vec3 u_lightPosition;

#ifdef IS_SEMITRANSPARENT
uniform sampler2D u_sceneTexture;
uniform sampler2D u_blurredTextures[4];
uniform vec2 u_blurredTextureSizes[4];
#endif

#ifdef IS_SEMITRANSPARENT_BACK
uniform sampler2D u_sceneTexture;
#endif

uniform float u_sss;
uniform vec3 u_sssColor;

${TEXTURE_BICUBIC_CHUNK}
${BLUE_NOISE_CHUNK}

vec3 qrotate(vec3 v, vec4 q) {
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

float cylIntersect(vec3 ro, vec3 rd, vec3 a, vec3 b, float radius) {
  vec3 ba = b - a;
  vec3 oc = ro - a;
  float baba = dot(ba, ba);
  float bard = dot(ba, rd);
  float baoc = dot(ba, oc);
  float k2 = baba - bard * bard;
  float k1 = baba * dot(oc, rd) - baoc * bard;
  float k0 = baba * dot(oc, oc) - baoc * baoc - radius * radius * baba;
  float h = k1 * k1 - k2 * k0;
  if (h < 0.0) {
    return 200.0;
  }
  h = sqrt(h);
  float t = (-k1 - h) / k2;
  float y = baoc + t * bard;
  if (y > 0.0 && y < baba) {
    return t;
  }
  t = ((y < 0.0 ? 0.0 : baba) - baoc) / bard;
  if (abs(k1 + k2 * t) < h) {
    return t;
  }
  return 200.0;
}

bool centerSphereHitTest(vec3 ro, vec3 rd, float radius) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - radius * radius;
  return b * b - c >= 0.0;
}

vec3 getCrossAoShadowIntersect(vec3 p, vec3 n, vec3 l, vec3 refl, vec4 objPosRadius, vec4 quaternion, float intersectDist) {
  float ao = 1.0;
  float shadow = 1.0;
  float intersect = 100.0;
  float R = 0.666667 * objPosRadius.w;
  float r = 0.333333 * objPosRadius.w;

  vec3 centerPos = objPosRadius.xyz;
  vec3 invertedPosOffset = -objPosRadius.xyz;
  vec4 invertedQuat = vec4(-quaternion.xyz, quaternion.w);

  p = qrotate(p + invertedPosOffset, invertedQuat);
  l = normalize(qrotate(l + invertedPosOffset, invertedQuat));
  n = qrotate(n, invertedQuat);
  refl = qrotate(refl, invertedQuat);

  vec3 ro = p;
  vec3 pa = vec3(-R);
  vec3 pb = vec3(R);

  vec3 ba = pb - pa;
  vec3 oa = ro - pa;
  vec3 oaX = vec3(oa.x, ro.y, ro.z);
  vec3 oaY = vec3(ro.x, oa.y, ro.z);
  vec3 oaZ = vec3(ro.x, ro.y, oa.z);
  vec3 baba = ba * ba;
  vec3 oaba = oa * ba;
  vec3 h3 = clamp(oaba / baba, vec3(0.0), vec3(1.0));
  vec3 odX = oaX - vec3(h3.x * ba.x, 0.0, 0.0);
  vec3 odY = oaY - vec3(0.0, h3.y * ba.y, 0.0);
  vec3 odZ = oaZ - vec3(0.0, 0.0, h3.z * ba.z);
  vec3 dl3 = vec3(length(odX), length(odY), length(odZ));
  vec3 o3 = vec3(1.0) - saturate(vec3(dot(-odX, n), dot(-odY, n), dot(-odZ, n)) * r * r / (dl3 * dl3 * dl3));
  o3 = sqrt(o3 * o3 * o3);
  ao = o3.x * o3.y * o3.z;

  vec3 oad = vec3(dot(oaX, l), dot(oaY, l), dot(oaZ, l));
  vec3 dba = l * ba;
  vec3 thDiv = 1.0 / (baba - dba * dba);
  vec3 thX3 = max((-oad * baba + dba * oaba) * thDiv, vec3(0.0001));
  vec3 thY3 = saturate((oaba - oad * dba) * thDiv);
  vec3 pp = pa + ba * thY3;
  vec3 qqX = ro + l * thX3.x;
  vec3 qqY = ro + l * thX3.y;
  vec3 qqZ = ro + l * thX3.z;
  vec3 dd = vec3(length(vec3(pp.x, 0.0, 0.0) - qqX), length(vec3(0.0, pp.y, 0.0) - qqY), length(vec3(0.0, 0.0, pp.z) - qqZ)) - r;
  vec3 s = saturate(dd / thX3 + 0.5);
  s = s * s * (3.0 - 2.0 * s);
  shadow = s.x * s.y * s.z;

  r *= 0.9;
  if ((intersectDist + 2.05 > length(p) - objPosRadius.w) && centerSphereHitTest(ro, refl, objPosRadius.w * 1.1)) {
    vec3 a = vec3(-objPosRadius.w, 0.0, 0.0);
    vec3 b = vec3(objPosRadius.w, 0.0, 0.0);
    intersect = min(intersect, cylIntersect(p, refl, a, b, r));
    a = vec3(0.0, -objPosRadius.w, 0.0);
    b = vec3(0.0, objPosRadius.w, 0.0);
    intersect = min(intersect, cylIntersect(p, refl, a, b, r));
    a = vec3(0.0, 0.0, -objPosRadius.w);
    b = vec3(0.0, 0.0, objPosRadius.w);
    intersect = min(intersect, cylIntersect(p, refl, a, b, r));
  }

  return vec3(ao, shadow, intersect);
}

vec2 getUvFromPos(vec3 v) {
  vec4 ndcPos = projectionMatrix * viewMatrix * vec4(v, 1.0);
  vec2 refractionCoords = ndcPos.xy / ndcPos.w;
  refractionCoords += 1.0;
  refractionCoords *= 0.5;
  return refractionCoords;
}

vec3 inverseTransformDirection(vec3 dir, mat4 matrix) {
  return normalize((vec4(dir, 0.0) * matrix).xyz);
}

vec3 filmicToneMapping(vec3 color) {
  color = max(vec3(0.0), color - vec3(0.004));
  color = (color * (6.2 * color + 0.5)) / (color * (6.2 * color + 1.7) + 0.06);
  return color;
}

vec3 hue2RGBSmooth(float hue) {
  vec3 rgb = clamp(abs(mod(hue * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return rgb * rgb * (3.0 - 2.0 * rgb);
}

void main() {
  vec3 blueNoise = getBlueNoise(gl_FragCoord.xy + vec2(3.0, 9.0));
  vec3 blueNoise2 = getBlueNoise(gl_FragCoord.xy + vec2(56.0, 39.0));

  float faceDirection = gl_FrontFacing ? 1.0 : -1.0;
  vec3 viewNormal = faceDirection * normalize(v_viewNormal);
  vec3 smoothViewNormal = faceDirection * normalize(v_smoothViewNormal);
  vec3 V = normalize(cameraPosition - v_worldPosition);
  vec3 N = inverseTransformDirection(viewNormal, viewMatrix);
  vec3 SN = inverseTransformDirection(smoothViewNormal, viewMatrix);

  float roughness = min(0.9, u_roughness + dot(vec3(1.0), fwidth(viewNormal)));
  vec3 reflectView = reflect(-V, N);
  vec3 reflectViewBN = normalize(reflectView + (blueNoise - 0.5) * (roughness > 0.5 ? 0.5 : 0.01));

  vec3 worldToLight = u_lightPosition - v_worldPosition;
  vec3 L = normalize(worldToLight);
  float NdV = clamp(abs(dot(N, V)), 0.001, 1.0);
  float NdL = clamp(dot(N, L), 0.001, 1.0);

  vec3 gi = vec3(1.0);
  vec4 reflections = vec4(0.0, 0.0, 0.0, 100.0);
  float ao = 1.0;
  float shadow = 1.0;

  for (int i = 0; i < NEIGHBOUR_COUNT; i++) {
    vec3 nearColor = u_nearColorList[i];
    vec2 nearTransparencyLuma = u_nearTransparencyLumaList[i];
    vec3 aoShadowIntersect = getCrossAoShadowIntersect(
      v_worldPosition,
      N,
      worldToLight,
      reflectViewBN,
      u_nearPositionRadiusList[i],
      u_nearRotationList[i],
      reflections.w
    );

    float neighbourAo = aoShadowIntersect.r;
    neighbourAo = saturate(neighbourAo + 0.5 * nearTransparencyLuma.x);
    ao *= neighbourAo;
    shadow *= aoShadowIntersect.g;
    gi += (1.0 - 0.9 * nearTransparencyLuma.y) * nearColor * 3.0 * min(1.0, (1.0 - neighbourAo * neighbourAo) / 0.7);

    float neighDist = aoShadowIntersect.b;
    if (neighDist < reflections.w && neighDist > 0.0001) {
      reflections = vec4(vec3((1.0 - 0.5 * nearTransparencyLuma.x) * nearColor), neighDist);
    }
  }

  reflections.rgb *= 1.0 / ((0.2 + roughness * 0.8) * reflections.w * 10.0 + 4.0);
  reflections *= ao * v_ao;
  gi /= float(NEIGHBOUR_COUNT);

#ifdef IS_SEMITRANSPARENT
  float ior = 2.4;
  vec3 refractionVector = refract(-V, SN, 1.0 / ior);
  vec2 refractionCoords = getUvFromPos(v_worldPosition + refractionVector * 0.3);
  float lod = 2.5 + v_thickness;
  vec4 blur;
  if (lod < 1.5) {
    blur = textureBicubic(u_blurredTextures[0], refractionCoords, u_blurredTextureSizes[0]);
  } else if (lod < 2.5) {
    blur = textureBicubic(u_blurredTextures[1], refractionCoords, u_blurredTextureSizes[1]);
  } else {
    blur = textureBicubic(u_blurredTextures[2], refractionCoords, u_blurredTextureSizes[2]);
  }
  vec3 albedo = blur.rgb * (0.75 + u_color * 0.4);
  albedo = albedo * 0.8 + (0.125 + 0.2 * v_selfShadow * v_ao) * u_color;
#else
  vec3 albedo = u_color;
#endif

  vec3 viewDir = normalize(v_viewPosition);
  vec3 x = normalize(vec3(viewDir.z, 0.0, -viewDir.x));
  vec3 y = cross(viewDir, x);
#ifdef IS_SEMITRANSPARENT
  vec2 uvPerturbed = vec2(dot(x, smoothViewNormal), dot(y, smoothViewNormal)) * 0.5 + 0.5;
#else
  vec2 uvPerturbed = vec2(dot(x, viewNormal), dot(y, viewNormal)) * 0.5 + 0.5;
#endif

  vec3 matcapMap = texture2D(u_matcap, uvPerturbed).rgb;
  vec3 matcapDiff = 0.25 + 0.75 * vec3(matcapMap.r);
  vec3 matcapSpec = (roughness > 0.5) ? vec3(matcapMap.g) : vec3(matcapMap.b);
  reflections.rgb *= 0.75 + 0.25 * shadow * v_selfShadow;
  shadow = 0.6 + 0.4 * shadow;

  vec3 color;
#ifdef IS_SEMITRANSPARENT
  float fresnel = (1.0 - clamp(abs(dot(normalize(N + SN), V)), 0.001, 1.0)) * (1.0 - v_thickness);
  color = albedo;
  color += 0.15 * matcapDiff;
  color += fresnel * albedo * 0.5;
  color += reflections.rgb;
  color += hue2RGBSmooth(viewNormal.z * v_ao * 1.5) * pow(1.0 - v_thickness * 0.75, 2.0) * max(vec3(0.0), 1.0 - matcapDiff) * 0.2 * dot(albedo, vec3(0.299, 0.587, 0.114));
  color *= (v_selfShadow * 0.35 + 0.65);
  color *= (ao * shadow * 0.75 + 0.25);
#else
  color = albedo * matcapDiff + matcapSpec;
  color += reflections.rgb;
  color *= ao;
  color += gi;
  color *= v_selfShadow;
  color *= shadow;
#endif

  vec3 toneMapped = filmicToneMapping(pow(color, vec3(2.2)));
  gl_FragColor = vec4(toneMapped, saturate(dot(color, vec3(0.299, 0.587, 0.114)) * 1.5 - 1.0));
}
`;

export const BACKGROUND_VERTEX_SHADER = `
uniform vec2 u_clipScale;
uniform vec2 u_clipOffset;
varying vec2 v_uv;

void main() {
  vec3 pos = position;
  vec3 absPos = abs(position);
  if (max(absPos.x, absPos.y) < 0.9) {
    pos.xy = pos.xy * u_clipScale + u_clipOffset;
    pos *= 2.0;
  }
  gl_Position = vec4(pos, 1.0);
  v_uv = pos.xy * 0.5 + 0.5;
}
`;

export const BACKGROUND_FRAGMENT_SHADER = `
uniform vec3 u_color0;
uniform vec3 u_color1;
uniform vec3 u_colorPaint;
uniform float u_aspect;
uniform vec2 u_smooth;
uniform vec2 u_resolution;
uniform float u_activeRatio;
uniform sampler2D u_screenPaintTexture;
varying vec2 v_uv;
${BLUE_NOISE_CHUNK}

void main() {
  vec3 noise = getBlueNoise(gl_FragCoord.xy);
  vec2 q = v_uv - 0.5;
  q.x *= u_aspect;
  float dst = length(q);
  dst = smoothstep(u_smooth.x, u_smooth.y, dst);
  vec3 color = mix(u_color0, u_color1, 0.925 + 0.075 * dst);
  color += noise * 0.004;
  gl_FragColor = vec4(color, 0.0);
}
`;

export const SCREEN_PAINT_FRAGMENT_SHADER = `
uniform sampler2D u_lowPaintTexture;
uniform sampler2D u_prevPaintTexture;
uniform vec2 u_paintTexelSize;
uniform vec2 u_scrollOffset;
uniform vec4 u_drawFrom;
uniform vec4 u_drawTo;
uniform float u_pushStrength;
uniform vec3 u_dissipations;
uniform vec2 u_vel;
varying vec2 v_uv;

vec2 sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return vec2(length(pa - ba * h), h);
}

#ifdef USE_NOISE
uniform float u_curlScale;
uniform float u_curlStrength;
vec2 hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}

vec3 noised(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec2 ga = hash(i + vec2(0.0, 0.0));
  vec2 gb = hash(i + vec2(1.0, 0.0));
  vec2 gc = hash(i + vec2(0.0, 1.0));
  vec2 gd = hash(i + vec2(1.0, 1.0));
  float va = dot(ga, f - vec2(0.0, 0.0));
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));
  return vec3(
    va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * (va - vb - vc + vd),
    ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd) + du * (u.yx * (va - vb - vc + vd) + vec2(vb, vc) - va)
  );
}
#endif

void main() {
  vec2 res = sdSegment(gl_FragCoord.xy, u_drawFrom.xy, u_drawTo.xy);
  vec2 radiusWeight = mix(u_drawFrom.zw, u_drawTo.zw, res.y);
  float d = 1.0 - smoothstep(-0.01, radiusWeight.x, res.x);

  vec4 lowData = texture2D(u_lowPaintTexture, v_uv - u_scrollOffset);
  vec2 velInv = (0.5 - lowData.xy) * u_pushStrength;

#ifdef USE_NOISE
  vec3 noise3 = noised(gl_FragCoord.xy * u_curlScale * (1.0 - lowData.xy));
  vec2 noise = noised(gl_FragCoord.xy * u_curlScale * (2.0 - lowData.xy * (0.5 + noise3.x) + noise3.yz * 0.1)).yz;
  velInv += noise * (lowData.z + lowData.w) * u_curlStrength;
#endif

  vec4 data = texture2D(u_prevPaintTexture, v_uv - u_scrollOffset + velInv * u_paintTexelSize);
  data.xy -= 0.5;
  vec4 delta = (u_dissipations.xxyz - 1.0) * data;
  vec2 newVel = u_vel * d;
  delta += vec4(newVel, radiusWeight.yy * d);
  delta.zw = sign(delta.zw) * max(vec2(0.004), abs(delta.zw));
  data += delta;
  data.xy += 0.5;
  gl_FragColor = clamp(data, vec4(0.0), vec4(1.0));
}
`;
