# Bundle Separation Documentation

## Overview
The original bundled file `hoisted.81170750.js` (1.3MB, 4187 lines) has been separated into two distinct files:

### 1. **three.js** (303KB, 3530 lines)
Contains the Three.js library code including:
- Core Three.js classes (Vector, Matrix, Camera, Renderer, etc.)
- WebGL renderer and shader utilities
- Geometry, Material, and Light classes
- Post-processing effects and utilities

### 2. **rendering.js** (938KB, 657 lines)
Contains the custom application code including:
- FBO (Frame Buffer Object) helpers
- Custom shader definitions
- Application-specific rendering classes
- Post-processing effects (Bloom, SMAA, etc.)
- Scene setup and animation logic

## Separation Point
- **Three.js library ends**: Line 3530
- **Custom code begins**: Line 3531

## Usage

### Option 1: Separated Bundle (New)
Use `index-separated.html` which loads the separated files:
```html
<script src="./three.js"></script>
<script src="./rendering.js"></script>
```

### Option 2: CDN Imports (Existing)
The original `index.html` continues to work with `main.js` using CDN imports via import maps.

## Files
- `hoisted.81170750.js` - Original bundled file (kept for reference)
- `three.js` - Extracted Three.js library
- `rendering.js` - Extracted custom rendering code
- `index-separated.html` - Demo HTML using separated files
- `index.html` - Original HTML using CDN approach
- `main.js` - User code for CDN approach

## Benefits of Separation
1. **Clearer architecture**: Library vs application code clearly separated
2. **Easier maintenance**: Update Three.js library independently from custom code
3. **Better debugging**: Easier to identify where issues originate
4. **Modularity**: Custom rendering code can be reused or modified without touching library code
