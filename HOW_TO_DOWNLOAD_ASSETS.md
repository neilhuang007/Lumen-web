# How to Download Original Website Assets

## What Assets Are Used?

The original website uses these external files:

### 1. **3D Models (.buf files)**
- **Desktop**: `/assets/models/home/cross.buf`
- **Mobile**: `/assets/models/home/cross_ld.buf` (low detail)

**Purpose**: Custom sphere geometry (`.buf` is a proprietary binary format)
**Do you need it?** ❌ **NO** - The clean animation uses procedural `THREE.SphereGeometry()` which works great!

### 2. **Textures**
- **Matcap Desktop**: `/assets/textures/home/matcap.exr`
- **Matcap Mobile**: `/assets/textures/home/matcap_ld.exr`
- **Blue Noise**: `/assets/textures/LDR_RGB1_0.png`

**Purpose**:
- Matcap textures: Provide realistic material appearance (like chrome, plastic, etc.)
- Blue noise: Used for dithering effects

**Do you need it?** ❌ **NO** - The clean animation uses `MeshStandardMaterial` with Three.js built-in lighting

## How to Download Assets from a Website

If you want to extract these files for reference or higher quality, here's how:

### Method 1: Browser DevTools (Chrome/Edge/Firefox)

1. **Open the original website** in your browser
2. **Open Developer Tools** (F12 or Right-click → Inspect)
3. **Go to the Network tab**
4. **Reload the page** (Ctrl+R or Cmd+R)
5. **Filter by type**:
   - For models: Type `.buf` in the filter box
   - For textures: Type `.exr` or `.png` in the filter box
6. **Find the asset** in the list (look for files matching the paths above)
7. **Right-click on the file** → "Open in new tab" OR "Copy link address"
8. **Download**:
   - If it opens: Right-click → "Save as..."
   - If you copied the link: Use `wget` or `curl` in terminal

### Method 2: Command Line Download

If you know the website URL, you can download directly:

```bash
# Navigate to your assets folder
cd /home/user/Lumen-web/clean-animation/assets

# Download models
mkdir -p models
wget https://WEBSITE_URL/assets/models/home/cross.buf -O models/cross.buf
wget https://WEBSITE_URL/assets/models/home/cross_ld.buf -O models/cross_ld.buf

# Download textures
mkdir -p textures
wget https://WEBSITE_URL/assets/textures/home/matcap.exr -O textures/matcap.exr
wget https://WEBSITE_URL/assets/textures/home/matcap_ld.exr -O textures/matcap_ld.exr
wget https://WEBSITE_URL/assets/textures/LDR_RGB1_0.png -O textures/LDR_RGB1_0.png
```

Replace `WEBSITE_URL` with the actual website domain.

### Method 3: Browser Console Script

Open the browser console (F12 → Console tab) on the original website and run:

```javascript
// This will show you all loaded assets
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('.buf') || r.name.includes('.exr') || r.name.includes('.png'))
  .forEach(r => console.log(r.name));
```

Then you can copy those URLs and download them manually.

## What Format Are These Files?

### .buf Files
- **Custom binary format** used by this specific website
- Contains optimized 3D geometry data (vertices, normals, UVs, indices)
- Can only be loaded with their custom `BufItem` loader class
- **Not needed** - THREE.js can create spheres procedurally

### .exr Files
- **OpenEXR format** - High Dynamic Range (HDR) image format
- Used for matcap (material capture) lighting
- Requires `EXRLoader` from Three.js to load
- **Not needed** - We use standard materials instead

### .png Files
- Standard PNG image format
- The `LDR_RGB1_0.png` is a blue noise texture for dithering
- Can be loaded with standard image loader
- **Not needed** - Optional for advanced effects

## Should You Use The Original Assets?

### Pros:
- ✅ Exactly matches the original website's look
- ✅ Optimized geometry (fewer vertices than procedural)
- ✅ Potentially better material appearance with matcap

### Cons:
- ❌ Requires proprietary loader code
- ❌ Larger file sizes to download
- ❌ More complex setup
- ❌ 404 errors if paths aren't correct

### Recommendation:
**Stick with the procedural version** in `clean-animation/` because:
- ✅ Works immediately with no external dependencies
- ✅ Smaller codebase
- ✅ Easier to customize
- ✅ No file loading errors
- ✅ Perfect spheres guaranteed

If you want the exact original look later, you can always add the assets then!

## Quick Reference

| Asset | Path | Desktop? | Mobile? | Alternative |
|-------|------|----------|---------|-------------|
| Sphere Model | `/assets/models/home/cross.buf` | ✅ | ❌ | `THREE.SphereGeometry(1, 32, 32)` |
| Sphere Model LD | `/assets/models/home/cross_ld.buf` | ❌ | ✅ | `THREE.SphereGeometry(1, 16, 16)` |
| Matcap Texture | `/assets/textures/home/matcap.exr` | ✅ | ❌ | `MeshStandardMaterial` |
| Matcap Texture LD | `/assets/textures/home/matcap_ld.exr` | ❌ | ✅ | `MeshStandardMaterial` |
| Blue Noise | `/assets/textures/LDR_RGB1_0.png` | ✅ | ✅ | Not needed for basic version |

**Bottom line**: The clean animation in `clean-animation/` works great without any of these files!
