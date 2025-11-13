import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

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

        // Much faster movement
        this.maxSpeed = 0.8;
        this.maxForce = 0.05;

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
        scene.add(this.mesh);

        // Add individual point light for stronger glow effect (only for some boids to save performance)
        if (Math.random() > 0.85) {
            this.light = new THREE.PointLight(0xffffff, 1.2, 3);
            this.light.position.copy(this.position);
            scene.add(this.light);
        }
    }

    // Boid flocking rules
    align(boids) {
        const perceptionRadius = 2.0;
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
        const perceptionRadius = 3.0;
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

    // Strong pull toward center with VORTEX/TUMBLING motion
    vortexAttraction(time) {
        const center = new THREE.Vector3(0, 0, 0);
        const toCenter = new THREE.Vector3().subVectors(center, this.position);
        const distance = toCenter.length();

        // Very strong pull when further from center
        const pullStrength = Math.pow(distance / this.bounds, 2) * 0.08;

        // Normalize and apply pull
        const pull = toCenter.normalize().multiplyScalar(pullStrength);

        // Add SWIRLING/TUMBLING force (perpendicular to the center direction)
        const tangent = new THREE.Vector3();
        tangent.crossVectors(toCenter, new THREE.Vector3(0, 1, 0));

        // If tangent is zero (position aligned with y-axis), use different axis
        if (tangent.length() < 0.01) {
            tangent.crossVectors(toCenter, new THREE.Vector3(1, 0, 0));
        }
        tangent.normalize();

        // Rotate tangent around toCenter axis for spiraling effect
        const spiralAngle = time * 0.5 + this.phase;
        const spiralAxis = toCenter.normalize();
        tangent.applyAxisAngle(spiralAxis, spiralAngle);

        // Add swirl force (stronger when further from center)
        const swirlStrength = Math.min(distance / this.bounds, 1) * 0.04;
        const swirl = tangent.multiplyScalar(swirlStrength);

        // Combine pull and swirl for tumbling effect
        return pull.add(swirl);
    }

    // Dynamic turbulence for chaotic tumbling
    turbulence(time) {
        const frequency = 2.0;
        const amplitude = 0.015;

        const turbulence = new THREE.Vector3(
            Math.sin(time * frequency + this.position.x * 2 + this.phase) * amplitude,
            Math.cos(time * frequency * 1.3 + this.position.y * 2 + this.phase) * amplitude,
            Math.sin(time * frequency * 0.8 + this.position.z * 2 + this.phase) * amplitude
        );

        // Add rotational chaos
        const distance = this.position.length();
        const chaosStrength = Math.min(distance / this.bounds, 1) * 0.02;
        turbulence.multiplyScalar(1 + chaosStrength);

        return turbulence;
    }

    update(boids, time) {
        this.acceleration.set(0, 0, 0);

        const alignment = this.align(boids);
        const cohesion = this.cohesion(boids);
        const separation = this.separation(boids);
        const vortex = this.vortexAttraction(time);
        const turb = this.turbulence(time);

        // Apply forces with weights (vortex is dominant for tumbling)
        alignment.multiplyScalar(1.5);
        cohesion.multiplyScalar(2.0);
        separation.multiplyScalar(2.5);
        vortex.multiplyScalar(5.0);  // Strong tumbling force
        turb.multiplyScalar(1.2);

        this.acceleration.add(alignment);
        this.acceleration.add(cohesion);
        this.acceleration.add(separation);
        this.acceleration.add(vortex);
        this.acceleration.add(turb);

        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0, this.maxSpeed);
        this.position.add(this.velocity);

        // Update mesh position
        this.mesh.position.copy(this.position);

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
        if (this.light) {
            // Lights don't need disposal, just remove from scene
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
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit for performance
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
        // Distribute stars in a sphere
        const radius = 100 + Math.random() * 250;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);

        // Slight color variation (blue-white stars)
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
// GOD-RAY BEAM (Enhanced)
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
                // Fade from bottom to top
                float fadeY = 1.0 - smoothstep(0.0, 1.0, vUv.y);
                fadeY = pow(fadeY, 1.5);

                // Fade from center to edges
                float fadeX = 1.0 - abs(vUv.x - 0.5) * 2.0;
                fadeX = pow(fadeX, 3.0);

                // Animated rotating rays
                float rays1 = sin(vUv.x * 40.0 + uTime * 3.0) * 0.5 + 0.5;
                float rays2 = sin(vUv.x * 25.0 - uTime * 2.0 + 1.5) * 0.5 + 0.5;
                float rays = (rays1 + rays2) * 0.5;
                rays = pow(rays, 4.0) * 0.4;

                // Volumetric fog-like effect
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

// Main light from below (for god-ray effect)
const mainLight = new THREE.PointLight(0xffffff, 3, 60);
mainLight.position.set(0, -8, 0);
scene.add(mainLight);

// Subtle rim lights for depth
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

console.log('Initializing boids...');
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
    2.0,   // strength (increased for more glow)
    1.0,   // radius
    0.1    // threshold (lower = more things glow)
);
composer.addPass(bloomPass);

// ===========================
// ANIMATION LOOP
// ===========================
let time = 0;

function animate() {
    requestAnimationFrame(animate);
    time += 0.016; // ~60fps delta

    // Update boids with fast tumbling motion
    for (let boid of boids) {
        boid.update(boids, time);
    }

    // Update god-ray animation
    godRay.material.uniforms.uTime.value = time;

    // Gentle camera orbit
    const cameraSpeed = 0.08;
    camera.position.x = Math.sin(time * cameraSpeed) * 3;
    camera.position.z = 18 + Math.cos(time * cameraSpeed) * 2;
    camera.lookAt(0, 0, 0);

    // Slowly rotate starfield
    starfield.rotation.y += 0.00015;
    starfield.rotation.x += 0.00008;

    // Pulse the rim lights subtly
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

// Start animation
console.log('Starting animation...');
animate();
