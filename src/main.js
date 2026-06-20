import * as THREE from 'three';
import { Input } from './input.js';
import { PhysicsWorld } from './physics.js';
import { FollowCamera } from './camera.js';
import { Player } from './player.js';
import { Level } from './level.js';
import { Hud, Screens } from './hud.js';
import { Sfx } from './audio.js';

const KILL_Y = -8;
const SLAM_SHOCKWAVE_RADIUS = 4;
const THUNDER_POUNCE_RADIUS = 3;
const FURY_CRYSTAL_CHARGE = 0.20;   // +20% fury per crystal
const FURY_KILL_CHARGE = 0.25;      // +25% fury per enemy kill

// --- renderer / scene ---
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87B8E8);
scene.fog = new THREE.Fog(0x87B8E8, 50, 150);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);

const hemi = new THREE.HemisphereLight(0xCFE8FF, 0x5A4A6A, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xFFF2D8, 1.4);
sun.position.set(20, 40, 10);
scene.add(sun);

const input = new Input();

// Shadows only on non-touch devices (mobile GPU budget)
if (!input.isTouch) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -120;
  sun.shadow.camera.far = 200;
}

// --- game objects ---
const physics = new PhysicsWorld();
const level = new Level(scene, physics);
const player = new Player(scene, physics);
const followCam = new FollowCamera(camera, physics);
const hud = new Hud();
const screens = new Screens();
const sfx = new Sfx();

let state = 'title'; // title | playing | dead | won
let crystalCount = 0;
let respawnPoint = level.spawn.clone();

// Reusable objects to avoid per-frame allocations
const _playerBox = new THREE.Box3();
const _tmpVec = new THREE.Vector3();

// --- shockwave visual effects ---
const shockwaveRings = []; // { mesh, age, maxAge }

function createShockwaveRing(position, radius, color = 0xFFD75E) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.08, 8, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(position);
  ring.position.y += 0.1;
  scene.add(ring);
  shockwaveRings.push({ mesh: ring, age: 0, maxAge: 0.4, targetRadius: radius });
}

function updateShockwaveRings(dt) {
  for (let i = shockwaveRings.length - 1; i >= 0; i--) {
    const sw = shockwaveRings[i];
    sw.age += dt;
    const t = sw.age / sw.maxAge;
    const scale = 1 + t * sw.targetRadius;
    sw.mesh.scale.set(scale, scale, scale);
    sw.mesh.material.opacity = 0.9 * (1 - t);
    if (sw.age >= sw.maxAge) {
      scene.remove(sw.mesh);
      sw.mesh.geometry.dispose();
      sw.mesh.material.dispose();
      shockwaveRings.splice(i, 1);
    }
  }
}

const playerEvents = {
  onJump: (isDouble) => (isDouble ? sfx.doubleJump() : sfx.jump()),
  onCharge: () => sfx.charge(),
  onHurt: () => sfx.hurt(),
  onLand: () => {},
  // Phase 1 events
  onSlam: () => sfx.groundPound(),
  onSlamLand: () => {
    sfx.groundPound();
    createShockwaveRing(player.slamPosition, SLAM_SHOCKWAVE_RADIUS);
  },
  onWallCling: () => sfx.wallCling(),
  onWallJump: () => sfx.jump(),
  onShieldBreak: () => sfx.shieldBreak(),
  onFuryActivate: () => {
    sfx.furyActivate();
    hud.setFuryActive(true);
    hud.flashMessage('🔥 FURY MODE! 🔥', 1500);
  },
  onFuryEnd: () => {
    hud.setFuryActive(false);
    hud.flashMessage('Fury faded...', 1000);
  },
  onThunderPounce: () => {
    sfx.thunderPounce();
    sfx.doubleJump();
    hud.flashMessage('⚡ THUNDER POUNCE! ⚡', 800);
  },
};

function startGame() {
  sfx.unlock();
  crystalCount = 0;
  respawnPoint = level.spawn.clone();
  for (const c of level.crystals) {
    c.collected = false;
    c.mesh.visible = true;
  }
  for (const cp of level.checkpoints) {
    cp.activated = cp.position.equals(level.spawn);
    cp.flagMat.color.set(cp.activated ? 0xD03030 : 0x888888);
  }
  for (const e of level.enemies) {
    e.alive = true;
    e.mesh.visible = true;
    e.mesh.scale.set(1, 1, 1);
    e.dyingTimer = 0;
  }
  player.healFull();
  player.furyMeter = 0;
  player.furyActive = false;
  player.spawnAt(respawnPoint);
  followCam.yaw = 0;
  followCam.pitch = 0.35;
  followCam.initialized = false;
  hud.setHearts(player.hearts);
  hud.setCrystals(0, level.totalCrystals);
  hud.setFury(0);
  hud.setFuryActive(false);
  hud.show();
  screens.hideAll();
  state = 'playing';
}

document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-replay').addEventListener('click', startGame);
document.getElementById('btn-retry').addEventListener('click', () => {
  sfx.unlock();
  player.healFull();
  player.spawnAt(respawnPoint);
  followCam.initialized = false;
  hud.setHearts(player.hearts);
  screens.hideAll();
  state = 'playing';
});

function respawn(loseHeart) {
  if (loseHeart) {
    player.hearts--;
    sfx.hurt();
  }
  hud.setHearts(Math.max(0, player.hearts));
  if (player.hearts <= 0) {
    die();
    return;
  }
  player.spawnAt(respawnPoint);
  followCam.initialized = false;
}

function die() {
  state = 'dead';
  sfx.death();
  screens.showDeath();
}

function winGame() {
  state = 'won';
  sfx.win();
  hud.hide();
  screens.showWin(crystalCount, level.totalCrystals);
}

function killEnemy(e, message) {
  e.kill();
  sfx.stomp();
  player.addFury(FURY_KILL_CHARGE);
  hud.setFury(player.furyMeter);
  hud.flashMessage(message, 900);
}

function updateGameplay(dt) {
  player.update(dt, input, followCam, playerEvents);

  // fell off the world
  if (player.position.y < KILL_Y) {
    respawn(true);
    return;
  }

  const playerFeet = player.position.y - player.half.y;
  _playerBox.min.copy(player.position).sub(player.half);
  _playerBox.max.copy(player.position).add(player.half);

  // --- Bear Slam shockwave: damage enemies in radius on landing ---
  if (player.slamLanded) {
    for (const e of level.enemies) {
      if (!e.alive) continue;
      const dist = e.position.distanceTo(player.slamPosition);
      if (dist < SLAM_SHOCKWAVE_RADIUS) {
        killEnemy(e, '💥 GROUND POUND!');
      }
    }
  }

  // crystals
  for (const c of level.crystals) {
    if (c.collected) continue;
    if (c.position.distanceToSquared(player.position) < 1.4) {
      c.collected = true;
      c.mesh.visible = false;
      crystalCount++;
      hud.setCrystals(crystalCount, level.totalCrystals);
      sfx.collect();
      // Fury meter charge on crystal collect
      player.addFury(FURY_CRYSTAL_CHARGE);
      hud.setFury(player.furyMeter);
    }
  }

  // spikes
  for (const s of level.spikes) {
    if (s.intersectsBox(_playerBox)) {
      s.getCenter(_tmpVec);
      if (player.takeDamage(_tmpVec, playerEvents)) {
        hud.setHearts(Math.max(0, player.hearts));
        if (player.dead) { die(); return; }
      }
      break;
    }
  }

  // enemies
  for (const e of level.enemies) {
    if (!e.alive) continue;
    const dx = e.position.x - player.position.x;
    const dz = e.position.z - player.position.z;
    const horiz = Math.hypot(dx, dz);
    const enemyTop = e.position.y + e.height;
    if (horiz > e.radius + player.half.x) continue;
    if (playerFeet > enemyTop - 0.35 || player.position.y - 0.2 > enemyTop) {
      // stomp
      if (player.velocity.y < 0 && playerFeet < enemyTop + 0.5) {
        player.velocity.y = 10;
        killEnemy(e, 'SQUASHED!');
      }
    } else if (player.isCharging) {
      killEnemy(e, 'HORN SMASH!');
    } else if (player.isSlamming) {
      // Slam hits enemy directly (before landing)
      killEnemy(e, '💥 SLAM!');
    } else if (Math.abs(player.position.y - (e.position.y + e.height / 2)) < 1.4) {
      if (player.takeDamage(e.position, playerEvents)) {
        hud.setHearts(Math.max(0, player.hearts));
        if (player.dead) { die(); return; }
      }
    }
  }

  // checkpoints
  for (const cp of level.checkpoints) {
    if (cp.activated) continue;
    if (cp.position.distanceTo(player.position) < cp.radius) {
      cp.activated = true;
      cp.flagMat.color.set(0xD03030);
      respawnPoint = cp.position.clone();
      sfx.checkpoint();
      hud.flashMessage('CHECKPOINT!');
    }
  }

  // goal
  if (level.goal && level.goal.position.distanceTo(player.position) < level.goal.radius) {
    winGame();
  }

  // Update fury meter HUD each frame
  hud.setFury(player.furyMeter);

  // Shield activation sound (continuous gentle hum)
  if (player.shielding && !player._shieldSoundPlayed) {
    sfx.shield();
    player._shieldSoundPlayed = true;
  }
  if (!player.shielding) {
    player._shieldSoundPlayed = false;
  }
}

// --- main loop ---
let lastT = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min((now - lastT) / 1000, 1 / 20);
  lastT = now;
  const time = now / 1000;

  input.poll();

  if (state === 'playing') {
    followCam.applyLook(input.lookDX, input.lookDY);
    level.update(dt, time);
    updateGameplay(dt);
    updateShockwaveRings(dt);
    followCam.update(player.mesh.position, dt);
  } else {
    // idle camera drift on menus
    level.update(dt, time);
    updateShockwaveRings(dt);
    const r = 14;
    camera.position.set(Math.sin(time * 0.1) * r, 6, Math.cos(time * 0.1) * r);
    camera.lookAt(0, 1, -10);
  }

  input.endFrame();
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

window.__game = { player, level, followCam, input };

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
