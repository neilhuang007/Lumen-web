import * as THREE from 'three';
import { createSeededRandom, tintHex } from './utils.js';

const COLOR_PALETTE = ['#061dfb', '#ADFF00', '#f6000e', '#7e09f5', '#ffc000'];
const randomColorIndex = Math.floor(Math.random() * COLOR_PALETTE.length);
const PRIMARY_COLOR = COLOR_PALETTE[randomColorIndex];
const TINTED_COLOR = tintHex(PRIMARY_COLOR, 0.5);

const BASE_MATERIAL = { density: 1, friction: 2, restitution: 0.8 };

function baseSphere(overrides = {}) {
  return {
    color: PRIMARY_COLOR,
    sss: 0,
    sssColor: '#111',
    isSemitransparent: false,
    isRough: true,
    isColored: true,
    isBlackWhite: false,
    radius: 1,
    ...BASE_MATERIAL,
    ...overrides
  };
}

const WHITE = '#ffffff';
const BLACK = '#111';

const sphereBaseSet = [
  baseSphere(),
  baseSphere(),
  baseSphere({ isRough: false }),
  baseSphere({ color: WHITE, isColored: false }),
  baseSphere({ color: WHITE, isColored: false }),
  baseSphere({ color: WHITE, isColored: false }),
  baseSphere({ color: WHITE, isColored: false, isRough: false }),
  baseSphere({ color: BLACK, isColored: false, isBlackWhite: false }),
  baseSphere({ color: BLACK, isColored: false, isBlackWhite: false }),
  baseSphere({ color: BLACK, isColored: false, isBlackWhite: false }),
  baseSphere({ color: BLACK, isColored: false, isBlackWhite: false, isRough: false })
];

const sphereData = [...sphereBaseSet, ...sphereBaseSet.map((entry) => ({ ...entry }))];

const isMobile = typeof window !== 'undefined' && /ipad|iphone|android/i.test(navigator.userAgent || navigator.vendor || '');

if (!isMobile) {
  sphereData.push(
    baseSphere({ color: '#fff', isSemitransparent: true, isColored: false, isBlackWhite: true }),
    baseSphere({ color: TINTED_COLOR, isSemitransparent: true })
  );
}

export const SPHERES_DATA = sphereData;
export const NUM_SPHERES = SPHERES_DATA.length;
export const NEIGHBOUR_COUNT = NUM_SPHERES - 1;

export const SETTINGS = {
  COLOR_PALETTE,
  PRIMARY_COLOR,
  CROSS_MODEL: isMobile ? 'home/cross_ld.buf' : 'home/cross.buf',
  MODEL_PATH: './assets/models/',
  TEXTURE_PATH: './assets/textures/',
  BLUE_NOISE_TEXTURE: 'LDR_RGB1_0.png',
  MATCAP_TEXTURE: isMobile ? 'home/matcap_ld.exr' : 'home/matcap.exr',
  BACKGROUND_COLOR: new THREE.Color('#141515'),
  LIGHT_POSITION: new THREE.Vector3(10, 10, 5)
};

export const PHYSICS_CONSTANTS = {
  GRAVITY_FACTOR: 40,
  MOUSE_RADIUS: 0.025,
  MOUSE_INFLUENCE: 0.1,
  MOUSE_PUSH_FORCE: 0.12,
  VELOCITY_DAMPING: 0.2,
  RANDOM_FN: createSeededRandom('balloonBody-25')
};

export const CAMERA_SETTINGS = {
  fov: 25,
  near: 0.1,
  far: 2000,
  initialPosition: new THREE.Vector3(0, 0, 17.5),
  lookAt: new THREE.Vector3(0, 0, 0)
};
