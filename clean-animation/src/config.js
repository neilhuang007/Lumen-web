/**
 * Configuration for Floating Spheres Animation
 * Adjust these values to customize the animation behavior and appearance
 */

export const CONFIG = {
  // === SPHERE CONFIGURATION ===
  spheres: {
    // Color palette - one will be randomly selected at startup
    colorPalette: [
      '#061dfb', // Blue
      '#ADFF00', // Lime green
      '#f6000e', // Red
      '#7e09f5', // Purple
      '#ffc000'  // Orange
    ],

    // Sphere counts by type
    counts: {
      coloredMatte: 3,      // Colored spheres with matte finish
      coloredGlossy: 3,     // Colored spheres with glossy finish
      whiteMatte: 3,        // White matte spheres
      whiteGlossy: 3,       // White glossy spheres
      blackMatte: 4,        // Black/stone spheres
      blackGlossy: 2,       // Black glossy spheres
      transparentWhite: 1,  // Glass-like white (desktop only)
      transparentTinted: 1  // Glass-like tinted (desktop only)
    },

    // Base radius for all spheres
    baseRadius: 1.0,
    radiusVariation: 0.05  // ±5% variation
  },

  // === PHYSICS PARAMETERS ===
  physics: {
    gravity: {
      enabled: true,
      factor: 40,              // Strength of gravity toward center
      centerPoint: [0, 0, 0]   // Center of gravity well
    },

    collisions: {
      enabled: true,
      damping: 0.5             // Energy loss on collision
    },

    materials: {
      softPlastic: {
        density: 1.0,
        friction: 2.0,
        restitution: 0.8       // Bounciness (0-1)
      },
      hardPlastic: {
        density: 1.0,
        friction: 2.0,
        restitution: 0.8
      },
      glass: {
        density: 1.0,
        friction: 2.0,
        restitution: 0.8
      },
      stone: {
        density: 1.0,
        friction: 2.0,
        restitution: 0.8
      }
    },

    mouse: {
      enabled: true,
      influenceRadius: 0.025,  // Mouse repulsion radius
      pushForce: 0.12,         // Strength of mouse push
      dragForce: 0.1           // Additional drag on fast mouse
    },

    damping: {
      velocity: 0.2,           // Air resistance
      acceleration: 0.8        // Friction dissipation rate
    },

    initialConditions: {
      positionSpread: 12,      // Initial random position range
      velocityFactor: -2       // Velocity = position * factor
    }
  },

  // === RENDERING SETTINGS ===
  rendering: {
    camera: {
      fov: 25,                    // Field of view in degrees
      near: 0.1,
      far: 2000,
      position: [0, 0, 17.5],     // Starting camera position
      lookAt: [0, 0, 0]
    },

    materials: {
      roughness: {
        matte: 0.8,
        glossy: 0.1
      },
      subsurfaceScattering: 0,    // SSS strength
      sssColor: '#111'             // SSS color
    },

    background: {
      color: '#141515',            // Very dark background
      clearAlpha: 0
    },

    shadows: false,                // Shadows disabled for performance
    antialias: true,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
  },

  // === PAINT EFFECT SETTINGS ===
  paintEffect: {
    enabled: true,

    brush: {
      minRadius: 0,
      maxRadius: 100,            // Max brush size
      radiusDistanceRange: 100   // Distance for radius calculation
    },

    fluid: {
      pushStrength: 25,
      velocityDissipation: 0.985,
      accelerationDissipation: 0.8,
      weight1Dissipation: 0.985,
      weight2Dissipation: 0.5
    },

    noise: {
      enabled: false,            // Curl noise
      scale: 0.1,
      strength: 5
    },

    scroll: {
      enabled: true,
      offsetRatio: 1.0          // Scroll sensitivity
    },

    blur: {
      iterations: 8,
      strength: 1.0
    },

    distortion: {
      amount: 20,
      rgbShift: 1,
      multiplier: 1.25,
      colorMultiplier: 1,
      shade: 1.25
    },

    color: '#1a2ffb'             // Bright blue paint color
  },

  // === POST-PROCESSING EFFECTS ===
  postEffects: {
    bloom: {
      enabled: false, // Disabled in simplified version
      amount: 1.0,
      radius: 0,
      threshold: 0.1,
      smoothWidth: 1,

      godRays: {
        enabled: true,
        haloWidth: 0.8,
        haloRGBShift: 0.03,
        haloStrength: 0.21,
        haloMaskInner: 0.3,
        haloMaskOuter: 0.5
      },

      useConvolution: true,      // FFT-based bloom (better quality)
      useHD: true,               // Higher resolution
      saturation: 1.0
    },

    vignette: {
      enabled: true,
      from: 0.6,
      to: 1.6,
      color: '#000000'
    },

    colorGrading: {
      saturation: 1.0,
      contrast: 0.0,
      brightness: 1.0,
      tintColor: '#ffffff',
      tintOpacity: 0
    },

    fsr: {
      enabled: false,            // AMD FidelityFX Super Resolution
      sharpness: 1.0
    }
  },

  // === PERFORMANCE SETTINGS ===
  performance: {
    mobile: {
      reducedSphereCount: true,
      noTransparentSpheres: true,
      lowerTextureQuality: true,
      reducedBloomQuality: true,
      targetFPS: 30
    },

    desktop: {
      targetFPS: 60
    },

    autoQuality: true,           // Auto-adjust based on FPS
    fpsCheckInterval: 2000       // Check FPS every 2 seconds
  },

  // === ASSET PATHS ===
  // Assets are optional - animation uses procedural geometry if not available
  assets: {
    useExternalAssets: true, // Set to true to use custom models/textures
    textures: {
      matcap: 'assets/textures/matcap.exr',
      matcapMobile: 'assets/textures/matcap_ld.exr',
      blueNoise: 'assets/textures/LDR_RGB1_0.png'
    },
    models: {
      // Using sphere models - different sizes for different detail levels
      sphere: 'assets/models/sphere_l.buf',      // Desktop: Large (highest detail)
      sphereMobile: 'assets/models/sphere_m.buf' // Mobile: Medium detail
    }
  }
};

// Helper function to check if device is mobile
export function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Get effective config based on device
export function getEffectiveConfig() {
  const config = { ...CONFIG };

  if (isMobile()) {
    // Reduce sphere counts
    if (config.performance.mobile.reducedSphereCount) {
      Object.keys(config.spheres.counts).forEach(key => {
        config.spheres.counts[key] = Math.max(1, Math.floor(config.spheres.counts[key] / 2));
      });
    }

    // Disable transparent spheres on mobile
    if (config.performance.mobile.noTransparentSpheres) {
      config.spheres.counts.transparentWhite = 0;
      config.spheres.counts.transparentTinted = 0;
    }

    // Use lower quality assets
    if (config.performance.mobile.lowerTextureQuality) {
      config.assets.textures.matcap = config.assets.textures.matcapMobile;
      config.assets.models.sphere = config.assets.models.sphereMobile;
    }

  }

  return config;
}
