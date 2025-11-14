/**
 * Post Effects - Simplified version without external post-processing dependencies
 * Renders directly to screen for maximum compatibility
 */

import * as THREE from 'three';

export class PostEffects {
  constructor(renderer, config) {
    this.renderer = renderer;
    this.config = config;
  }

  /**
   * Initialize post-processing pipeline
   * Simplified version - renders directly without complex post-processing
   */
  init(scene, camera) {
    console.log('Post Effects initialized (simplified direct rendering)');
    // Using direct rendering for better compatibility
    // Complex post-processing can be added later if needed
  }

  /**
   * Render the scene
   */
  render(scene, camera, paintEffect) {
    // Direct render without post-processing
    this.renderer.render(scene, camera);
  }

  /**
   * Handle resize
   */
  resize() {
    // No additional resize handling needed in direct render mode
  }

  /**
   * Cleanup resources
   */
  dispose() {
    // No resources to cleanup in direct render mode
  }
}
