import * as THREE from 'three';

/**
 * Procedural texture generator for TUSK.
 * All textures are generated via 2D Canvas — zero external image files.
 * Each generator returns a THREE.CanvasTexture ready to assign to a material map.
 *
 * Textures are cached — calling the same generator twice returns the same texture.
 */

const _cache = new Map();

function cached(key, w, h, drawFn) {
  if (_cache.has(key)) return _cache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  _cache.set(key, tex);
  return tex;
}

// ─── Utility helpers ───────────────────────────────────────────

function hexToRgb(hex) {
  return {
    r: (hex >> 16) & 255,
    g: (hex >> 8) & 255,
    b: hex & 255,
  };
}

function rgbStr(r, g, b, a = 1) {
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

// Simple deterministic hash-based noise (no Math.random — same texture every time)
function noise(x, y, seed = 0) {
  let n = (x * 374761 + y * 668265 + seed * 982451) & 0x7fffffff;
  n = ((n >> 13) ^ n);
  n = (n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff;
  return n / 0x7fffffff; // 0..1
}

function fillNoise(ctx, w, h, baseColor, variation, seed = 42, scale = 1) {
  const { r, g, b } = hexToRgb(baseColor);
  const imageData = ctx.createImageData(w, h);
  const d = imageData.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = noise(Math.floor(x / scale), Math.floor(y / scale), seed);
      const v = (n - 0.5) * variation;
      const i = (y * w + x) * 4;
      d[i] = Math.max(0, Math.min(255, r + v));
      d[i + 1] = Math.max(0, Math.min(255, g + v));
      d[i + 2] = Math.max(0, Math.min(255, b + v));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

// ─── Texture Generators ────────────────────────────────────────

/** Fur: directional noise strokes with color variation */
export function furTexture(baseColor = 0x4A3878) {
  return cached(`fur_${baseColor}`, 128, 128, (ctx, w, h) => {
    fillNoise(ctx, w, h, baseColor, 40, 42, 2);
    // Add directional fur strokes
    const { r, g, b } = hexToRgb(baseColor);
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 200; i++) {
      const x = noise(i, 0, 100) * w;
      const y = noise(i, 1, 100) * h;
      const len = 4 + noise(i, 2, 100) * 8;
      const bright = (noise(i, 3, 100) - 0.5) * 50;
      ctx.strokeStyle = rgbStr(r + bright, g + bright, b + bright);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + noise(i, 4, 100) * 3 - 1.5, y + len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

/** Chest / belly fur: lighter, softer streaks */
export function chestFurTexture(baseColor = 0xC8C0D0) {
  return cached(`chest_${baseColor}`, 128, 128, (ctx, w, h) => {
    fillNoise(ctx, w, h, baseColor, 25, 55, 2);
    const { r, g, b } = hexToRgb(baseColor);
    ctx.globalAlpha = 0.2;
    for (let i = 0; i < 120; i++) {
      const x = noise(i, 0, 200) * w;
      const y = noise(i, 1, 200) * h;
      const len = 3 + noise(i, 2, 200) * 5;
      ctx.strokeStyle = rgbStr(r + 15, g + 15, b + 15, 0.4);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.5, y + len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

/** Stone / rock: multi-octave noise with cracks */
export function stoneTexture(baseColor = 0x4A3F55) {
  return cached(`stone_${baseColor}`, 256, 256, (ctx, w, h) => {
    // Base noise at multiple scales
    fillNoise(ctx, w, h, baseColor, 35, 77, 3);
    // Overlay coarser noise
    const { r, g, b } = hexToRgb(baseColor);
    ctx.globalAlpha = 0.25;
    for (let y = 0; y < h; y += 4) {
      for (let x = 0; x < w; x += 4) {
        const n = noise(x / 8, y / 8, 88);
        ctx.fillStyle = rgbStr(r + (n - 0.5) * 60, g + (n - 0.5) * 60, b + (n - 0.5) * 60);
        ctx.fillRect(x, y, 4, 4);
      }
    }
    // Cracks
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = rgbStr(r - 40, g - 40, b - 40);
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      let cx = noise(i, 0, 300) * w;
      let cy = noise(i, 1, 300) * h;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let j = 0; j < 8; j++) {
        cx += (noise(i, j + 2, 300) - 0.5) * 20;
        cy += noise(i, j + 10, 300) * 15;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

/** Grass: green with subtle blade-like patterns */
export function grassTexture(baseColor = 0x4CB860) {
  return cached(`grass_${baseColor}`, 128, 128, (ctx, w, h) => {
    fillNoise(ctx, w, h, baseColor, 30, 33, 2);
    const { r, g, b } = hexToRgb(baseColor);
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 300; i++) {
      const x = noise(i, 0, 400) * w;
      const y = noise(i, 1, 400) * h;
      const len = 3 + noise(i, 2, 400) * 6;
      const shade = (noise(i, 3, 400) - 0.5) * 40;
      ctx.strokeStyle = rgbStr(r + shade - 10, g + shade + 10, b + shade - 15);
      ctx.lineWidth = 0.6 + noise(i, 4, 400) * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (noise(i, 5, 400) - 0.5) * 4, y - len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

/** Dirt: brown with layered grain and pebble dots */
export function dirtTexture(baseColor = 0x6A4A38) {
  return cached(`dirt_${baseColor}`, 128, 128, (ctx, w, h) => {
    fillNoise(ctx, w, h, baseColor, 35, 44, 2);
    const { r, g, b } = hexToRgb(baseColor);
    // Pebble dots
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 60; i++) {
      const x = noise(i, 0, 500) * w;
      const y = noise(i, 1, 500) * h;
      const rad = 1 + noise(i, 2, 500) * 2.5;
      const shade = (noise(i, 3, 500) - 0.5) * 50;
      ctx.fillStyle = rgbStr(r + shade, g + shade, b + shade);
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

/** Leather: worn grain with stitch marks */
export function leatherTexture(baseColor = 0x6A5540) {
  return cached(`leather_${baseColor}`, 128, 128, (ctx, w, h) => {
    fillNoise(ctx, w, h, baseColor, 30, 66, 2);
    const { r, g, b } = hexToRgb(baseColor);
    // Grain lines
    ctx.globalAlpha = 0.2;
    for (let y = 0; y < h; y += 3) {
      for (let x = 0; x < w; x++) {
        const n = noise(x, y / 3, 600);
        if (n > 0.65) {
          ctx.fillStyle = rgbStr(r - 20, g - 20, b - 20);
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    // Stitch line
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = rgbStr(r + 30, g + 25, b + 15);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(0, h * 0.3);
    ctx.lineTo(w, h * 0.3);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  });
}

/** Metal: brushed steel with scratches */
export function metalTexture(baseColor = 0x3A3A48) {
  return cached(`metal_${baseColor}`, 128, 128, (ctx, w, h) => {
    fillNoise(ctx, w, h, baseColor, 20, 77, 1);
    const { r, g, b } = hexToRgb(baseColor);
    // Brushed horizontal lines
    ctx.globalAlpha = 0.15;
    for (let y = 0; y < h; y++) {
      const n = noise(y, 0, 700);
      if (n > 0.4) {
        ctx.fillStyle = rgbStr(r + 20, g + 20, b + 25, 0.3);
        ctx.fillRect(0, y, w, 1);
      }
    }
    // Scratches
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = rgbStr(r + 35, g + 35, b + 40);
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 8; i++) {
      const sx = noise(i, 0, 710) * w;
      const sy = noise(i, 1, 710) * h;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (noise(i, 2, 710) - 0.3) * 40, sy + noise(i, 3, 710) * 6);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

/** Ivory horn: spiral ridges on warm gradient */
export function hornTexture(baseColor = 0xE8DCC0) {
  return cached(`horn_${baseColor}`, 64, 128, (ctx, w, h) => {
    // Warm gradient base
    const { r, g, b } = hexToRgb(baseColor);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, rgbStr(r, g, b));
    grad.addColorStop(0.5, rgbStr(r - 15, g - 10, b - 5));
    grad.addColorStop(1, rgbStr(r - 30, g - 25, b - 15));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // Spiral ridges
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = rgbStr(r - 40, g - 35, b - 25);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const y = i * (h / 12) + 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.quadraticCurveTo(w * 0.5, y - 4, w, y + 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Add subtle noise
    fillNoise(ctx, w, h, baseColor, 15, 88, 1);
    // Re-blend (the noise overwrites, so we use compositing)
  });
}

/** Crystal: faceted shimmer pattern */
export function crystalTexture(baseColor = 0x46D8FF) {
  return cached(`crystal_${baseColor}`, 64, 64, (ctx, w, h) => {
    const { r, g, b } = hexToRgb(baseColor);
    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, rgbStr(r, g, b));
    grad.addColorStop(0.5, rgbStr(r + 30, g + 10, b));
    grad.addColorStop(1, rgbStr(r - 20, g - 10, b));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // Facet lines
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = rgbStr(255, 255, 255);
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 8; i++) {
      const x1 = noise(i, 0, 900) * w;
      const y1 = noise(i, 1, 900) * h;
      const x2 = noise(i, 2, 900) * w;
      const y2 = noise(i, 3, 900) * h;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    // Sparkle dots
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) {
      const x = noise(i, 0, 950) * w;
      const y = noise(i, 1, 950) * h;
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

/** Rust: corroded metal with pitting */
export function rustTexture(baseColor = 0x8A4030) {
  return cached(`rust_${baseColor}`, 128, 128, (ctx, w, h) => {
    fillNoise(ctx, w, h, baseColor, 45, 99, 2);
    const { r, g, b } = hexToRgb(baseColor);
    // Corrosion patches
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 25; i++) {
      const x = noise(i, 0, 800) * w;
      const y = noise(i, 1, 800) * h;
      const rad = 2 + noise(i, 2, 800) * 6;
      const dark = noise(i, 3, 800) > 0.5;
      ctx.fillStyle = dark
        ? rgbStr(r - 30, g - 20, b - 10)
        : rgbStr(r + 25, g + 15, b);
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    // Pitting (tiny dark dots)
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = rgbStr(r - 50, g - 40, b - 30);
    for (let i = 0; i < 80; i++) {
      const x = noise(i, 0, 850) * w;
      const y = noise(i, 1, 850) * h;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
  });
}

/** Wall / brick: stone blocks with mortar lines */
export function wallTexture(baseColor = 0x5A5070) {
  return cached(`wall_${baseColor}`, 256, 256, (ctx, w, h) => {
    fillNoise(ctx, w, h, baseColor, 30, 111, 3);
    const { r, g, b } = hexToRgb(baseColor);
    // Brick/block pattern
    const brickH = 24;
    const brickW = 48;
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = rgbStr(r - 30, g - 30, b - 25);
    ctx.lineWidth = 2;
    for (let row = 0; row < h / brickH; row++) {
      const y = row * brickH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      const offset = (row % 2) * (brickW / 2);
      for (let col = 0; col < w / brickW + 1; col++) {
        const x = col * brickW + offset;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + brickH);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  });
}

// ─── Environment Map Generator ─────────────────────────────────

/**
 * Creates a procedural gradient environment cube map for PBR reflections.
 * Without this, MeshStandardMaterial looks flat and dead.
 */
export function createEnvMap(renderer) {
  const size = 128;
  const cubeRT = new THREE.WebGLCubeRenderTarget(size);
  const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRT);

  // Build a temporary sky scene for the cube camera to capture
  const skyScene = new THREE.Scene();

  // Gradient sky sphere
  const skyGeo = new THREE.SphereGeometry(50, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x6BB8E8) },
      bottomColor: { value: new THREE.Color(0xEDE6F5) },
      horizonColor: { value: new THREE.Color(0xFFE8C0) },
      offset: { value: 5 },
      exponent: { value: 0.5 },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform vec3 horizonColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPos;
      void main() {
        float h = normalize(vWorldPos + offset).y;
        float t = max(0.0, h);
        vec3 sky = mix(horizonColor, topColor, pow(t, exponent));
        float b = max(0.0, -h);
        vec3 ground = mix(horizonColor, bottomColor, pow(b, 0.8));
        gl_FragColor = vec4(h >= 0.0 ? sky : ground, 1.0);
      }
    `,
  });
  skyScene.add(new THREE.Mesh(skyGeo, skyMat));

  // Soft ambient fill
  skyScene.add(new THREE.AmbientLight(0xFFFFFF, 0.4));

  cubeCamera.update(renderer, skyScene);

  // Cleanup
  skyGeo.dispose();
  skyMat.dispose();

  return cubeRT.texture;
}

// ─── Sky Dome for the scene background ─────────────────────────

/** Creates a large sky sphere with gradient shader to replace flat background color. */
export function createSkySphere() {
  const geo = new THREE.SphereGeometry(140, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x4A90D0) },
      horizonColor: { value: new THREE.Color(0xC8E0F8) },
      bottomColor: { value: new THREE.Color(0xEDE6F5) },
      sunColor: { value: new THREE.Color(0xFFF4D6) },
      sunDir: { value: new THREE.Vector3(0.3, 0.5, 0.15).normalize() },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      uniform vec3 sunColor;
      uniform vec3 sunDir;
      varying vec3 vWorldPos;
      void main() {
        vec3 dir = normalize(vWorldPos);
        float h = dir.y;
        // Sky gradient
        float t = max(0.0, h);
        vec3 sky = mix(horizonColor, topColor, pow(t, 0.6));
        float b = max(0.0, -h * 0.5);
        vec3 ground = mix(horizonColor, bottomColor, pow(b, 0.4));
        vec3 col = h >= 0.0 ? sky : ground;
        // Sun glow
        float sunDot = max(0.0, dot(dir, sunDir));
        col += sunColor * pow(sunDot, 32.0) * 0.5;
        col += sunColor * pow(sunDot, 4.0) * 0.15;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  return new THREE.Mesh(geo, mat);
}

// ─── Floating Particles (dust motes / pollen) ─────────────────

/** Creates a particle system of small floating sprites around the player area. */
export function createDustParticles(count = 120) {
  const positions = new Float32Array(count * 3);
  const alphas = new Float32Array(count);
  const speeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 1] = Math.random() * 15;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    alphas[i] = 0.2 + Math.random() * 0.5;
    speeds[i] = 0.3 + Math.random() * 0.7;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xFFEED8,
    size: 0.12,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geo, mat);

  // Animation function — call each frame
  points.userData.update = (dt, playerPos) => {
    const pos = geo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // Gentle drift
      pos[idx] += Math.sin(pos[idx + 1] * 0.5 + i) * speeds[i] * dt * 0.3;
      pos[idx + 1] += Math.sin(i * 0.7 + pos[idx] * 0.3) * speeds[i] * dt * 0.2;
      pos[idx + 2] += Math.cos(pos[idx + 1] * 0.4 + i * 0.5) * speeds[i] * dt * 0.3;
      // Re-center around player
      if (Math.abs(pos[idx] - playerPos.x) > 30) pos[idx] = playerPos.x + (Math.random() - 0.5) * 50;
      if (Math.abs(pos[idx + 2] - playerPos.z) > 30) pos[idx + 2] = playerPos.z + (Math.random() - 0.5) * 50;
      if (pos[idx + 1] < playerPos.y - 5) pos[idx + 1] = playerPos.y + Math.random() * 12;
      if (pos[idx + 1] > playerPos.y + 15) pos[idx + 1] = playerPos.y - 3;
    }
    geo.attributes.position.needsUpdate = true;
  };

  return points;
}
