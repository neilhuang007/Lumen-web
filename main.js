import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ===========================
// BOID CLASS
// ===========================
class Boid {
    constructor(scene, bounds = 15) {
        this.bounds = bounds;
        this.position = new THREE.Vector3(
            (Math.random() - 0.5) * bounds * 0.5,
            (Math.random() - 0.5) * bounds * 0.5,
            (Math.random() - 0.5) * bounds * 0.5
        );
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5
        );
        this.acceleration = new THREE.Vector3(0, 0, 0);
        this.maxSpeed = 0.15;
        this.maxForce = 0.005;

        // Varied sizes for each boid
        this.size = 0.08 + Math.random() * 0.12;

        // Create particle with glow material
        const geometry = new THREE.SphereGeometry(this.size, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0xffffff),
            transparent: true,
            opacity: 0.8 + Math.random() * 0.2,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        scene.add(this.mesh);
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
        const perceptionRadius = 1.5;
        let steering = new THREE.Vector3();
        let total = 0;

        for (let other of boids) {
            const d = this.position.distanceTo(other.position);
            if (other !== this && d < perceptionRadius) {
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

    // Pull boids toward center to maintain cluster
    centerAttraction() {
        const center = new THREE.Vector3(0, 0, 0);
        const steering = new THREE.Vector3().subVectors(center, this.position);
        const distance = steering.length();

        // Stronger pull when further from center
        const strength = Math.min(distance / this.bounds, 1) * 0.003;
        steering.normalize();
        steering.multiplyScalar(strength);

        return steering;
    }

    // Add turbulence for organic movement
    turbulence(time) {
        const turbulence = new THREE.Vector3(
            Math.sin(time * 0.5 + this.position.x) * 0.001,
            Math.cos(time * 0.7 + this.position.y) * 0.001,
            Math.sin(time * 0.6 + this.position.z) * 0.001
        );
        return turbulence;
    }

    update(boids, time) {
        this.acceleration.set(0, 0, 0);

        const alignment = this.align(boids);
        const cohesion = this.cohesion(boids);
        const separation = this.separation(boids);
        const center = this.centerAttraction();
        const turb = this.turbulence(time);

        // Apply forces with different weights
        alignment.multiplyScalar(1.2);
        cohesion.multiplyScalar(1.0);
        separation.multiplyScalar(1.5);
        center.multiplyScalar(2.0);

        this.acceleration.add(alignment);
        this.acceleration.add(cohesion);
        this.acceleration.add(separation);
        this.acceleration.add(center);
        this.acceleration.add(turb);

        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0, this.maxSpeed);
        this.position.add(this.velocity);

        // Update mesh position
        this.mesh.position.copy(this.position);

        // Animate opacity for pulsating effect
        const pulse = 0.6 + Math.sin(time * 2 + this.position.x * 10) * 0.2;
        this.mesh.material.opacity = pulse;
    }
}

// ===========================
// SCENE SETUP
// ===========================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.015);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.z = 15;
camera.position.y = 2;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ===========================
// STARFIELD BACKGROUND
// ===========================
function createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 5000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
        // Distribute stars in a sphere
        const radius = 100 + Math.random() * 200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);

        // Slight color variation (blue-white stars)
        const brightness = 0.5 + Math.random() * 0.5;
        colors[i * 3] = brightness;
        colors[i * 3 + 1] = brightness;
        colors[i * 3 + 2] = brightness + Math.random() * 0.2;

        sizes[i] = Math.random() * 1.5;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMaterial = new THREE.PointsMaterial({
        size: 0.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
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
    const godRayGeometry = new THREE.ConeGeometry(8, 20, 32, 1, true);
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

                // Fade from center to edges
                float fadeX = 1.0 - abs(vUv.x - 0.5) * 2.0;
                fadeX = pow(fadeX, 2.0);

                // Animated rays
                float rays = sin(vUv.x * 30.0 + uTime * 2.0) * 0.5 + 0.5;
                rays = pow(rays, 3.0) * 0.3;

                float alpha = fadeY * fadeX * (0.08 + rays);

                vec3 color = vec3(1.0, 1.0, 0.95);
                gl_FragColor = vec4(color, alpha);
            }
        `
    });

    const godRay = new THREE.Mesh(godRayGeometry, godRayMaterial);
    godRay.position.y = -10;
    godRay.rotation.x = Math.PI;
    scene.add(godRay);
    return godRay;
}

const godRay = createGodRay();

// ===========================
// AMBIENT LIGHT
// ===========================
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 2, 50);
pointLight.position.set(0, -5, 0);
scene.add(pointLight);

// ===========================
// BOIDS INITIALIZATION
// ===========================
const boids = [];
const boidCount = 2000;

for (let i = 0; i < boidCount; i++) {
    boids.push(new Boid(scene));
}

// ===========================
// POST-PROCESSING (BLOOM)
// ===========================
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,  // strength
    0.8,  // radius
    0.3   // threshold
);
composer.addPass(bloomPass);

// ===========================
// ANIMATION LOOP
// ===========================
let time = 0;

function animate() {
    requestAnimationFrame(animate);
    time += 0.01;

    // Update boids
    for (let boid of boids) {
        boid.update(boids, time);
    }

    // Update god-ray animation
    godRay.material.uniforms.uTime.value = time;

    // Gentle camera rotation
    camera.position.x = Math.sin(time * 0.1) * 2;
    camera.lookAt(0, 0, 0);

    // Slowly rotate starfield
    starfield.rotation.y += 0.0001;
    starfield.rotation.x += 0.00005;

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

// Start animation
animate();
