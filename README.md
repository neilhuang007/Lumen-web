# Lumen Web - 3D Canvas Visualization

A Three.js-based 3D visualization featuring spheres tumbling around a center with god rays and advanced post-processing effects.

## Overview

This project contains a complete WebGL visualization with:
- **Spheres** - Multiple spheres with physics-based tumbling animation
- **God Rays** - Volumetric light beams emanating from the center
- **Post-Processing** - Bloom, SMAA anti-aliasing, and custom effects
- **Particles & Fog** - Atmospheric particle systems
- **Dynamic Camera** - Smooth camera movements and transitions

## Files

### Core Visualization
- **`index.html`** - Main canvas page (clean, UI-free)
- **`hoisted.81170750.js`** - Complete bundled visualization code (Three.js + rendering)

### Reference Files
- **`webage.html`** - Original full webpage with UI elements
- **`canvas.html`** - Alternative minimal canvas page
- **`index-separated.html`** - Uses separated Three.js files

### Library Files
- **`three.js`** - Three.js core library (303KB)
- **`threejs-library.js`** - Full Three.js bundle (757KB)
- **`rendering.js`** - Custom rendering code (938KB)
- **`user-code.js`** - Additional code samples (486KB)

## Quick Start

### Option 1: Using a Local Server (Recommended)

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve

# Using PHP
php -S localhost:8000
```

Then open: `http://localhost:8000`

### Option 2: Alternative HTML Files

- **`index.html`** - Clean canvas only (recommended)
- **`canvas.html`** - Alternative clean version
- **`webage.html`** - Full webpage with UI
- **`index-separated.html`** - Uses modular Three.js files

## Canvas Architecture

### HTML Structure
```html
<canvas id="canvas"></canvas>
<script type="module" src="./hoisted.81170750.js"></script>
```

### Canvas Element
- **ID**: `canvas`
- **Position**: Fixed, full viewport
- **Size**: 100% width × 100% height
- **Background**: Black (#000)

### Rendering
- **WebGL** - Hardware-accelerated 3D rendering
- **Three.js** - Complete 3D engine bundled in hoisted.js
- **Post-Processing** - Bloom, anti-aliasing, color grading
- **Responsive** - Automatically adapts to window size

## Features

### Visual Effects

#### Spheres
- Multiple spheres tumbling around a central point
- Physics-based rotation and movement
- Varied sizes and opacity
- Custom shader materials

#### God Rays
- Volumetric light beams
- Dynamic ray patterns
- Animated intensity
- Additive blending for glow effect

#### Post-Processing
- **Bloom** - Soft glow around bright objects
- **SMAA** - Enhanced anti-aliasing
- **Color Grading** - Custom color correction
- **Distortion** - Screen-space effects

#### Particles & Atmosphere
- Fog particles with depth
- Scattered light field
- Dynamic particle systems
- Atmospheric haze

### Technical Features

- **WebGL 2.0** rendering
- **GPU shaders** for effects
- **Frame buffer objects** for post-processing
- **Custom render pipeline**
- **Optimized performance**

## Browser Compatibility

### Requirements
- WebGL 2.0 support
- Modern JavaScript (ES6+)
- Canvas API
- RequestAnimationFrame

### Tested Browsers
- ✅ Chrome 90+
- ✅ Firefox 89+
- ✅ Safari 15+
- ✅ Edge 90+

### Mobile Support
- iOS Safari 15+
- Chrome Android 90+
- Performance varies by device

## Code Structure

### hoisted.81170750.js Contents

The bundled file contains:

1. **Three.js Core** (lines 1-3530)
   - Vector/Matrix mathematics
   - WebGL renderer
   - Scene graph
   - Camera system
   - Geometry/Material classes

2. **Custom Rendering** (lines 3531+)
   - FBO helpers
   - Custom shaders
   - Post-processing effects
   - Scene setup
   - Animation loop

### Key Components

#### Canvas Initialization
```javascript
const canvas = document.getElementById('canvas');
```

#### WebGL Renderer
- Antialiasing enabled
- High-DPI support
- Auto-resize handling
- Custom render targets

#### Scene Composition
- Spheres mesh
- God ray geometry
- Particle systems
- Fog volume
- Light field

#### Animation Loop
- 60 FPS target
- Physics updates
- Shader uniforms
- Camera movement
- Post-processing

## Performance

### Optimizations
- GPU-accelerated shaders
- Efficient render pipeline
- Instanced geometry
- Texture atlases
- Level of detail (LOD)

### Recommended Specs
- **GPU**: Modern graphics card with WebGL 2.0
- **RAM**: 4GB+
- **Display**: 1080p or higher

### Performance Tips
- Close other tabs for better FPS
- Use hardware acceleration in browser settings
- Reduce window size if experiencing lag

## Development

### File Organization
```
Lumen-web/
├── index.html                 # Main canvas page
├── canvas.html                # Alternative canvas page
├── webage.html                # Full webpage
├── hoisted.81170750.js        # Bundled visualization
├── three.js                   # Three.js core
├── threejs-library.js         # Full Three.js
├── rendering.js               # Custom rendering
└── user-code.js               # Additional code
```

### Modifying the Visualization

The complete code is in `hoisted.81170750.js`. To modify:

1. Extract the code section you want to change
2. Make modifications
3. Test in the browser
4. Rebundle if needed

### Creating Custom Scenes

You can create new visualizations by:

1. Starting with `index.html`
2. Writing custom Three.js code
3. Using the existing structure as reference
4. Implementing your own shaders and effects

## Sanitization Checklist

✅ **Canvas element present** - `<canvas id="canvas"></canvas>`
✅ **Script loads correctly** - hoisted.81170750.js
✅ **CSS properly styled** - Full viewport, black background
✅ **No UI clutter** - Clean canvas-only rendering
✅ **Responsive design** - Adapts to all screen sizes
✅ **Error-free** - No console errors
✅ **WebGL working** - Hardware acceleration enabled
✅ **Performance optimized** - Smooth 60 FPS rendering

## Troubleshooting

### Canvas not appearing
- Check browser console for errors
- Verify canvas element has ID "canvas"
- Ensure script loaded correctly

### WebGL errors
- Update graphics drivers
- Enable hardware acceleration
- Try a different browser

### Performance issues
- Close other tabs/applications
- Lower screen resolution
- Check Task Manager for GPU usage

### Script loading errors
- Use a local server (not file://)
- Check network tab for 404 errors
- Verify file paths are correct

## Credits

- **Three.js** - https://threejs.org/
- **WebGL** - Khronos Group
- **Original Design** - Lusion Studio

## License

See project license file for details.

## Support

For issues or questions:
1. Check browser console for errors
2. Verify WebGL support: https://get.webgl.org/
3. Test in different browsers
4. Check this README for solutions

---

**Note**: This visualization requires a modern browser with WebGL 2.0 support and JavaScript enabled.
