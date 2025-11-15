# Sphere Cluster Animation - Findings

## Overview
This document contains the extracted information from `hoisted.81170750.js` about the sphere cluster animation.

## Sphere Count
- **Desktop**: 24 spheres (22 base + 2 transparent)
- **Mobile**: 22 spheres (transparent spheres excluded)

### Sphere Types Breakdown
From `SPHERES_DATA` array in hoisted.81170750.js:
- 3x Colored matte spheres (using selected color from palette)
- 3x Colored glossy spheres
- 3x White matte spheres
- 3x White glossy spheres
- 4x Black/stone matte spheres
- 2x Black glossy spheres
- 2x Transparent spheres (desktop only)
  - 1x Glass-like white
  - 1x Glass-like tinted (lighter version of colored)

**Total**: 22-24 spheres depending on device

## Position Calculation
Location: `hoisted.81170750.js` - `HomeBalloonsBody` constructor

```javascript
// Random seed function ensures consistent random distribution
let random = math.getSeedRandomFn("balloonBody-25");

// Position initialization
this.position0.set(
  (random() - 0.5) * 12,  // X: range [-6, 6]
  (random() - 0.5) * 12,  // Y: range [-6, 6]
  a ? 7 + random() : (random() - 0.5) * 6  // Z: [7, 8] for transparent, [-3, 3] for others
);

// Initial velocity calculation (moves toward center)
this.velocity0.copy(this.position0).multiplyScalar(-2);
```

### Position Details
- **X coordinate**: `(random() - 0.5) * 12` → Range: [-6, 6]
- **Y coordinate**: `(random() - 0.5) * 12` → Range: [-6, 6]
- **Z coordinate**:
  - Transparent spheres: `7 + random()` → Range: [7, 8] (positioned behind)
  - Regular spheres: `(random() - 0.5) * 6` → Range: [-3, 3]

### Velocity Calculation
- **Formula**: `velocity = position * -2`
- **Effect**: Creates initial inward motion toward center point (0,0,0)
- All spheres start moving toward the origin, creating a converging effect

## Physics Parameters

### Gravity System
```javascript
const GRAVITY_FACTOR = 40;

// In updateGravity method:
this.gravityForce.copy(this.position).negate().multiplyScalar(GRAVITY_FACTOR);
this.gravityAcc.copy(this.gravityForce).multiplyScalar(1/this.mass);
this.velocity.addScaledVector(this.gravityAcc, deltaTime);
```

- **Gravity Factor**: 40
- **Direction**: Always toward center point (0,0,0)
- **Implementation**: Pulls spheres toward origin, creating orbital behavior

### Material Properties
All materials use same physics (SOFT_PLASTIC, HARD_PLASTIC, GLASS, STONE):
```javascript
{
  density: 1.0,
  friction: 2.0,
  restitution: 0.8  // Bounciness (80% energy retained on collision)
}
```

### Collision Physics
- **Collision detection**: Sphere-to-sphere using radius-based distance checks
- **Damping**: `velocity.multiplyScalar(Math.pow(0.2, deltaTime))`
- **Friction accumulation**: Combined friction from multiple collisions

### Mouse Interaction
```javascript
MOUSE_RADIUS = 0.025;
MOUSE_INFLUENCE = 0.1;
MOUSE_PUSH_FORCE = 0.12;
```
- Mouse creates repulsion force within radius
- Additional push based on mouse velocity

## Assets Required

### 3D Models
- **Desktop**: `models/home/cross.buf` (1,732 bytes) ✓ Copied
- **Mobile**: `models/home/cross_ld.buf` (1,036 bytes) ✓ Copied

### Textures
- `textures/home/matcap.exr` (desktop - high quality)
- `textures/home/matcap_ld.exr` (mobile - lower quality)
- `textures/LDR_RGB1_0.png` (blue noise texture for dithering)

## Color Palette
```javascript
const COLORS = [
  "#061dfb",  // Blue
  "#ADFF00",  // Lime green
  "#f6000e",  // Red
  "#7e09f5",  // Purple
  "#ffc000"   // Orange
];
```
One color is randomly selected at startup and used for colored spheres.

## Implementation in Clean Animation

### Current Status
✓ Position calculation implemented in `clean-animation/test-simple.html`
✓ Cross.buf models copied to `clean-animation/assets/models/home/`
✓ Config.js contains proper sphere counts and physics parameters
✓ Sphere physics module implemented
✓ Scene manager and renderer implemented

### Test Server
Server running at: `http://127.0.0.1:8000/test-simple.html`

## Key Differences from Original
The clean animation (`test-simple.html`) currently:
- Uses procedural sphere geometry instead of buf models
- Has 40 test spheres instead of 22-24
- Implements core physics: gravity, velocity, damping
- Missing advanced features:
  - Matcap rendering
  - Paint effect overlay
  - Post-processing effects
  - Advanced collision detection

## Next Steps to Match Original
1. Integrate buf-loader.js to load cross.buf models
2. Adjust sphere count to 22-24
3. Add matcap textures and shader materials
4. Implement proper material types (matte/glossy/transparent)
5. Add paint effect overlay
6. Implement neighbor-based rendering (NEIGHBOUR_COUNT system)
