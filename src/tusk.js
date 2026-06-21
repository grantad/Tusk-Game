import * as THREE from 'three';
import {
  furTexture, chestFurTexture, leatherTexture, metalTexture, hornTexture,
} from './textures.js';

// ─── Palette ───────────────────────────────────────────────────
const C = {
  fur: 0x4A3878,
  furDark: 0x2E2050,
  chest: 0xC8C0D0,
  mane: 0x5B30A0,
  maneBlue: 0x2888E0,
  eye: 0xC08020,
  bandana: 0xD03030,
  boot: 0x6A5540,
  horn: 0xE8DCC0,
  steel: 0x3A3A48,
  nose: 0x1A1226,
  scar: 0x7A6098,
  fang: 0xF0EAD6,
  earInner: 0x8A5070,
  pouch: 0x5A4530,
  sole: 0x1A1418,
};

// Fury mode glowing colors
const FURY_HORN = 0xFF6600;
const FURY_EYE = 0xFF4400;
const FURY_EMISSIVE = 0x882200;

// ─── PBR Material helpers ──────────────────────────────────────

function pbrMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0.0,
    map: opts.map ?? null,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    ...opts,
  });
}

function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  return m;
}

function sphere(r, mat, ws = 20, hs = 16) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat);
  m.castShadow = true;
  return m;
}

function cylinder(topR, botR, h, mat, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(topR, botR, h, seg), mat);
  m.castShadow = true;
  return m;
}

function cone(r, h, mat, seg = 8) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat);
  m.castShadow = true;
  return m;
}

// ─── Shared material instances (created once, cached) ──────────

let _mats = null;
function getMats() {
  if (_mats) return _mats;
  _mats = {
    fur: pbrMat(C.fur, { map: furTexture(C.fur), roughness: 0.92 }),
    furDark: pbrMat(C.furDark, { map: furTexture(C.furDark), roughness: 0.90 }),
    chest: pbrMat(C.chest, { map: chestFurTexture(C.chest), roughness: 0.88 }),
    mane: pbrMat(C.mane, { roughness: 0.5, metalness: 0.1 }),
    maneBlue: pbrMat(C.maneBlue, { roughness: 0.5, metalness: 0.1 }),
    eye: pbrMat(C.eye, { roughness: 0.3, metalness: 0.1 }),
    eyeWhite: pbrMat(0xFFFFFF, { roughness: 0.4, metalness: 0.0 }),
    bandana: pbrMat(C.bandana, { roughness: 0.75, metalness: 0.0 }),
    boot: pbrMat(C.boot, { map: leatherTexture(C.boot), roughness: 0.82 }),
    horn: pbrMat(C.horn, { map: hornTexture(C.horn), roughness: 0.45, metalness: 0.05 }),
    steel: pbrMat(C.steel, { map: metalTexture(C.steel), roughness: 0.3, metalness: 0.75 }),
    nose: pbrMat(C.nose, { roughness: 0.6, metalness: 0.0 }),
    buckle: pbrMat(0xD8B850, { roughness: 0.25, metalness: 0.85 }),
    scar: pbrMat(C.scar, { roughness: 0.7 }),
    fang: pbrMat(C.fang, { roughness: 0.35, metalness: 0.05 }),
    earInner: pbrMat(C.earInner, { roughness: 0.85 }),
    pouch: pbrMat(C.pouch, { map: leatherTexture(C.pouch), roughness: 0.85 }),
    sole: pbrMat(C.sole, { roughness: 0.95 }),
    lace: pbrMat(C.boot, { roughness: 0.7 }),
  };
  return _mats;
}

// ─── Build Tusk ────────────────────────────────────────────────

export function createTusk() {
  const M = getMats();
  const group = new THREE.Group();
  const parts = {};

  // === TORSO ===
  const torso = new THREE.Group();
  torso.position.y = 1.0;

  const body = cylinder(0.32, 0.40, 0.75, M.fur);
  body.scale.x = 1.35;
  torso.add(body);

  const chestMesh = sphere(0.30, M.chest);
  chestMesh.scale.set(1.15, 1.05, 0.55);
  chestMesh.position.set(0, 0.08, -0.22);
  torso.add(chestMesh);

  // Belt
  const belt = cylinder(0.41, 0.41, 0.1, M.boot);
  belt.scale.x = 1.3;
  belt.position.y = -0.38;
  torso.add(belt);

  const buckle = box(0.14, 0.1, 0.06, M.buckle);
  buckle.position.set(0, -0.38, -0.50);
  torso.add(buckle);

  // Belt pouches
  for (const side of [-1, 1]) {
    const pouch = box(0.10, 0.12, 0.08, M.pouch);
    pouch.position.set(side * 0.42, -0.34, -0.15);
    torso.add(pouch);
    // Pouch flap
    const flap = box(0.10, 0.03, 0.07, M.pouch);
    flap.position.set(side * 0.42, -0.27, -0.15);
    torso.add(flap);
  }

  group.add(torso);
  parts.torso = torso;

  // === HEAD ===
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.55;

  const head = sphere(0.30, M.fur);
  head.scale.set(1.05, 0.95, 0.95);
  headGroup.add(head);

  // Snout — rounded box
  const snout = box(0.26, 0.18, 0.18, M.chest);
  snout.position.set(0, -0.07, -0.27);
  headGroup.add(snout);

  const noseMesh = sphere(0.07, M.nose, 12, 10);
  noseMesh.position.set(0, -0.03, -0.37);
  headGroup.add(noseMesh);

  // Fang — small white cone peeking from mouth
  const fang = cone(0.02, 0.07, M.fang);
  fang.position.set(0.06, -0.14, -0.32);
  fang.rotation.x = Math.PI; // point down
  headGroup.add(fang);

  // Eyes + angry brows
  const pupils = [];
  for (const side of [-1, 1]) {
    const eyeWhite = sphere(0.075, M.eyeWhite, 12, 10);
    eyeWhite.position.set(side * 0.13, 0.05, -0.245);
    eyeWhite.scale.z = 0.5;
    headGroup.add(eyeWhite);

    const pupil = sphere(0.04, M.eye, 12, 10);
    pupil.position.set(side * 0.13, 0.05, -0.29);
    headGroup.add(pupil);
    pupils.push(pupil);

    const brow = box(0.15, 0.045, 0.05, M.furDark);
    brow.position.set(side * 0.13, 0.155, -0.26);
    brow.rotation.z = side * 0.35;
    headGroup.add(brow);

    // Ears with inner color
    const ear = sphere(0.09, M.furDark, 12, 10);
    ear.position.set(side * 0.22, 0.26, 0.02);
    headGroup.add(ear);
    // Inner ear
    const earIn = sphere(0.055, M.earInner, 10, 8);
    earIn.position.set(side * 0.22, 0.26, -0.02);
    earIn.scale.z = 0.3;
    headGroup.add(earIn);
  }
  parts.pupils = pupils;

  // Facial scar — thin lighter mark across left brow
  const scar = box(0.18, 0.025, 0.02, M.scar);
  scar.position.set(-0.08, 0.12, -0.28);
  scar.rotation.z = 0.25;
  headGroup.add(scar);

  // Horn — ridged with twist
  const hornMat = M.horn.clone(); // clone so fury can change it independently
  const hornGroup = new THREE.Group();
  hornGroup.position.set(0, 0.30, -0.13);
  hornGroup.rotation.x = -0.5;

  // Main horn shape
  const hornMesh = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.42, 12), hornMat);
  hornMesh.castShadow = true;
  hornGroup.add(hornMesh);

  // Ridges along the horn
  for (let i = 0; i < 5; i++) {
    const ridge = new THREE.Mesh(
      new THREE.TorusGeometry(0.065 - i * 0.008, 0.008, 6, 16),
      hornMat
    );
    ridge.position.y = -0.12 + i * 0.08;
    ridge.rotation.x = Math.PI / 2;
    hornGroup.add(ridge);
  }

  headGroup.add(hornGroup);
  parts.horn = hornGroup;
  parts.hornMat = hornMat;

  // Mohawk mane — spiky energy blades
  const maneSpikes = [];
  for (let i = 0; i < 5; i++) {
    const spikeMat = i % 2 === 0 ? M.mane : M.maneBlue;
    const spike = cone(0.055, 0.26 - i * 0.015, spikeMat, 6);
    spike.position.set(0, 0.30 - i * 0.025, 0.03 + i * 0.085);
    spike.rotation.x = 0.35 + i * 0.22;
    headGroup.add(spike);
    maneSpikes.push(spike);
  }
  parts.maneSpikes = maneSpikes;

  group.add(headGroup);
  parts.head = headGroup;

  // === BANDANA ===
  const bandana = cylinder(0.24, 0.28, 0.13, M.bandana);
  bandana.position.y = 1.38;
  group.add(bandana);

  const bandanaTail = box(0.10, 0.26, 0.04, M.bandana);
  bandanaTail.position.set(0.16, 1.26, 0.20);
  bandanaTail.rotation.z = 0.4;
  group.add(bandanaTail);

  // === ARMS ===
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.52, 1.28, 0);

    // Shoulder fur tuft
    const shoulderTuft = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const tuft = cone(0.035, 0.12, M.fur, 5);
      tuft.position.set(
        (i - 1) * 0.04,
        0.06,
        (i % 2) * 0.03 - 0.015
      );
      tuft.rotation.z = side * 0.3;
      shoulderTuft.add(tuft);
    }
    arm.add(shoulderTuft);

    const upper = box(0.17, 0.42, 0.17, M.fur);
    upper.position.y = -0.18;
    arm.add(upper);

    // Gauntlet with more detail
    const gauntlet = box(0.19, 0.16, 0.19, M.steel);
    gauntlet.position.y = -0.42;
    arm.add(gauntlet);

    // Gauntlet rivets
    for (const rz of [-0.09, 0.09]) {
      const rivet = cylinder(0.02, 0.02, 0.025, M.buckle, 6);
      rivet.position.set(0, -0.42, rz);
      rivet.rotation.x = Math.PI / 2;
      arm.add(rivet);
    }

    // Fist
    const fist = sphere(0.115, M.furDark, 12, 10);
    fist.position.y = -0.54;
    arm.add(fist);

    // Clawed fingers (3 per fist, visible through fingerless gauntlets)
    for (let f = 0; f < 3; f++) {
      const angle = ((f - 1) * 0.4);
      const claw = cone(0.018, 0.08, M.fang, 5);
      claw.position.set(
        Math.sin(angle) * 0.08,
        -0.62,
        -0.06 + Math.cos(angle) * 0.04
      );
      claw.rotation.x = 0.3;
      arm.add(claw);
    }

    group.add(arm);
    parts[side === -1 ? 'leftArm' : 'rightArm'] = arm;
  }

  // === LEGS ===
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.20, 0.62, 0);

    // Knee fur tuft
    const kneeTuft = cone(0.04, 0.10, M.fur, 5);
    kneeTuft.position.set(0, -0.28, -0.12);
    kneeTuft.rotation.x = -0.5;
    leg.add(kneeTuft);

    const thigh = box(0.20, 0.34, 0.22, M.fur);
    thigh.position.y = -0.16;
    leg.add(thigh);

    // Boot with sole
    const boot = box(0.22, 0.28, 0.30, M.boot);
    boot.position.set(0, -0.46, -0.04);
    leg.add(boot);

    // Boot sole (darker, thicker bottom)
    const sole = box(0.23, 0.05, 0.32, M.sole);
    sole.position.set(0, -0.59, -0.04);
    leg.add(sole);

    // Boot strap (metal)
    const strap = box(0.24, 0.05, 0.32, M.steel);
    strap.position.set(0, -0.40, -0.04);
    leg.add(strap);

    // Strap buckle
    const strapBuckle = box(0.06, 0.06, 0.04, M.buckle);
    strapBuckle.position.set(0, -0.40, -0.20);
    leg.add(strapBuckle);

    // Boot lace detail (indented rectangles)
    for (let i = 0; i < 3; i++) {
      const lace = box(0.04, 0.015, 0.14, M.lace);
      lace.position.set(0, -0.42 - i * 0.05, -0.14);
      leg.add(lace);
    }

    group.add(leg);
    parts[side === -1 ? 'leftLeg' : 'rightLeg'] = leg;
  }

  // Stubby bear tail
  const tail = sphere(0.10, M.furDark, 10, 8);
  tail.position.set(0, 0.75, 0.42);
  group.add(tail);

  // === ARCANE GUARD SHIELD ===
  const shieldMat = new THREE.MeshStandardMaterial({
    color: 0x40E0D0,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.1,
    metalness: 0.4,
    emissive: 0x20A0A0,
    emissiveIntensity: 0,
  });
  const shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 16), shieldMat);
  shieldMesh.position.y = 0.9;
  group.add(shieldMesh);
  parts.shieldMesh = shieldMesh;
  parts.shieldMat = shieldMat;

  return { group, parts };
}

// ─── Procedural Animation ──────────────────────────────────────

export function animateTusk(parts, state, time, dt) {
  const { leftArm, rightArm, leftLeg, rightLeg, head, torso } = parts;

  // Fury mode visual effects
  updateFuryVisuals(parts, state, time, dt);

  // Shield visual
  updateShieldVisual(parts, state, time, dt);

  if (state.slamming) {
    torso.rotation.x = lerpTo(torso.rotation.x, -0.3, dt, 20);
    head.rotation.x = lerpTo(head.rotation.x, -0.3, dt, 18);
    head.position.z = lerpTo(head.position.z, 0, dt, 12);
    rightArm.rotation.x = lerpTo(rightArm.rotation.x, 3.0, dt, 20);
    leftArm.rotation.x = lerpTo(leftArm.rotation.x, -1.5, dt, 20);
    leftLeg.rotation.x = lerpTo(leftLeg.rotation.x, -1.2, dt, 20);
    rightLeg.rotation.x = lerpTo(rightLeg.rotation.x, -0.8, dt, 20);
    return;
  }

  if (state.slamRecovery) {
    torso.rotation.x = lerpTo(torso.rotation.x, 0.4, dt, 25);
    torso.position.y = lerpTo(torso.position.y, 0.7, dt, 25);
    head.rotation.x = lerpTo(head.rotation.x, 0.2, dt, 20);
    head.position.z = lerpTo(head.position.z, 0, dt, 12);
    rightArm.rotation.x = lerpTo(rightArm.rotation.x, 1.8, dt, 25);
    leftArm.rotation.x = lerpTo(leftArm.rotation.x, -0.5, dt, 25);
    leftLeg.rotation.x = lerpTo(leftLeg.rotation.x, -1.0, dt, 25);
    rightLeg.rotation.x = lerpTo(rightLeg.rotation.x, -0.6, dt, 25);
    return;
  }

  if (state.wallSliding) {
    torso.rotation.x = lerpTo(torso.rotation.x, 0.1, dt, 15);
    torso.position.y = lerpTo(torso.position.y, 1.0, dt, 12);
    head.rotation.x = lerpTo(head.rotation.x, -0.1, dt, 12);
    head.position.z = lerpTo(head.position.z, 0, dt, 12);
    leftArm.rotation.x = lerpTo(leftArm.rotation.x, -2.8, dt, 15);
    rightArm.rotation.x = lerpTo(rightArm.rotation.x, -2.4, dt, 15);
    leftLeg.rotation.x = lerpTo(leftLeg.rotation.x, -0.5, dt, 12);
    rightLeg.rotation.x = lerpTo(rightLeg.rotation.x, -0.8, dt, 12);
    const slide = Math.sin(time * 3) * 0.05;
    leftArm.rotation.x += slide;
    rightArm.rotation.x -= slide;
    return;
  }

  if (state.shielding) {
    torso.rotation.x = lerpTo(torso.rotation.x, -0.15, dt, 15);
    torso.position.y = lerpTo(torso.position.y, 0.95, dt, 12);
    head.rotation.x = lerpTo(head.rotation.x, -0.3, dt, 15);
    head.position.z = lerpTo(head.position.z, -0.15, dt, 15);
    leftArm.rotation.x = lerpTo(leftArm.rotation.x, -1.4, dt, 15);
    rightArm.rotation.x = lerpTo(rightArm.rotation.x, -1.4, dt, 15);
    leftArm.rotation.z = lerpTo(leftArm.rotation.z || 0, 0.5, dt, 15);
    rightArm.rotation.z = lerpTo(rightArm.rotation.z || 0, -0.5, dt, 15);
    leftLeg.rotation.x = lerpTo(leftLeg.rotation.x, -0.2, dt, 10);
    rightLeg.rotation.x = lerpTo(rightLeg.rotation.x, 0.2, dt, 10);
    return;
  }

  // Reset arm Z-rotation from shield stance
  if (leftArm.rotation.z) leftArm.rotation.z = lerpTo(leftArm.rotation.z, 0, dt, 10);
  if (rightArm.rotation.z) rightArm.rotation.z = lerpTo(rightArm.rotation.z, 0, dt, 10);

  if (state.charging) {
    torso.rotation.x = lerpTo(torso.rotation.x, 0.85, dt, 18);
    head.rotation.x = lerpTo(head.rotation.x, 0.5, dt, 18);
    head.position.z = lerpTo(head.position.z, -0.35, dt, 18);
    leftArm.rotation.x = lerpTo(leftArm.rotation.x, 1.2, dt, 18);
    rightArm.rotation.x = lerpTo(rightArm.rotation.x, 1.2, dt, 18);
    leftLeg.rotation.x = lerpTo(leftLeg.rotation.x, 0.9, dt, 18);
    rightLeg.rotation.x = lerpTo(rightLeg.rotation.x, 0.6, dt, 18);
    return;
  }

  head.position.z = lerpTo(head.position.z, 0, dt, 12);
  head.rotation.x = lerpTo(head.rotation.x, 0, dt, 12);

  if (!state.grounded) {
    const rising = state.velY > 0;
    torso.rotation.x = lerpTo(torso.rotation.x, rising ? -0.15 : 0.12, dt, 10);
    leftArm.rotation.x = lerpTo(leftArm.rotation.x, rising ? -2.6 : -1.1, dt, 12);
    rightArm.rotation.x = lerpTo(rightArm.rotation.x, rising ? -2.6 : -1.1, dt, 12);
    leftLeg.rotation.x = lerpTo(leftLeg.rotation.x, rising ? -0.9 : -0.3, dt, 12);
    rightLeg.rotation.x = lerpTo(rightLeg.rotation.x, rising ? -0.5 : 0.2, dt, 12);
  } else if (state.speed > 0.5) {
    const freq = 11;
    const amp = Math.min(1, state.speed / 8) * 0.9;
    const swing = Math.sin(time * freq) * amp;
    leftLeg.rotation.x = swing;
    rightLeg.rotation.x = -swing;
    leftArm.rotation.x = -swing * 1.1;
    rightArm.rotation.x = swing * 1.1;
    torso.rotation.x = lerpTo(torso.rotation.x, 0.18, dt, 10);
    torso.position.y = 1.0 + Math.abs(Math.sin(time * freq)) * 0.05;
  } else {
    const breathe = Math.sin(time * 2.2) * 0.03;
    torso.rotation.x = lerpTo(torso.rotation.x, 0.05, dt, 6);
    torso.position.y = 1.0 + breathe;
    leftArm.rotation.x = lerpTo(leftArm.rotation.x, -0.25 + breathe, dt, 6);
    rightArm.rotation.x = lerpTo(rightArm.rotation.x, -0.25 + breathe, dt, 6);
    leftLeg.rotation.x = lerpTo(leftLeg.rotation.x, 0, dt, 8);
    rightLeg.rotation.x = lerpTo(rightLeg.rotation.x, 0, dt, 8);
  }
}

// ─── Fury Mode Visuals ────────────────────────────────────────

function updateFuryVisuals(parts, state, time, dt) {
  const { hornMat, pupils, maneSpikes } = parts;

  if (state.furyActive) {
    const pulse = (Math.sin(time * 8) + 1) / 2;
    hornMat.color.set(FURY_HORN);
    hornMat.emissive.set(FURY_EMISSIVE);
    hornMat.emissiveIntensity = 0.5 + pulse * 0.5;

    for (const pupil of pupils) {
      pupil.material.color.set(FURY_EYE);
      pupil.material.emissive.set(FURY_EMISSIVE);
      pupil.material.emissiveIntensity = 0.6;
    }

    for (const sp of maneSpikes) {
      sp.material.emissive.set(0x442200);
      sp.material.emissiveIntensity = 0.3 + pulse * 0.3;
    }

    const scalePulse = 1.0 + Math.sin(time * 6) * 0.015;
    parts.torso.scale.setScalar(scalePulse);
  } else {
    hornMat.color.set(C.horn);
    hornMat.emissiveIntensity = 0;

    for (const pupil of pupils) {
      pupil.material.color.set(C.eye);
      pupil.material.emissiveIntensity = 0;
    }

    for (const sp of maneSpikes) {
      sp.material.emissiveIntensity = 0;
    }

    parts.torso.scale.setScalar(1);
  }
}

// ─── Shield Visual ─────────────────────────────────────────────

function updateShieldVisual(parts, state, time, dt) {
  const { shieldMat, shieldMesh } = parts;

  if (state.shielding) {
    const targetOpacity = 0.25 + Math.sin(time * 4) * 0.05;
    shieldMat.opacity = lerpTo(shieldMat.opacity, targetOpacity, dt, 8);
    shieldMat.emissiveIntensity = lerpTo(shieldMat.emissiveIntensity, 0.4, dt, 6);
    shieldMesh.rotation.y = time * 1.5;
    shieldMesh.rotation.x = time * 0.7;
  } else {
    shieldMat.opacity = lerpTo(shieldMat.opacity, 0, dt, 12);
    shieldMat.emissiveIntensity = lerpTo(shieldMat.emissiveIntensity, 0, dt, 12);
  }
}

function lerpTo(current, target, dt, rate) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}
