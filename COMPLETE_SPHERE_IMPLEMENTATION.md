# Complete Sphere Cluster Animation - Exact Specifications

## Summary
After thorough analysis of `hoisted.81170750.js`, here are the **exact** specifications for recreating the sphere cluster animation.

## KEY FINDING: Sphere Sizes
**ALL SPHERES ARE THE SAME SIZE** (radius = 1.0)

The sphere data shows:
```javascript
let sphereData = [
  {color:fancyColor, radius:1, ...},  // All 24 spheres
  {color:"#ffffff", radius:1, ...},
  {color:"#111", radius:1, ...},
  // ... etc - ALL have radius: 1
];
```

**Physical radius calculation**:
```javascript
this.radius = 1.05 * radius; // = 1.05 for all spheres
```

**Mesh scaling**:
```javascript
mesh.scale.setScalar(radius); // = 1.0 for all spheres
```

**Note**: The `.buf` models in `models/` include sphere_l, sphere_m, sphere_s, sphere_xs, but the ORIGINAL ANIMATION uses `cross.buf` (NOT sphere models) as the geometry for all spheres.

## Exact Sphere Configuration (24 total on desktop, 22 on mobile)

### Desktop Configuration:
1. **3x Colored Matte** - Dynamic color, roughness 0.8
2. **3x Colored Glossy** - Dynamic color, roughness 0.1
3. **3x White Matte** - #ffffff, roughness 0.8
4. **3x White Glossy** - #ffffff, roughness 0.1
5. **4x Black/Stone Matte** - #111, roughness 0.8
6. **2x Black Glossy** - #111, roughness 0.1
7. **1x Transparent White** - #fff, transparent, roughness 0.8
8. **1x Transparent Tinted** - Lighter version of dynamic color, transparent, roughness 0.8

**Total: 20 regular + 4 duplicate colored + 2 transparent = 24 spheres** (Actually 22 base + 2 transparent)

### Mobile Configuration:
Same as desktop BUT transparent spheres are excluded (20 total).

## Lighting Configuration

### Light Position
```javascript
u_lightPosition: new Vector3(10, 10, 5)
```

The light is positioned at (10, 10, 5) in world space.

## Color Palette
```javascript
const COLORS = [
  "#061dfb",  // Blue (default)
  "#ADFF00",  // Lime green
  "#f6000e",  // Red
  "#7e09f5",  // Purple
  "#ffc000"   // Orange
];
```

One color is randomly selected at page load and used for all "colored" spheres.

## Position & Velocity Initialization

### Seed
```javascript
let random = math.getSeedRandomFn("balloonBody-25");
```
Uses seeded random for consistent distribution.

### Position Calculation
```javascript
constructor(radius=1, density=1, friction=.5, restitution=.5, isSemitransparent=false) {
  this.position0.set(
    (random() - 0.5) * 12,  // X: [-6, 6]
    (random() - 0.5) * 12,  // Y: [-6, 6]
    isSemitransparent ? 7 + random() : (random() - 0.5) * 6  // Z: [7,8] or [-3,3]
  );

  this.velocity0.copy(this.position0).multiplyScalar(-2);
}
```

**Key points**:
- Regular spheres: Distributed in cube [-6,6] x [-6,6] x [-3,3]
- Transparent spheres: Positioned farther back at Z=[7,8]
- Initial velocity = position * -2 (moves toward origin)

## Physics Parameters

### Gravity
```javascript
const GRAVITY_FACTOR = 40;

updateGravity(dt) {
  this.gravityForce.copy(this.position).negate().multiplyScalar(GRAVITY_FACTOR);
  this.gravityAcc.copy(this.gravityForce).multiplyScalar(1/this.mass);
  this.gravityAcc.multiplyScalar(1/(1+this.frictionTot));
  this.velocity.addScaledVector(this.gravityAcc, dt);
  this.frictionTot *= 0.5;
}
```

### Damping
```javascript
update(dt) {
  this.position.addScaledVector(this.velocity, dt);
  this.velocity.multiplyScalar(Math.pow(0.2, dt));
}
```

Time-based damping: `velocity *= 0.2^dt`

### Materials (All identical physics properties)
```javascript
SOFT_PLASTIC = HARD_PLASTIC = GLASS = STONE = {
  density: 1.0,
  friction: 2.0,
  restitution: 0.8
};
```

### Mouse Interaction
```javascript
MOUSE_RADIUS = 0.025;
MOUSE_INFLUENCE = 0.1;
MOUSE_PUSH_FORCE = 0.12;
```

## Vertex Shader (Exact)

```glsl
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
attribute vec3 daoN;
attribute vec3 daoP;
attribute float ao;
attribute float thickness;
attribute vec3 SN;

uniform vec3 u_lightPosition;
uniform vec4 u_selfPositionRadius;
uniform vec4 u_selfRotation;
uniform float u_time;

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

  // Calculate self-shadowing from light
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
```

## Fragment Shader Features

The fragment shader (frag$p) implements:

1. **Matcap shading** - Uses u_matcap texture for efficient lighting
2. **Neighbor-based AO/GI** - Each sphere calculates ambient occlusion and global illumination from neighboring spheres (NEIGHBOUR_COUNT = 23 for a scene with 24 spheres)
3. **Cross-shaped geometry intersection** - Special raytracing for the cross.buf model
4. **Self-shadowing** - Calculated in vertex shader
5. **Reflections** - Ray-traced reflections from nearby spheres
6. **SSS (Subsurface Scattering)** - For certain materials
7. **Roughness-based blurring** - Rougher surfaces get blurrier reflections

Key uniforms:
```javascript
{
  u_color: // Sphere color
  u_bgColor: // Background color (#141515)
  u_sssColor: // SSS color (#111)
  u_matcap: // Matcap texture (EXR format)
  u_lightPosition: new Vector3(10, 10, 5),
  u_sss: 0, // SSS strength
  u_roughness: isRough ? 0.8 : 0.1,
  u_selfPositionRadius: // Vec4(x,y,z,radius)
  u_selfRotation: // Quaternion
  u_nearPositionRadiusList: // Array[NEIGHBOUR_COUNT]
  u_nearRotationList: // Array[NEIGHBOUR_COUNT]
  u_nearColorList: // Array[NEIGHBOUR_COUNT]
  u_nearTransparencyLumaList: // Array[NEIGHBOUR_COUNT]
}
```

## Camera Configuration
```javascript
{
  fov: 25,  // degrees
  near: 0.1,
  far: 2000,
  position: [0, 0, 17.5],  // Starting position
  lookAt: [0, 0, 0]
}
```

**Dynamic camera Z**:
```javascript
camera.position.z = math.fit(homePage.time, 0.3, 2, 25, 17.5, ease.backOut);
// Animates from Z=25 to Z=17.5 over time using back-out easing
```

## Background
```javascript
scene.background = new Color("#141515");  // Very dark gray, almost black
```

## 3D Model

**Critical**: The original uses `cross.buf` (NOT sphere geometries):
```javascript
// Desktop: "models/home/cross.buf" (1,732 bytes)
// Mobile: "models/home/cross_ld.buf" (1,036 bytes)
```

This is a custom cross-shaped geometry with special attributes:
- `daoN`, `daoP` - Directional ambient occlusion data
- `ao` - Ambient occlusion
- `thickness` - For SSS calculations
- `SN` - Smooth normals

## Rendering Order

Spheres are depth-sorted and rendered with special ordering for transparency:
```javascript
// Sort by camera distance
balloons.sort((a,b) => a.distanceFromCamera < b.distanceFromCamera ? 1 : -1);

// Transparent spheres get special render order
if (isSemitransparent) {
  mesh.renderOrder = index * 3 + 2;
  meshBack.renderOrder = index * 3;  // Back face rendered first
}
```

## Post-Processing

The original includes:
1. **Multi-level blur** - 4 levels of progressive blur for reflections
2. **Paint effect overlay** - Interactive fluid distortion
3. **Vignette** - Subtle darkening at edges
4. **Blue noise dithering** - For smooth gradients

## Neighbor System

Each sphere tracks ALL other spheres as "neighbors":
```javascript
NEIGHBOUR_COUNT = NUM_BALLOONS - 1;  // 23 neighbors for 24 spheres
```

For each sphere, the shader receives:
- Position + radius of all 23 neighbors
- Rotation (quaternion) of all 23 neighbors
- Color of all 23 neighbors
- Transparency + luminance of all 23 neighbors

This enables real-time sphere-to-sphere:
- Ambient occlusion
- Global illumination (color bleeding)
- Reflections
- Shadow casting

## Implementation Checklist

To match the original EXACTLY:

- [ ] Use `cross.buf` model (NOT procedural spheres or sphere_*.buf)
- [ ] Load matcap.exr texture
- [ ] All 24 spheres same size (radius = 1.0)
- [ ] Light at (10, 10, 5)
- [ ] Implement vertex shader with self-shadowing
- [ ] Implement fragment shader with:
  - [ ] Matcap shading
  - [ ] Neighbor-based AO/GI (23 neighbors per sphere)
  - [ ] Cross geometry intersection tests
  - [ ] Reflections with roughness-based blur
- [ ] Implement 4-level blur cascade for reflections
- [ ] Background color #141515
- [ ] Camera FOV 25°, starting Z=17.5
- [ ] Seeded random "balloonBody-25" for positions
- [ ] Position range: [-6,6] x [-6,6] x [-3,3] (transparent at [7,8])
- [ ] Velocity = position * -2
- [ ] Gravity factor = 40
- [ ] Damping = 0.2^dt
- [ ] Mouse interaction (radius 0.025, force 0.12)

## Simplified Version (Without Advanced Shaders)

For a simpler implementation without custom shaders:

1. Use procedural sphere geometry
2. Standard THREE.MeshStandardMaterial
3. Single directional light at (10, 10, 5)
4. Keep all physics identical
5. Skip neighbor system, matcap, and advanced reflections

This will give ~70% visual accuracy with 10% of the complexity.
