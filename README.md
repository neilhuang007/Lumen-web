# Lumen - Boids Cluster Visualization

A mesmerizing 3D visualization featuring thousands of glowing boids forming a pulsating, volumetric cloud in space, inspired by Lusion's about page.

## Features

### Boids System
- **2000 individual boids** with varied sizes (0.08 - 0.2 units)
- **Flocking behavior** implementing three core rules:
  - **Alignment**: Boids steer toward the average heading of neighbors
  - **Cohesion**: Boids move toward the average position of neighbors
  - **Separation**: Boids avoid crowding neighbors
- **Center attraction**: Keeps the cluster together with stronger pull at greater distances
- **Organic turbulence**: Adds natural, flowing motion to the cluster

### Visual Effects
- **Volumetric glow**: Bright white core with gradual falloff toward edges
- **Bloom post-processing**: Creates soft, luminescent appearance
- **Pulsating animation**: Each boid has animated opacity for a living, breathing effect
- **Varied sizes**: Creates depth and visual interest within the cluster
- **Semi-transparent particles**: Gives the appearance of bioluminescent spores or fireflies

### Background
- **5000 stars** distributed in a sphere around the scene
- **Subtle color variation**: Blue-white stars with varied brightness
- **Slow rotation**: Creates a sense of cosmic movement
- **Additive blending**: Stars glow naturally against the black void

### God-Ray Effect
- **Volumetric beam** shining upward from below the cluster
- **Animated rays**: Dynamic light patterns that shift over time
- **Smooth falloff**: Fades naturally from source to the cluster
- **Enhances volumetric feeling**: Suggests light scattering through particles

### Camera
- **Gentle orbital movement**: Subtle rotation around the cluster
- **Optimal viewing angle**: Positioned to showcase the 3D depth of the cluster

## Technical Implementation

### Technologies
- **Three.js** (v0.160.0) - 3D rendering engine
- **WebGLRenderer** - Hardware-accelerated rendering
- **EffectComposer** - Post-processing pipeline
- **UnrealBloomPass** - Volumetric glow effect

### Performance
- Optimized for real-time rendering of 2000+ particles
- Efficient boid calculations using spatial perception radius
- GPU-accelerated shaders for god-ray effect

### Code Structure
- `Boid` class: Handles individual boid behavior and flocking algorithms
- `createStarfield()`: Generates background star particles
- `createGodRay()`: Custom shader-based volumetric beam
- Post-processing pipeline: Bloom for glow effects
- Animation loop: Updates boids, camera, and effects each frame

## Running the Project

1. **Local Server Required**: Modern browsers require a local server for ES modules
   ```bash
   # Using Python
   python -m http.server 8000

   # Or using Node.js
   npx serve
   ```

2. **Open in Browser**: Navigate to `http://localhost:8000`

3. **No Build Required**: Uses CDN-hosted Three.js via import maps

## Customization

### Adjust Boid Count
```javascript
const boidCount = 2000; // Increase or decrease for performance/density
```

### Modify Cluster Behavior
```javascript
alignment.multiplyScalar(1.2);  // How much boids align with neighbors
cohesion.multiplyScalar(1.0);   // How strongly they cluster together
separation.multiplyScalar(1.5); // How much they avoid each other
center.multiplyScalar(2.0);     // How strongly they're pulled to center
```

### Bloom Intensity
```javascript
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,  // strength (increase for more glow)
    0.8,  // radius (size of glow)
    0.3   // threshold (lower = more things glow)
);
```

### Boid Appearance
```javascript
this.size = 0.08 + Math.random() * 0.12;  // Size range
this.maxSpeed = 0.15;                      // Movement speed
this.maxForce = 0.005;                     // Turn rate
```

## Visual Description

The effect creates:
- **Volumetric light** caught in particles
- **Dust scattering moonlight** in a dark void
- Something between **fog, snow, and a murmuration** of tiny glowing creatures
- **Bioluminescent spores** suspended in air
- A **pulsating cloud** with organic, living movement
- **God-rays** suggesting light shining upward through the particle cluster

## Browser Compatibility

Works in all modern browsers that support:
- WebGL 2.0
- ES6 Modules
- Import Maps

Tested on: Chrome, Firefox, Safari, Edge (latest versions)
