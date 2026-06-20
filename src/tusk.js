import * as THREE from 'three';

// Palette from the character design sheet
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
};

// Fury mode glowing colors
const FURY_HORN = 0xFF6600;
const FURY_EYE = 0xFF4400;
const FURY_EMISSIVE = 0x882200;

function mat(color) {
  return new THREE.MeshLambertMaterial({ color });
}

function box(w, h, d, color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.castShadow = true;
  return m;
}

function sphere(r, color, ws = 12, hs = 10) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat(color));
  m.castShadow = true;
  return m;
}

// Builds Tusk from primitives. Origin at his feet. ~1.8 units tall.
// Returns { group, parts } where parts holds references for procedural animation.
export function createTusk() {
  const group = new THREE.Group();
  const parts = {};

  // --- torso: broad bear chest, tapered ---
  const torso = new THREE.Group();
  torso.position.y = 1.0;
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.40, 0.75, 10),
    mat(C.fur)
  );
  body.castShadow = true;
  body.scale.x = 1.35; // broad shoulders
  torso.add(body);

  const chest = sphere(0.30, C.chest);
  chest.scale.set(1.15, 1.05, 0.55);
  chest.position.set(0, 0.08, -0.22);
  torso.add(chest);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.1, 10), mat(C.boot));
  belt.scale.x = 1.3;
  belt.position.y = -0.38;
  torso.add(belt);
  const buckle = box(0.14, 0.1, 0.06, 0xD8B850);
  buckle.position.set(0, -0.38, -0.50);
  torso.add(buckle);

  group.add(torso);
  parts.torso = torso;

  // --- head ---
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.55;
  const head = sphere(0.30, C.fur);
  head.scale.set(1.05, 0.95, 0.95);
  headGroup.add(head);

  const snout = box(0.26, 0.18, 0.18, C.chest);
  snout.position.set(0, -0.07, -0.27);
  headGroup.add(snout);
  const nose = sphere(0.07, C.nose, 8, 6);
  nose.position.set(0, -0.03, -0.37);
  headGroup.add(nose);

  // eyes + angry brows
  const pupils = [];
  for (const side of [-1, 1]) {
    const eyeWhite = sphere(0.075, 0xFFFFFF, 8, 6);
    eyeWhite.position.set(side * 0.13, 0.05, -0.245);
    eyeWhite.scale.z = 0.5;
    headGroup.add(eyeWhite);
    const pupil = sphere(0.04, C.eye, 8, 6);
    pupil.position.set(side * 0.13, 0.05, -0.29);
    headGroup.add(pupil);
    pupils.push(pupil);
    const brow = box(0.15, 0.045, 0.05, C.furDark);
    brow.position.set(side * 0.13, 0.155, -0.26);
    brow.rotation.z = side * 0.35;
    headGroup.add(brow);
    // round bear ears
    const ear = sphere(0.09, C.furDark, 8, 6);
    ear.position.set(side * 0.22, 0.26, 0.02);
    headGroup.add(ear);
  }
  parts.pupils = pupils;

  // battle-scarred ivory horn
  const hornMat = mat(C.horn);
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.42, 8), hornMat);
  horn.castShadow = true;
  horn.position.set(0, 0.30, -0.13);
  horn.rotation.x = -0.5;
  headGroup.add(horn);
  parts.horn = horn;
  parts.hornMat = hornMat;

  // spiky mohawk: alternating purple / electric blue blades
  const maneSpikes = [];
  for (let i = 0; i < 5; i++) {
    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(0.055, 0.26 - i * 0.015, 5),
      mat(i % 2 === 0 ? C.mane : C.maneBlue)
    );
    spike.castShadow = true;
    spike.position.set(0, 0.30 - i * 0.025, 0.03 + i * 0.085);
    spike.rotation.x = 0.35 + i * 0.22;
    headGroup.add(spike);
    maneSpikes.push(spike);
  }
  parts.maneSpikes = maneSpikes;

  group.add(headGroup);
  parts.head = headGroup;

  // --- bandana ---
  const bandana = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.13, 10), mat(C.bandana));
  bandana.position.y = 1.38;
  group.add(bandana);
  const bandanaTail = box(0.10, 0.26, 0.04, C.bandana);
  bandanaTail.position.set(0.16, 1.26, 0.20);
  bandanaTail.rotation.z = 0.4;
  group.add(bandanaTail);

  // --- arms (pivot at shoulders) ---
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.52, 1.28, 0);
    const upper = box(0.17, 0.42, 0.17, C.fur);
    upper.position.y = -0.18;
    arm.add(upper);
    const gauntlet = box(0.19, 0.16, 0.19, C.steel);
    gauntlet.position.y = -0.42;
    arm.add(gauntlet);
    const fist = sphere(0.115, C.furDark, 8, 6);
    fist.position.y = -0.54;
    arm.add(fist);
    group.add(arm);
    parts[side === -1 ? 'leftArm' : 'rightArm'] = arm;
  }

  // --- legs (pivot at hips) ---
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.20, 0.62, 0);
    const thigh = box(0.20, 0.34, 0.22, C.fur);
    thigh.position.y = -0.16;
    leg.add(thigh);
    const boot = box(0.22, 0.28, 0.30, C.boot);
    boot.position.set(0, -0.46, -0.04);
    leg.add(boot);
    const strap = box(0.24, 0.05, 0.32, C.steel);
    strap.position.set(0, -0.40, -0.04);
    leg.add(strap);
    group.add(leg);
    parts[side === -1 ? 'leftLeg' : 'rightLeg'] = leg;
  }

  // stubby bear tail
  const tail = sphere(0.10, C.furDark, 8, 6);
  tail.position.set(0, 0.75, 0.42);
  group.add(tail);

  // --- Arcane Guard shield mesh (hidden by default) ---
  const shieldMat = new THREE.MeshBasicMaterial({
    color: 0x40E0D0,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 12), shieldMat);
  shieldMesh.position.y = 0.9;
  group.add(shieldMesh);
  parts.shieldMesh = shieldMesh;
  parts.shieldMat = shieldMat;

  return { group, parts };
}

// Procedural animation driven by player state each frame.
export function animateTusk(parts, state, time, dt) {
  const { leftArm, rightArm, leftLeg, rightLeg, head, torso } = parts;

  // --- Fury mode visual effects ---
  updateFuryVisuals(parts, state, time, dt);

  // --- Shield visual ---
  updateShieldVisual(parts, state, time, dt);

  if (state.slamming) {
    // Bear Slam: fist-down dive pose — head tucked, one fist leading downward
    torso.rotation.x = lerpTo(torso.rotation.x, -0.3, dt, 20);
    head.rotation.x = lerpTo(head.rotation.x, -0.3, dt, 18);
    head.position.z = lerpTo(head.position.z, 0, dt, 12);
    // Right fist leading downward, left fist pulled back
    rightArm.rotation.x = lerpTo(rightArm.rotation.x, 3.0, dt, 20);
    leftArm.rotation.x = lerpTo(leftArm.rotation.x, -1.5, dt, 20);
    // Legs tucked up behind
    leftLeg.rotation.x = lerpTo(leftLeg.rotation.x, -1.2, dt, 20);
    rightLeg.rotation.x = lerpTo(rightLeg.rotation.x, -0.8, dt, 20);
    return;
  }

  if (state.slamRecovery) {
    // Ground pound impact: crouching, fist on ground
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
    // Wall cling: arms up gripping, legs tucked, slight lean toward wall
    torso.rotation.x = lerpTo(torso.rotation.x, 0.1, dt, 15);
    torso.position.y = lerpTo(torso.position.y, 1.0, dt, 12);
    head.rotation.x = lerpTo(head.rotation.x, -0.1, dt, 12);
    head.position.z = lerpTo(head.position.z, 0, dt, 12);
    // Arms reaching up (gripping wall)
    leftArm.rotation.x = lerpTo(leftArm.rotation.x, -2.8, dt, 15);
    rightArm.rotation.x = lerpTo(rightArm.rotation.x, -2.4, dt, 15);
    // Legs bent, feet against wall
    leftLeg.rotation.x = lerpTo(leftLeg.rotation.x, -0.5, dt, 12);
    rightLeg.rotation.x = lerpTo(rightLeg.rotation.x, -0.8, dt, 12);
    // Subtle slide animation
    const slide = Math.sin(time * 3) * 0.05;
    leftArm.rotation.x += slide;
    rightArm.rotation.x -= slide;
    return;
  }

  if (state.shielding) {
    // Shield stance: arms forward, braced, horn pointing forward
    torso.rotation.x = lerpTo(torso.rotation.x, -0.15, dt, 15);
    torso.position.y = lerpTo(torso.position.y, 0.95, dt, 12);
    head.rotation.x = lerpTo(head.rotation.x, -0.3, dt, 15);
    head.position.z = lerpTo(head.position.z, -0.15, dt, 15);
    // Arms in guard position (crossed in front)
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
    // horn charge: lean way forward, arms back, legs trailing
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
    // airborne: arms up, legs tucked; flip pose between rise and fall
    const rising = state.velY > 0;
    torso.rotation.x = lerpTo(torso.rotation.x, rising ? -0.15 : 0.12, dt, 10);
    leftArm.rotation.x = lerpTo(leftArm.rotation.x, rising ? -2.6 : -1.1, dt, 12);
    rightArm.rotation.x = lerpTo(rightArm.rotation.x, rising ? -2.6 : -1.1, dt, 12);
    leftLeg.rotation.x = lerpTo(leftLeg.rotation.x, rising ? -0.9 : -0.3, dt, 12);
    rightLeg.rotation.x = lerpTo(rightLeg.rotation.x, rising ? -0.5 : 0.2, dt, 12);
  } else if (state.speed > 0.5) {
    // run cycle
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
    // idle: slow breathing, fists ready
    const breathe = Math.sin(time * 2.2) * 0.03;
    torso.rotation.x = lerpTo(torso.rotation.x, 0.05, dt, 6);
    torso.position.y = 1.0 + breathe;
    leftArm.rotation.x = lerpTo(leftArm.rotation.x, -0.25 + breathe, dt, 6);
    rightArm.rotation.x = lerpTo(rightArm.rotation.x, -0.25 + breathe, dt, 6);
    leftLeg.rotation.x = lerpTo(leftLeg.rotation.x, 0, dt, 8);
    rightLeg.rotation.x = lerpTo(rightLeg.rotation.x, 0, dt, 8);
  }
}

// --- Fury mode visual effects ---
function updateFuryVisuals(parts, state, time, dt) {
  const { hornMat, pupils, maneSpikes } = parts;

  if (state.furyActive) {
    // Horn glows orange/red
    const pulse = (Math.sin(time * 8) + 1) / 2;
    hornMat.color.set(FURY_HORN);
    hornMat.emissive = hornMat.emissive || new THREE.Color();
    hornMat.emissive.set(FURY_EMISSIVE);
    hornMat.emissiveIntensity = 0.5 + pulse * 0.5;

    // Eyes glow
    for (const pupil of pupils) {
      pupil.material.color.set(FURY_EYE);
      pupil.material.emissive = pupil.material.emissive || new THREE.Color();
      pupil.material.emissive.set(FURY_EMISSIVE);
      pupil.material.emissiveIntensity = 0.6;
    }

    // Mane spikes pulse brighter
    for (let i = 0; i < maneSpikes.length; i++) {
      const sp = maneSpikes[i];
      sp.material.emissive = sp.material.emissive || new THREE.Color();
      sp.material.emissive.set(0x442200);
      sp.material.emissiveIntensity = 0.3 + pulse * 0.3;
    }

    // Slight scale pulse on the whole character
    const scalePulse = 1.0 + Math.sin(time * 6) * 0.015;
    parts.torso.scale.setScalar(scalePulse);
  } else {
    // Reset to normal colors
    hornMat.color.set(C.horn);
    if (hornMat.emissive) hornMat.emissiveIntensity = 0;

    for (const pupil of pupils) {
      pupil.material.color.set(C.eye);
      if (pupil.material.emissive) pupil.material.emissiveIntensity = 0;
    }

    for (const sp of maneSpikes) {
      if (sp.material.emissive) sp.material.emissiveIntensity = 0;
    }

    parts.torso.scale.setScalar(1);
  }
}

// --- Shield visual ---
function updateShieldVisual(parts, state, time, dt) {
  const { shieldMat, shieldMesh } = parts;

  if (state.shielding) {
    // Fade shield in, pulse gently
    const targetOpacity = 0.25 + Math.sin(time * 4) * 0.05;
    shieldMat.opacity = lerpTo(shieldMat.opacity, targetOpacity, dt, 8);
    shieldMesh.rotation.y = time * 1.5;
    shieldMesh.rotation.x = time * 0.7;
  } else {
    // Fade shield out
    shieldMat.opacity = lerpTo(shieldMat.opacity, 0, dt, 12);
  }
}

function lerpTo(current, target, dt, rate) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}
