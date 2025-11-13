import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ===========================
// SIMPLEX NOISE (for Curl Noise)
// ===========================
// Simplified 3D Simplex Noise implementation
class SimplexNoise {
    constructor() {
        this.grad3 = [
            [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
            [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
            [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
        ];
        this.p = [];
        for(let i = 0; i < 256; i++) {
            this.p[i] = Math.floor(Math.random() * 256);
        }
        this.perm = [];
        for(let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
        }
    }

    dot(g, x, y, z) {
        return g[0] * x + g[1] * y + g[2] * z;
    }

    noise(xin, yin, zin) {
        const F3 = 1.0 / 3.0;
        const G3 = 1.0 / 6.0;

        let n0, n1, n2, n3;

        const s = (xin + yin + zin) * F3;
        const i = Math.floor(xin + s);
        const j = Math.floor(yin + s);
        const k = Math.floor(zin + s);

        const t = (i + j + k) * G3;
        const X0 = i - t;
        const Y0 = j - t;
        const Z0 = k - t;
        const x0 = xin - X0;
        const y0 = yin - Y0;
        const z0 = zin - Z0;

        let i1, j1, k1;
        let i2, j2, k2;

        if(x0 >= y0) {
            if(y0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; }
            else if(x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; }
            else { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }
        } else {
            if(y0 < z0) { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; }
            else if(x0 < z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; }
            else { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; }
        }

        const x1 = x0 - i1 + G3;
        const y1 = y0 - j1 + G3;
        const z1 = z0 - k1 + G3;
        const x2 = x0 - i2 + 2.0 * G3;
        const y2 = y0 - j2 + 2.0 * G3;
        const z2 = z0 - k2 + 2.0 * G3;
        const x3 = x0 - 1.0 + 3.0 * G3;
        const y3 = y0 - 1.0 + 3.0 * G3;
        const z3 = z0 - 1.0 + 3.0 * G3;

        const ii = i & 255;
        const jj = j & 255;
        const kk = k & 255;

        const gi0 = this.perm[ii + this.perm[jj + this.perm[kk]]] % 12;
        const gi1 = this.perm[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]] % 12;
        const gi2 = this.perm[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]] % 12;
        const gi3 = this.perm[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]] % 12;

        let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
        if(t0 < 0) n0 = 0.0;
        else {
            t0 *= t0;
            n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0, z0);
        }

        let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
        if(t1 < 0) n1 = 0.0;
        else {
            t1 *= t1;
            n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1, z1);
        }

        let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
        if(t2 < 0) n2 = 0.0;
        else {
            t2 *= t2;
            n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2, z2);
        }

        let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
        if(t3 < 0) n3 = 0.0;
        else {
            t3 *= t3;
            n3 = t3 * t3 * this.dot(this.grad3[gi3], x3, y3, z3);
        }

        return 32.0 * (n0 + n1 + n2 + n3);
    }
}

const simplex = new SimplexNoise();

// Curl Noise function - creates divergence-free flow field
function curlNoise(x, y, z, time, scale = 1.0, strength = 1.0) {
    const eps = 0.01;
    const s = scale;
    const t = time * 0.1;

    // Get noise derivatives to compute curl
    // curl = (dFz/dy - dFy/dz, dFx/dz - dFz/dx, dFy/dx - dFx/dy)

    const n1 = simplex.noise(x * s, y * s + eps, z * s + t);
    const n2 = simplex.noise(x * s, y * s - eps, z * s + t);
    const a = (n1 - n2) / (2 * eps);

    const n3 = simplex.noise(x * s, y * s, z * s + eps + t);
    const n4 = simplex.noise(x * s, y * s, z * s - eps + t);
    const b = (n3 - n4) / (2 * eps);

    const n5 = simplex.noise(x * s + eps, y * s, z * s + t);
    const n6 = simplex.noise(x * s - eps, y * s, z * s + t);
    const c = (n5 - n6) / (2 * eps);

    const n7 = simplex.noise(x * s, y * s, z * s + eps + t);
    const n8 = simplex.noise(x * s, y * s, z * s - eps + t);
    const d = (n7 - n8) / (2 * eps);

    const n9 = simplex.noise(x * s + eps, y * s, z * s + t);
    const n10 = simplex.noise(x * s - eps, y * s, z * s + t);
    const e = (n9 - n10) / (2 * eps);

    const n11 = simplex.noise(x * s, y * s + eps, z * s + t);
    const n12 = simplex.noise(x * s, y * s - eps, z * s + t);
    const f = (n11 - n12) / (2 * eps);

    const curl_x = a - b;
    const curl_y = d - c;
    const curl_z = e - f;

    return new THREE.Vector3(curl_x, curl_y, curl_z).multiplyScalar(strength);
}

// ===========================
// BOID CLASS
// ===========================
class Boid {
    constructor(scene, bounds = 12) {
        this.bounds = bounds;
        this.position = new THREE.Vector3(
            (Math.random() - 0.5) * bounds * 0.8,
            (Math.random() - 0.5) * bounds * 0.8,
            (Math.random() - 0.5) * bounds * 0.8
        );
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 2.0,
            (Math.random() - 0.5) * 2.0,
            (Math.random() - 0.5) * 2.0
        );
        this.acceleration = new THREE.Vector3(0, 0, 0);

        // Rotation for tumbling effect
        this.rotation = new THREE.Euler(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );
        this.angularVelocity = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        );

        // Fast movement
        this.maxSpeed = 1.0;
        this.maxForce = 0.06;

        // Varied sizes for each boid
        this.size = 0.06 + Math.random() * 0.14;

        // Random phase for animation
        this.phase = Math.random() * Math.PI * 2;

        // Create particle with EMISSIVE material for glow
        const geometry = new THREE.SphereGeometry(this.size, 12, 12);
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 2.5,
            transparent: true,
            opacity: 0.9,
            roughness: 0.3,
            metalness: 0.1
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.rotation.copy(this.rotation);
        scene.add(this.mesh);

        // Add individual point light for stronger glow effect (only for some boids)
        if (Math.random() > 0.85) {
            this.light = new THREE.PointLight(0xffffff, 1.2, 3);
            this.light.position.copy(this.position);
            scene.add(this.light);
        }
    }

    // Boid flocking rules
    align(boids) {
        const perceptionRadius = 2.5;
        let steering = new THREE.Vector3();
        let total = 0;

        for (let other of boids) {
            const d = this.position.distanceTo(other.position);
            if (other !== this && d < perceptionRadius) {
                steering.add(other.velocity);
                total++;
            }
        }

        if (total > 0) {
            steering.divideScalar(total);
            steering.setLength(this.maxSpeed);
            steering.sub(this.velocity);
            steering.clampLength(0, this.maxForce);
        }

        return steering;
    }

    cohesion(boids) {
        const perceptionRadius = 3.5;
        let steering = new THREE.Vector3();
        let total = 0;

        for (let other of boids) {
            const d = this.position.distanceTo(other.position);
            if (other !== this && d < perceptionRadius) {
                steering.add(other.position);
                total++;
            }
        }

        if (total > 0) {
            steering.divideScalar(total);
            steering.sub(this.position);
            steering.setLength(this.maxSpeed);
            steering.sub(this.velocity);
            steering.clampLength(0, this.maxForce);
        }

        return steering;
    }

    separation(boids) {
        const perceptionRadius = 1.2;
        let steering = new THREE.Vector3();
        let total = 0;

        for (let other of boids) {
            const d = this.position.distanceTo(other.position);
            if (other !== this && d < perceptionRadius && d > 0) {
                let diff = new THREE.Vector3().subVectors(this.position, other.position);
                diff.divideScalar(d * d);
                steering.add(diff);
                total++;
            }
        }

        if (total > 0) {
            steering.divideScalar(total);
            steering.setLength(this.maxSpeed);
            steering.sub(this.velocity);
            steering.clampLength(0, this.maxForce);
        }

        return steering;
    }

    // Pull toward center to maintain cluster
    centerAttraction() {
        const center = new THREE.Vector3(0, 0, 0);
        const toCenter = new THREE.Vector3().subVectors(center, this.position);
        const distance = toCenter.length();

        // Strong pull when further from center
        const pullStrength = Math.pow(distance / this.bounds, 2) * 0.05;
        return toCenter.normalize().multiplyScalar(pullStrength);
    }

    // Curl noise for organic tumbling in all directions
    curlForce(time) {
        const scale = 0.3;
        const strength = 0.08;
        return curlNoise(
            this.position.x,
            this.position.y,
            this.position.z,
            time,
            scale,
            strength
        );
    }

    // Additional vortex force around center
    vortexForce(time) {
        const center = new THREE.Vector3(0, 0, 0);
        const toCenter = new THREE.Vector3().subVectors(center, this.position);
        const distance = toCenter.length();

        if (distance < 0.1) return new THREE.Vector3(0, 0, 0);

        // Create tangent for swirling
        const tangent = new THREE.Vector3();
        tangent.crossVectors(toCenter, new THREE.Vector3(0, 1, 0));

        if (tangent.length() < 0.01) {
            tangent.crossVectors(toCenter, new THREE.Vector3(1, 0, 0));
        }

        tangent.normalize();

        // Rotate tangent for spiraling
        const spiralAngle = time * 0.5 + this.phase;
        tangent.applyAxisAngle(toCenter.normalize(), spiralAngle);

        // Vary strength by distance
        const swirlStrength = Math.min(distance / this.bounds, 1) * 0.03;
        return tangent.multiplyScalar(swirlStrength);
    }

    update(boids, time) {
        this.acceleration.set(0, 0, 0);

        const alignment = this.align(boids);
        const cohesion = this.cohesion(boids);
        const separation = this.separation(boids);
        const center = this.centerAttraction();
        const curl = this.curlForce(time);
        const vortex = this.vortexForce(time);

        // Apply forces with weights
        alignment.multiplyScalar(1.2);
        cohesion.multiplyScalar(2.5);
        separation.multiplyScalar(2.0);
        center.multiplyScalar(3.0);
        curl.multiplyScalar(4.0);  // Strong curl for tumbling
        vortex.multiplyScalar(2.0);

        this.acceleration.add(alignment);
        this.acceleration.add(cohesion);
        this.acceleration.add(separation);
        this.acceleration.add(center);
        this.acceleration.add(curl);
        this.acceleration.add(vortex);

        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0, this.maxSpeed);
        this.position.add(this.velocity);

        // Update angular velocity based on velocity and curl
        const angularAccel = new THREE.Vector3(
            curl.z * 0.5,
            curl.x * 0.5,
            curl.y * 0.5
        );
        this.angularVelocity.add(angularAccel);
        this.angularVelocity.clampLength(0, 0.2);

        // Apply rotation for tumbling effect
        this.rotation.x += this.angularVelocity.x * 0.016;
        this.rotation.y += this.angularVelocity.y * 0.016;
        this.rotation.z += this.angularVelocity.z * 0.016;

        // Update mesh
        this.mesh.position.copy(this.position);
        this.mesh.rotation.copy(this.rotation);

        // Update light position if this boid has one
        if (this.light) {
            this.light.position.copy(this.position);
        }

        // Animate intensity for pulsating glow effect
        const distance = this.position.length();
        const coreBrightness = 1.0 - Math.min(distance / (this.bounds * 0.5), 1.0);
        const pulse = 0.7 + Math.sin(time * 3 + this.phase) * 0.3;

        this.mesh.material.emissiveIntensity = (1.5 + coreBrightness * 2.0) * pulse;
        this.mesh.material.opacity = 0.85 + pulse * 0.15;

        if (this.light) {
            this.light.intensity = (0.8 + coreBrightness * 1.5) * pulse;
        }
    }

    dispose() {
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}

// ===========================
// SCENE SETUP
// ===========================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.02);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.z = 18;
camera.position.y = 3;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// ===========================
// STARFIELD BACKGROUND
// ===========================
function createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 6000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
        const radius = 100 + Math.random() * 250;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);

        const brightness = 0.4 + Math.random() * 0.6;
        colors[i * 3] = brightness * 0.95;
        colors[i * 3 + 1] = brightness * 0.98;
        colors[i * 3 + 2] = brightness * 1.0;

        sizes[i] = Math.random() * 2.0;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMaterial = new THREE.PointsMaterial({
        size: 0.6,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    return stars;
}

const starfield = createStarfield();

// ===========================
// GOD-RAY BEAM
// ===========================
function createGodRay() {
    const godRayGeometry = new THREE.ConeGeometry(10, 25, 32, 1, true);
    const godRayMaterial = new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        uniforms: {
            uTime: { value: 0 }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vPosition;

            void main() {
                vUv = uv;
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            varying vec2 vUv;
            varying vec3 vPosition;

            void main() {
                float fadeY = 1.0 - smoothstep(0.0, 1.0, vUv.y);
                fadeY = pow(fadeY, 1.5);

                float fadeX = 1.0 - abs(vUv.x - 0.5) * 2.0;
                fadeX = pow(fadeX, 3.0);

                float rays1 = sin(vUv.x * 40.0 + uTime * 3.0) * 0.5 + 0.5;
                float rays2 = sin(vUv.x * 25.0 - uTime * 2.0 + 1.5) * 0.5 + 0.5;
                float rays = (rays1 + rays2) * 0.5;
                rays = pow(rays, 4.0) * 0.4;

                float fog = sin(vUv.y * 10.0 + uTime) * 0.5 + 0.5;
                fog = fog * 0.15;

                float alpha = fadeY * fadeX * (0.12 + rays + fog);

                vec3 color = vec3(1.0, 0.98, 0.92);
                gl_FragColor = vec4(color, alpha);
            }
        `
    });

    const godRay = new THREE.Mesh(godRayGeometry, godRayMaterial);
    godRay.position.y = -12;
    godRay.rotation.x = Math.PI;
    scene.add(godRay);
    return godRay;
}

const godRay = createGodRay();

// ===========================
// LIGHTING
// ===========================
const ambientLight = new THREE.AmbientLight(0x222244, 0.3);
scene.add(ambientLight);

const mainLight = new THREE.PointLight(0xffffff, 3, 60);
mainLight.position.set(0, -8, 0);
scene.add(mainLight);

const rimLight1 = new THREE.PointLight(0x4466ff, 1, 40);
rimLight1.position.set(10, 5, 10);
scene.add(rimLight1);

const rimLight2 = new THREE.PointLight(0xff6644, 0.8, 40);
rimLight2.position.set(-10, 5, -10);
scene.add(rimLight2);

// ===========================
// BOIDS INITIALIZATION
// ===========================
const boids = [];
const boidCount = 2000;

console.log('Initializing boids with curl noise...');
for (let i = 0; i < boidCount; i++) {
    boids.push(new Boid(scene));
}
console.log(`${boidCount} boids created`);

// ===========================
// POST-PROCESSING (BLOOM)
// ===========================
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    2.0,
    1.0,
    0.1
);
composer.addPass(bloomPass);

// ===========================
// ANIMATION LOOP
// ===========================
let time = 0;

function animate() {
    requestAnimationFrame(animate);
    time += 0.016;

    // Update boids with curl noise tumbling
    for (let boid of boids) {
        boid.update(boids, time);
    }

    godRay.material.uniforms.uTime.value = time;

    const cameraSpeed = 0.08;
    camera.position.x = Math.sin(time * cameraSpeed) * 3;
    camera.position.z = 18 + Math.cos(time * cameraSpeed) * 2;
    camera.lookAt(0, 0, 0);

    starfield.rotation.y += 0.00015;
    starfield.rotation.x += 0.00008;

    rimLight1.intensity = 1.0 + Math.sin(time * 0.5) * 0.3;
    rimLight2.intensity = 0.8 + Math.cos(time * 0.7) * 0.3;

    composer.render();
}

// ===========================
// WINDOW RESIZE
// ===========================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// ===========================
// CLEANUP
// ===========================
window.addEventListener('beforeunload', () => {
    for (let boid of boids) {
        boid.dispose();
    }
});

console.log('Starting animation with curl noise tumbling...');
animate();
