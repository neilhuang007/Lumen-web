# Canvas Background Animation Analysis

## Overview
This is a sophisticated 3D interactive background animation featuring floating spheres (balloons) with physics simulation, bloom effects, and user interaction through mouse/scroll.

## Visual Description

### Main Elements

#### 1. **Floating Spheres (Balloons)**
- **Count**: 22-24 spheres (fewer on mobile)
- **Types**:
  - **Colored Spheres**: 6 spheres with a randomly selected accent color (blue, lime green, red, purple, or orange)
    - 3 with soft/matte finish
    - 3 with hard/glossy finish
  - **White Spheres**: 6 spheres with white color
    - Soft matte finish
    - Hard glossy finish
  - **Black Spheres**: 6-8 spheres with dark/stone appearance
  - **Transparent Spheres**: 2 semi-transparent glass-like spheres (desktop only)
    - One white glass
    - One tinted glass with lighter version of accent color

#### 2. **Physics Behavior**
- **Gravity**: Spheres are attracted toward the center point (0,0,0)
  - Gravity factor: 40
  - Creates orbital/floating effect
- **Collisions**: Spheres bounce off each other
  - Friction values: 0.5-2.0 depending on material
  - Restitution (bounciness): ~0.8
  - Different densities for different materials
- **Mouse Interaction**:
  - Mouse proximity creates a repulsion force
  - Can "push" spheres away when mouse gets close
  - Mouse radius: 0.025 units
  - Push force: 0.12 units
- **Rotation**: Spheres rotate based on their velocity using torque physics

#### 3. **Visual Effects**

**Matcap Shading**:
- Spheres use matcap texture for realistic material appearance
- Subsurface scattering (SSS) support for translucent look
- Different roughness values:
  - Rough spheres: 0.8 roughness
  - Smooth spheres: 0.1 roughness

**Bloom & God Rays**:
- High-quality bloom post-processing
- Creates glowing halos around bright spheres
- God rays emanate from light sources
- Features:
  - Halo width: 0.8
  - Halo RGB chromatic aberration: 0.03
  - Halo strength: 0.21
  - Convolution-based (FFT) or multi-pass blur
  - Optional lens dirt overlay

#### 4. **Interactive Paint Effect**
- **Scroll-based distortion**:
  - As user scrolls, creates fluid paint-like trails
  - Affects background and sphere rendering
  - Push strength: 25
  - Velocity dissipation: 0.985
  - Acceleration dissipation: 0.8
- **Mouse painting**:
  - Mouse movement creates brush strokes
  - Brush radius: 0-100 pixels (based on movement speed)
  - Includes curl noise for organic fluid motion
  - RGB chromatic shift on fast movements
- **Blur cascade**:
  - Multiple blur passes for smooth distortion
  - 8-level blur with 1x, 1/2x, 1/4x, 1/8x resolution

#### 5. **Background**
- Starts with dark color (#141515)
- Responds to paint texture with color tinting
- Paint color: bright blue (#1a2ffb)
- Smooth clipping and aspect-based rendering
- Active ratio controls visibility

## Technical Features

### Rendering Pipeline
1. **Pre-pass rendering**: Depth sorting for transparency
2. **Main sphere rendering**: With matcap and lighting
3. **Transparent spheres**:
   - Front face pass with scene texture
   - Back face pass
   - Multiple blur levels for refraction
4. **Post-processing**:
   - Screen paint distortion
   - Bloom with god rays
   - FSR upscaling
   - Final color grading with vignette

### Camera
- Perspective camera with 25° FOV
- Position: (0, 0, 17.5-25) - moves based on animation time
- Dolly zoom effect during transitions
- Looks at origin (0, 0, 0)

### Performance Optimizations
- Lower detail on mobile
- Fewer spheres on mobile (no transparent spheres)
- Reduced texture sizes
- FFT-based convolution for efficient bloom
- Frustum culling disabled for main objects

## User Interactions

### Mouse
- **Hover**: Spheres repel from mouse cursor
- **Movement**: Creates paint trails in background
- **Speed**: Faster movement = larger paint radius

### Scroll
- **Vertical/Horizontal**: Creates directional paint distortions
- **Offset ratio**: Controls paint intensity
- **Background morphs** with scroll-based color shifts

### Click (Inferred)
- Can trigger color changes for colored spheres
- Balloons get impulse forces
- Background color cycles through palette

## Color Palette
- Primary colors: Blue (#061dfb), Lime (#ADFF00), Red (#f6000e), Purple (#7e09f5), Orange (#ffc000)
- Background: Very dark (#141515)
- Paint effect: Bright blue (#1a2ffb)
- Spheres toggle between colors on interaction

## Animation Feel
The overall effect is:
- **Dreamlike and floating**: Spheres gently orbit the center
- **Interactive and playful**: Responds to mouse and scroll
- **Fluid and organic**: Paint effects add liquid motion
- **Polished and premium**: God rays and bloom add magic
- **Physically plausible**: Realistic collisions and gravity
- **Mesmerizing**: Continuous subtle motion keeps eye engaged

Think of it as "floating balloons in a gravity well with a paintbrush that you control through scrolling and mouse movement, all wrapped in a dreamy glow effect."
