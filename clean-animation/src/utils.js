import * as THREE from 'three';

// Math utilities mirroring the helpers embedded in the hoisted bundle.
export const math = {
  PI: Math.PI,
  fit(value, inMin, inMax, outMin, outMax, easingFn) {
    let t = (value - inMin) / (inMax - inMin);
    t = Math.min(Math.max(t, 0), 1);
    if (easingFn) {
      t = easingFn(t);
    }
    return outMin + t * (outMax - outMin);
  },
  cUnMix(a, b, value) {
    return Math.min(Math.max((value - a) / (b - a), 0), 1);
  },
  smoothstep(edge0, edge1, x) {
    const t = math.cUnMix(edge0, edge1, x);
    return t * t * (3 - 2 * t);
  },
  lerp(a, b, t) {
    return a * (1 - t) + b * t;
  },
  loop(value, min, max) {
    const span = max - min;
    let v = value - min;
    v = ((v % span) + span) % span;
    return v + min;
  },
  fract(value) {
    return value - Math.floor(value);
  },
  hash2(x, y) {
    return math.fract(Math.sin(x * 12.9898 + y * 4.1414) * 43758.5453);
  }
};

export const ease = {
  cubicInOut(t) {
    t *= 2;
    if (t < 1) {
      return 0.5 * t * t * t;
    }
    t -= 2;
    return 0.5 * (t * t * t + 2);
  },
  expoIn(t) {
    return t === 0 ? 0 : Math.pow(1024, t - 1);
  },
  sineIn(t) {
    return 1 - Math.cos((t * Math.PI) / 2);
  },
  backOut(t) {
    const s = 1.70158;
    t -= 1;
    return t * t * ((s + 1) * t + s) + 1;
  }
};

// Deterministic pseudo random generator matching the hoisted implementation (_sfc32).
export function createSeededRandom(seedString) {
  let a = 1779033703;
  let b = 3144134277;
  let c = 1013904242;
  let d = 2773480762;

  for (let i = 0; i < seedString.length; i += 1) {
    const code = seedString.charCodeAt(i);
    a = b ^ Math.imul(a ^ code, 597399067);
    b = c ^ Math.imul(b ^ code, 2869860233);
    c = d ^ Math.imul(c ^ code, 951274213);
    d = a ^ Math.imul(d ^ code, 2716044179);
  }

  return function sfc32() {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (a + b | 0) + d | 0;
    d = d + 1 | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11) + t | 0;
    return (t >>> 0) / 4294967296;
  };
}

// Helper to create a tinted colour identical to the original Color.offsetHSL usage.
export function tintHex(hex, lShift = 0.5) {
  const color = new THREE.Color(hex);
  const hsl = {};
  color.getHSL(hsl);
  hsl.l = Math.min(1, hsl.l + lShift);
  color.setHSL(hsl.h, hsl.s, hsl.l);
  return `#${color.getHexString()}`;
}
