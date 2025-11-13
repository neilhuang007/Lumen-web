import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Configuration
const CONFIG = {
    boidCount: 500,
    sphereRadius: 5,
    maxSpeed: 0.02,
    maxForce: 0.001,
    perceptionRadius: 1.5,
    separationDistance: 0.5,
    cohesionForce: 0.5,
    separationForce: 1.0,
    alignmentForce: 0.5,
    mouseInfluence: 2.0,
    trailLength: 30
};

class Boid {
    constructor(radius) {
        this.radius = radius;

        // Random position on sphere
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);

        this.position = new THREE.Vector3(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.sin(phi) * Math.sin(theta),
            radius * Math.cos(phi)
        );

        // Random velocity tangent to sphere
        this.velocity = this.getRandomTangentVector();
        this.velocity.normalize().multiplyScalar(CONFIG.maxSpeed * 0.5);

        this.acceleration = new THREE.Vector3();
        this.trail = [];
    }

    getRandomTangentVector() {
        const normal = this.position.clone().normalize();
        const randomDir = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();

        // Project onto tangent plane
        const tangent = randomDir.sub(normal.multiplyScalar(randomDir.dot(normal)));
        return tangent.normalize();
    }

    edges() {
        // Keep boid on sphere surface
        this.position.normalize().multiplyScalar(this.radius);
    }

    align(boids) {
        const steering = new THREE.Vector3();
        let total = 0;

        for (const other of boids) {
            const d = this.position.distanceTo(other.position);
            if (other !== this && d < CONFIG.perceptionRadius) {
                steering.add(other.velocity);
                total++;
            }
        }

        if (total > 0) {
            steering.divideScalar(total);
            steering.normalize().multiplyScalar(CONFIG.maxSpeed);
            steering.sub(this.velocity);
            steering.clampLength(0, CONFIG.maxForce);
        }

        return steering;
    }

    cohesion(boids) {
        const steering = new THREE.Vector3();
        let total = 0;

        for (const other of boids) {
            const d = this.position.distanceTo(other.position);
            if (other !== this && d < CONFIG.perceptionRadius) {
                steering.add(other.position);
                total++;
            }
        }

        if (total > 0) {
            steering.divideScalar(total);
            steering.sub(this.position);
            steering.normalize().multiplyScalar(CONFIG.maxSpeed);
            steering.sub(this.velocity);
            steering.clampLength(0, CONFIG.maxForce);
        }

        return steering;
    }

    separation(boids) {
        const steering = new THREE.Vector3();
        let total = 0;

        for (const other of boids) {
            const d = this.position.distanceTo(other.position);
            if (other !== this && d < CONFIG.separationDistance) {
                const diff = this.position.clone().sub(other.position);
                diff.divideScalar(d * d);
                steering.add(diff);
                total++;
            }
        }

        if (total > 0) {
            steering.divideScalar(total);
            steering.normalize().multiplyScalar(CONFIG.maxSpeed);
            steering.sub(this.velocity);
            steering.clampLength(0, CONFIG.maxForce);
        }

        return steering;
    }

    flee(target) {
        const desired = this.position.clone().sub(target);
        const d = desired.length();

        if (d < 3) {
            desired.normalize().multiplyScalar(CONFIG.maxSpeed);
            const steering = desired.sub(this.velocity);
            steering.clampLength(0, CONFIG.maxForce * 2);
            return steering;
        }

        return new THREE.Vector3();
    }

    flock(boids, mousePos) {
        const alignment = this.align(boids);
        const cohesion = this.cohesion(boids);
        const separation = this.separation(boids);

        alignment.multiplyScalar(CONFIG.alignmentForce);
        cohesion.multiplyScalar(CONFIG.cohesionForce);
        separation.multiplyScalar(CONFIG.separationForce);

        this.acceleration.add(alignment);
        this.acceleration.add(cohesion);
        this.acceleration.add(separation);

        if (mousePos) {
            const flee = this.flee(mousePos);
            flee.multiplyScalar(CONFIG.mouseInfluence);
            this.acceleration.add(flee);
        }
    }

    update() {
        // Update velocity
        this.velocity.add(this.acceleration);

        // Project velocity onto tangent plane to keep movement on sphere
        const normal = this.position.clone().normalize();
        const tangentVelocity = this.velocity.clone().sub(
            normal.clone().multiplyScalar(this.velocity.dot(normal))
        );

        this.velocity.copy(tangentVelocity);
        this.velocity.clampLength(0, CONFIG.maxSpeed);

        // Update position
        this.position.add(this.velocity);

        // Keep on sphere surface
        this.edges();

        // Reset acceleration
        this.acceleration.multiplyScalar(0);

        // Update trail
        this.trail.push(this.position.clone());
        if (this.trail.length > CONFIG.trailLength) {
            this.trail.shift();
        }
    }
}

class SphericalBoidsScene {
    constructor() {
        this.boids = [];
        this.mousePos = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.init();
        this.createBoids();
        this.setupEventListeners();
        this.animate();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.FogExp2(0x000000, 0.05);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 15;

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const container = document.getElementById('canvas-container');
        container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.5;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);

        const pointLight1 = new THREE.PointLight(0x00ffff, 1, 100);
        pointLight1.position.set(10, 10, 10);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xff00ff, 1, 100);
        pointLight2.position.set(-10, -10, -10);
        this.scene.add(pointLight2);

        // Create invisible sphere for raycasting
        const sphereGeometry = new THREE.SphereGeometry(CONFIG.sphereRadius, 64, 64);
        const sphereMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0
        });
        this.invisibleSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        this.scene.add(this.invisibleSphere);

        // Create wireframe sphere for reference
        const wireframeGeometry = new THREE.SphereGeometry(CONFIG.sphereRadius, 32, 32);
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x222222,
            wireframe: true,
            transparent: true,
            opacity: 0.1
        });
        this.wireframeSphere = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
        this.scene.add(this.wireframeSphere);

        // Hide loading message
        document.querySelector('.loading').style.display = 'none';
    }

    createBoids() {
        // Clear existing boids
        if (this.boidsGroup) {
            this.scene.remove(this.boidsGroup);
        }

        this.boids = [];
        this.boidsGroup = new THREE.Group();

        // Create boids
        for (let i = 0; i < CONFIG.boidCount; i++) {
            this.boids.push(new Boid(CONFIG.sphereRadius));
        }

        // Create particles for boids
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(CONFIG.boidCount * 3);
        const colors = new Float32Array(CONFIG.boidCount * 3);

        for (let i = 0; i < CONFIG.boidCount; i++) {
            const i3 = i * 3;
            positions[i3] = this.boids[i].position.x;
            positions[i3 + 1] = this.boids[i].position.y;
            positions[i3 + 2] = this.boids[i].position.z;

            // Color gradient based on position
            const hue = (i / CONFIG.boidCount) * 360;
            const color = new THREE.Color().setHSL(hue / 360, 0.8, 0.6);
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });

        this.particles = new THREE.Points(geometry, material);
        this.boidsGroup.add(this.particles);

        // Create trails
        this.createTrails();

        this.scene.add(this.boidsGroup);
    }

    createTrails() {
        if (this.trailsGroup) {
            this.boidsGroup.remove(this.trailsGroup);
        }

        this.trailsGroup = new THREE.Group();
        this.trailLines = [];

        for (let i = 0; i < this.boids.length; i++) {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(CONFIG.trailLength * 3);
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const hue = (i / CONFIG.boidCount) * 360;
            const color = new THREE.Color().setHSL(hue / 360, 0.8, 0.6);

            const material = new THREE.LineBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.3,
                blending: THREE.AdditiveBlending
            });

            const line = new THREE.Line(geometry, material);
            this.trailLines.push(line);
            this.trailsGroup.add(line);
        }

        this.boidsGroup.add(this.trailsGroup);
    }

    updateBoids() {
        // Flock behavior
        for (const boid of this.boids) {
            boid.flock(this.boids, this.mousePos);
        }

        // Update positions
        for (const boid of this.boids) {
            boid.update();
        }

        // Update particle positions
        const positions = this.particles.geometry.attributes.position.array;
        for (let i = 0; i < this.boids.length; i++) {
            const i3 = i * 3;
            positions[i3] = this.boids[i].position.x;
            positions[i3 + 1] = this.boids[i].position.y;
            positions[i3 + 2] = this.boids[i].position.z;
        }
        this.particles.geometry.attributes.position.needsUpdate = true;

        // Update trails
        for (let i = 0; i < this.boids.length; i++) {
            const trail = this.boids[i].trail;
            const positions = this.trailLines[i].geometry.attributes.position.array;

            for (let j = 0; j < trail.length; j++) {
                const j3 = j * 3;
                positions[j3] = trail[j].x;
                positions[j3 + 1] = trail[j].y;
                positions[j3 + 2] = trail[j].z;
            }

            this.trailLines[i].geometry.attributes.position.needsUpdate = true;
            this.trailLines[i].geometry.setDrawRange(0, trail.length);
        }
    }

    setupEventListeners() {
        // Mouse move
        window.addEventListener('mousemove', (event) => {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObject(this.invisibleSphere);

            if (intersects.length > 0) {
                this.mousePos = intersects[0].point;
            }
        });

        // Mouse leave
        window.addEventListener('mouseleave', () => {
            this.mousePos = null;
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Controls
        this.setupControls();
    }

    setupControls() {
        const updateSlider = (id, configKey, valueId) => {
            const slider = document.getElementById(id);
            const valueSpan = document.getElementById(valueId);

            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                CONFIG[configKey] = value;
                valueSpan.textContent = value.toFixed(1);

                if (configKey === 'boidCount') {
                    this.createBoids();
                }
            });
        };

        updateSlider('boidCount', 'boidCount', 'boidCountValue');
        updateSlider('cohesion', 'cohesionForce', 'cohesionValue');
        updateSlider('separation', 'separationForce', 'separationValue');
        updateSlider('alignment', 'alignmentForce', 'alignmentValue');
        updateSlider('mouseInfluence', 'mouseInfluence', 'mouseInfluenceValue');
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.updateBoids();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize scene when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    new SphericalBoidsScene();
});
