# Clean Floating Spheres Animation

A 3D interactive canvas background featuring physically-simulated floating spheres with bloom effects and user interaction.

## Features

- **Physics Simulation**: Spheres with gravity, collisions, and realistic bouncing
- **Mouse Interaction**: Push spheres away with mouse proximity
- **Scroll Paint Effect**: Create fluid paint trails as you scroll
- **Bloom & God Rays**: Dreamy glow effects around spheres
- **Multiple Materials**: Matte, glossy, and transparent glass spheres
- **Responsive**: Adapts to different screen sizes

## File Structure

```
clean-animation/
├── index.html              # Main HTML file
├── src/
│   ├── main.js            # Application entry point
│   ├── config.js          # Configuration constants
│   ├── scene-manager.js   # Three.js scene setup
│   ├── sphere-physics.js  # Physics engine for spheres
│   ├── sphere-renderer.js # Visual rendering of spheres
│   ├── paint-effect.js    # Screen paint/distortion effect
│   └── post-effects.js    # Bloom and post-processing
├── assets/
│   ├── textures/          # Matcap and other textures
│   └── models/            # 3D models if needed
└── dist/                  # Built/minified output
```

## Configuration

Edit `src/config.js` to customize:
- Sphere count and colors
- Physics parameters (gravity, friction, restitution)
- Effect intensities (bloom, paint, etc.)
- Performance settings

## Key Classes

### SpherePhysics
Handles physics simulation for all spheres:
- Gravity toward center point
- Inter-sphere collisions
- Mouse repulsion
- Velocity-based rotation

### SphereRenderer
Manages visual appearance:
- Matcap shading
- Transparent glass spheres
- Different material types
- Depth sorting for proper transparency

### PaintEffect
Creates interactive paint distortion:
- Scroll-based fluid motion
- Mouse brush strokes
- Curl noise for organic feel
- Multi-level blur cascade

### PostEffects
Bloom and final effects:
- God rays/halo around bright areas
- RGB chromatic aberration
- Vignette and color grading
- FSR upscaling for sharpness

## Usage

1. Open `index.html` in a modern browser
2. Move mouse to interact with spheres
3. Scroll to create paint effects
4. Click to trigger color changes (optional)

## Browser Requirements

- WebGL 2.0 support
- Modern browser (Chrome, Firefox, Safari, Edge)
- Hardware acceleration enabled

## Performance

The animation is optimized for:
- 60 FPS on desktop
- 30 FPS on mobile
- Automatic quality reduction on slower devices

## Credits

Based on advanced Three.js techniques:
- Physics simulation
- Matcap shading
- Post-processing effects
- FFT-based bloom
