// Debug script to help identify canvas rendering issues
console.log('[DEBUG] Debug script loaded');

// Check if canvas exists and is visible
setTimeout(() => {
  const canvas = document.getElementById('canvas');
  console.log('[DEBUG] Canvas element:', canvas);
  
  if (canvas) {
    const styles = window.getComputedStyle(canvas);
    console.log('[DEBUG] Canvas display:', styles.display);
    console.log('[DEBUG] Canvas width:', canvas.width, 'height:', canvas.height);
    console.log('[DEBUG] Canvas client width:', canvas.clientWidth, 'client height:', canvas.clientHeight);
    console.log('[DEBUG] Canvas visibility:', styles.visibility);
    console.log('[DEBUG] Canvas opacity:', styles.opacity);
    
    // Check WebGL context
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2') || canvas.getContext('experimental-webgl');
    if (gl) {
      console.log('[DEBUG] WebGL context created successfully');
      console.log('[DEBUG] WebGL renderer:', gl.getParameter(gl.RENDERER));
      console.log('[DEBUG] WebGL vendor:', gl.getParameter(gl.VENDOR));
    } else {
      console.error('[DEBUG] Failed to create WebGL context');
    }
  } else {
    console.error('[DEBUG] Canvas element not found');
  }
  
  // Check if is-ready class is added
  console.log('[DEBUG] HTML classes:', document.documentElement.className);
  console.log('[DEBUG] Has is-ready class:', document.documentElement.classList.contains('is-ready'));
  
  // Check if there are any JavaScript errors
  console.log('[DEBUG] Checking for errors...');
}, 2000);

// Force add is-ready class if it's not there after 3 seconds
setTimeout(() => {
  if (!document.documentElement.classList.contains('is-ready')) {
    console.warn('[DEBUG] is-ready class not found, forcing add...');
    document.documentElement.classList.add('is-ready');
  }
}, 3000);
