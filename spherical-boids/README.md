# Spherical Boids - Interactive Particle System

An interactive Three.js implementation of the boids flocking algorithm on a spherical surface, inspired by the particle effects seen on sites like Lusion.co.

## Features

- **Spherical Flocking**: Boids move naturally on the surface of a sphere using adapted flocking rules
- **Mouse Interaction**: Particles react to mouse movement and flee from the cursor
- **Real-time Controls**: Adjust boid count and behavior parameters on the fly
- **Visual Trails**: Each boid leaves a colorful trail showing its path
- **Gradient Colors**: Beautiful HSL color gradient across all particles
- **Smooth Animation**: 60fps performance with optimized particle system

## Algorithm

The implementation uses Craig Reynolds' boids algorithm adapted for spherical geometry:

### Core Behaviors
1. **Separation**: Boids avoid crowding neighbors
2. **Alignment**: Boids align with the average heading of neighbors
3. **Cohesion**: Boids steer toward the average position of neighbors
4. **Surface Constraint**: All movement is projected onto the tangent plane to maintain spherical motion

### Mouse Interaction
- Boids flee from the mouse cursor when it intersects with the sphere
- Adjustable influence radius and force strength
- Ray-casting used for accurate 3D mouse-to-sphere intersection

## Controls

- **Boid Count** (100-2000): Number of particles in the system
- **Cohesion** (0-2): Strength of attraction to group center
- **Separation** (0-3): Strength of repulsion from nearby boids
- **Alignment** (0-2): Strength of velocity alignment
- **Mouse Influence** (0-5): How strongly boids react to mouse cursor

### Camera Controls
- **Left Click + Drag**: Rotate view
- **Right Click + Drag**: Pan view
- **Scroll**: Zoom in/out
- **Auto-Rotation**: Camera slowly rotates automatically

## Technical Details

### Dependencies
- Three.js r160 (loaded via CDN)
- OrbitControls for camera manipulation

### Key Components

**Boid Class** (`spherical-boids/main.js:29`)
- Handles individual boid behavior and physics
- Maintains position, velocity, acceleration on sphere surface
- Implements flocking rules with neighbor detection

**SphericalBoidsScene Class** (`spherical-boids/main.js:148`)
- Manages Three.js scene, camera, renderer
- Updates all boids each frame
- Handles mouse raycasting and interaction
- Renders particles and trails

### Performance Optimizations
- BufferGeometry for efficient particle rendering
- Additive blending for glowing effect without overdraw
- Configurable trail length to balance visuals and performance
- Instanced rendering through Points system

## Usage

Simply open `index.html` in a modern web browser that supports:
- ES6 Modules
- Import Maps
- WebGL

No build step required - everything runs directly in the browser.

## Customization

Edit the `CONFIG` object in `main.js` to adjust default values:

```javascript
const CONFIG = {
    boidCount: 500,           // Number of boids
    sphereRadius: 5,          // Size of sphere
    maxSpeed: 0.02,           // Maximum boid velocity
    maxForce: 0.001,          // Maximum steering force
    perceptionRadius: 1.5,    // How far boids can see
    separationDistance: 0.5,  // Personal space radius
    cohesionForce: 0.5,       // Cohesion strength
    separationForce: 1.0,     // Separation strength
    alignmentForce: 0.5,      // Alignment strength
    mouseInfluence: 2.0,      // Mouse repulsion strength
    trailLength: 30           // Number of trail points
};
```

## Inspiration

This effect is inspired by the interactive particle systems found on creative studio websites like:
- Lusion.co - Award-winning creative studio with stunning WebGL effects
- Various Codrops demos exploring particle systems
- Craig Reynolds' original boids algorithm (1986)

## Future Enhancements

Potential improvements:
- Add predator/prey behaviors
- Implement different formation patterns
- Add color cycling animations
- Support for multiple spheres
- VR/AR compatibility
- Audio reactivity
