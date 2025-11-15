# Sphere Cluster Recreation – Algorithm Notes

## Physics Integration
- **Randomised initial state** – spheres use the seeded `_sfc32` generator from the original bundle (`math.getSeedRandomFn("balloonBody-25")`) to place instances inside a cube or, for translucent spheres, behind the cluster. Positions and initial velocities match the hoisted logic: `position0 = (rand-0.5)*spread`, `velocity0 = position0 * -2`.
- **Forces** – each frame applies the exact centre-seeking force `F = -GRAVITY_FACTOR * position`, normalised by mass and damped by accumulated friction (`1 / (1 + frictionTot)`) before adding to velocity. Velocities decay with the exponential damping `velocity *= pow(0.2, dt)` as in `HomeBalloonsBody.update`.
- **Collisions** – spheres resolve overlap in pairs by projecting the shared normal, shifting positions by half the penetration, and solving the restitution impulse `(mA*vA + mB*vB ± …)/(mA+mB)` with the friction mix `sqrt(frictionA*frictionB)`. Angular motion uses the cross product of velocity and position to rotate each body about its inertia, matching the `HomeBalloonsPhysics` rotational noise.
- **Mouse coupling** – the pointer ray is unprojected to z=0 and measured against the camera-to-pointer vector. Bodies within `MOUSE_RADIUS` receive both the repulsion influence `(MOUSE_INFLUENCE * penetration)` and momentum kick `MOUSE_PUSH_FORCE`. Additional swirl torque follows the dot/cross pattern in the hoisted source (`setFromAxisAngle` around `(1,1,1)`).

## Rendering Pipeline
- **Geometry** – the bundled `cross.buf` instanced mesh is loaded so every sphere inherits the custom attributes (`daoN`, `daoP`, `ao`, `thickness`, `SN`) referenced by the shaders.
- **Shader structure** – vertex code composes the world transform, rotates the light vector by the inverse quaternion and fetches directional AO tables, reproducing the `goalBlackTunnel` tunnel sphere vertex program (`vert$l`).
- **Fragment lighting** – the GLSL matches `frag$p`: neighbourhood AO/shadow comes from `getCrossAoShadowIntersect`, reflections accumulate with distance falloff, matcap sampling perturbs normals, and tone mapping uses the original filmic curve. Blue-noise hashes (`getBlueNoise`) feed both the reflection jitter and background plane.
- **Neighbour buffers** – every frame the renderer sorts other spheres by squared distance to populate the uniforms `u_nearPositionRadiusList`, `u_nearRotationList`, `u_nearColorList`, `u_nearTransparencyLumaList` exactly as `HomeBalloons.updateSorting` fills its instanced arrays. The shader therefore receives the same 23-neighbour snapshot.
- **Background paint** – a fullscreen quad runs the `frag$o` shader, blending radial gradients with blue noise. The brush simulation follows `ScreenPaint`: draw vectors (`u_drawFrom`, `u_drawTo`), velocity dissipation (`u_dissipations`) and push strength replicate the fluid smear that drives the tunnel backing texture.

## Colour System
- The palette `["#061dfb", "#ADFF00", "#f6000e", "#7e09f5", "#ffc000"]` is sampled once per load to derive `fancyColor`, plus the HSL-lightened tint used for semitransparent entries. `SPHERES_DATA` preserves the hoisted ordering (two 11-sphere clusters plus optional glass spheres) so neighbour indices align with the shader’s expectations.

## Camera Motion
- The camera animates from z=25 to the steady 17.5 using the same `math.fit` + `ease.backOut` interpolation present in `homeBalloons.syncProperties`, yielding the slow dolly-in from the original homepage hero.
