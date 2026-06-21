import * as THREE from 'three';
import { Enemy } from './enemy.js';
import { grassTexture, dirtTexture, stoneTexture, wallTexture, crystalTexture, metalTexture } from './textures.js';

const GRASS = 0x4CB860;
const DIRT = 0x6A4A38;
const ROCK = 0x4A3F55;
const CRYSTAL = 0x46D8FF;
const WALL_COLOR = 0x5A5070;

export class Level {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
    this.crystals = [];
    this.enemies = [];
    this.spikes = [];      // THREE.Box3 hazard volumes
    this.checkpoints = []; // { position, radius, mesh, flag, activated }
    this.movers = [];      // { collider, mesh, a, b, period, phase }
    this.goal = null;
    this.spawn = new THREE.Vector3(0, 0.5, 0);
    this.totalCrystals = 0;

    this._mats = {
      grass: new THREE.MeshStandardMaterial({ map: grassTexture(), color: 0x4CB860, roughness: 0.85, metalness: 0.0 }),
      dirt: new THREE.MeshStandardMaterial({ map: dirtTexture(), color: 0x6A4A38, roughness: 0.92, metalness: 0.0 }),
      rock: new THREE.MeshStandardMaterial({ map: stoneTexture(), color: 0x4A3F55, roughness: 0.88, metalness: 0.05 }),
      mover: new THREE.MeshStandardMaterial({ map: metalTexture(0x7A5CC8), color: 0x7A5CC8, roughness: 0.4, metalness: 0.6, emissive: 0x2A1848, emissiveIntensity: 0.15 }),
      crystal: new THREE.MeshStandardMaterial({ map: crystalTexture(), color: 0x46D8FF, roughness: 0.15, metalness: 0.3, emissive: 0x1A6E88, emissiveIntensity: 0.8 }),
      spike: new THREE.MeshStandardMaterial({ color: 0x33303D, roughness: 0.7, metalness: 0.3 }),
      spikeTip: new THREE.MeshStandardMaterial({ color: 0xB8B4C8, roughness: 0.3, metalness: 0.6 }),
      wall: new THREE.MeshStandardMaterial({ map: wallTexture(), color: 0x5A5070, roughness: 0.82, metalness: 0.05 }),
    };

    this._build();
  }

  // y in island() is the WALKING SURFACE height.
  _build() {
    // 1. start island
    this.island(0, 0, 0, 11, 11);
    this.addCheckpoint(0, 0, 2, true);

    // 2. first hops
    this.island(0, 0, -12, 6, 6);
    this.addCrystal(0, 1.2, -12);
    this.island(3, 1, -21, 5, 5);
    this.addCrystal(3, 2.2, -21);
    this.island(-2, 2, -30, 5, 5);
    this.addCrystal(-2, 3.2, -30);

    // 3. wide island, first scrapbot
    this.island(0, 2, -42, 12, 10);
    this.addEnemy(new THREE.Vector3(-4, 2, -42), new THREE.Vector3(4, 2, -42));
    this.addCrystal(-4, 3.2, -45);
    this.addCrystal(0, 3.2, -45.5);
    this.addCrystal(4, 3.2, -45);

    // 4. moving platform crossing
    this.addMover(new THREE.Vector3(0, 2, -52), new THREE.Vector3(0, 2.5, -64), 3.4);
    this.island(0, 3, -70, 8, 8);
    this.addCheckpoint(0, 3, -70);
    this.addCrystal(0, 4.4, -67);

    // 5. spike gauntlet
    this.island(0, 3, -82, 10, 9);
    this.addSpikes(-2.5, 3, -80, 2.5, 2.5);
    this.addSpikes(2.5, 3, -82, 2.5, 2.5);
    this.addSpikes(-2.5, 3, -84.5, 2.5, 2.5);
    this.addCrystal(0, 4.2, -80);
    this.addCrystal(3.7, 4.2, -85);

    // ============================================
    // 6. WALL JUMP SHAFT — new vertical challenge
    // ============================================
    // Landing platform at the base
    this.island(0, 3, -93, 6, 6);
    this.addCheckpoint(0, 3, -93);

    // Wall jump shaft: two tall walls facing each other
    // Player must wall-jump between them to ascend
    this.addWall(-3, 3, -99, 1.5, 12, 4);   // left wall
    this.addWall(3, 3, -99, 1.5, 12, 4);    // right wall

    // Crystals up the shaft to guide the player
    this.addCrystal(-1.5, 5.5, -99);
    this.addCrystal(1.5, 7.5, -99);
    this.addCrystal(-1.5, 9.5, -99);
    this.addCrystal(1.5, 11.5, -99);

    // Landing platform at the top of the shaft
    this.island(0, 14, -99, 6, 6);
    this.addCrystal(0, 15.2, -99);

    // ============================================
    // 7. GROUND POUND ARENA — slam showcase
    // ============================================
    // Bridge to arena
    this.island(0, 14, -108, 4, 6);

    // Large arena island with multiple enemies — ground pound territory
    this.island(0, 14, -118, 16, 14);
    this.addCheckpoint(-6, 14, -115);

    // Pack of enemies — ideal for ground pound shockwave
    this.addEnemy(new THREE.Vector3(-3, 14, -118), new THREE.Vector3(3, 14, -118), 2.5);
    this.addEnemy(new THREE.Vector3(-2, 14, -121), new THREE.Vector3(2, 14, -121), 2.0);
    this.addEnemy(new THREE.Vector3(0, 14, -115), new THREE.Vector3(0, 14, -115), 0); // stationary
    this.addCrystal(-5, 15.2, -120);
    this.addCrystal(5, 15.2, -120);
    this.addCrystal(0, 15.2, -122);

    // Jump pads (small islands above the arena for aerial slam attacks)
    this.island(-4, 17, -118, 2, 2);
    this.island(4, 17, -118, 2, 2);

    // ============================================
    // 8. MIXED CHALLENGE — uses all abilities
    // ============================================
    // Moving platform over gap
    this.addMover(new THREE.Vector3(0, 14, -130), new THREE.Vector3(0, 16, -140), 3.4, 8);

    // Second wall jump section (shorter, tighter)
    this.island(0, 16, -145, 5, 5);
    this.addWall(-2.5, 16, -150, 1.2, 8, 3);
    this.addWall(2.5, 16, -150, 1.2, 8, 3);
    this.addCrystal(0, 19, -150);
    this.addCrystal(0, 21, -150);

    // Top platform with spike + enemy gauntlet
    this.island(0, 23, -150, 8, 8);
    this.addCheckpoint(0, 23, -147);
    this.addSpikes(-2, 23, -151, 2, 2);
    this.addSpikes(2, 23, -151, 2, 2);
    this.addEnemy(new THREE.Vector3(-2, 23, -148), new THREE.Vector3(2, 23, -148), 2.8);

    // ============================================
    // 9. FINAL ASCENT + GOAL
    // ============================================
    this.addMover(new THREE.Vector3(0, 23, -158), new THREE.Vector3(0, 26, -168), 3.4, 9);
    this.island(0, 26.5, -175, 10, 10);
    this.addCrystal(-3, 27.7, -173);
    this.addCrystal(3, 27.7, -173);
    this.addCrystal(0, 27.7, -177);
    this.addGoal(0, 26.5, -177);

    this._addDecor();
  }

  island(x, surfaceY, z, w, d, thickness = 1.6) {
    // grass cap
    const capH = 0.45;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w, capH, d), this._mats.grass);
    cap.position.set(x, surfaceY - capH / 2, z);
    cap.receiveShadow = true;
    this.scene.add(cap);
    // dirt body
    const body = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, thickness - capH, d * 0.96), this._mats.dirt);
    body.position.set(x, surfaceY - capH - (thickness - capH) / 2, z);
    this.scene.add(body);
    // rocky underside
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(Math.min(w, d) * 0.45, Math.min(w, d) * 0.7, 6),
      this._mats.rock
    );
    tip.rotation.x = Math.PI;
    tip.position.set(x, surfaceY - thickness - Math.min(w, d) * 0.34, z);
    this.scene.add(tip);

    this.physics.addBox(
      new THREE.Vector3(x, surfaceY - thickness / 2, z),
      new THREE.Vector3(w, thickness, d)
    );
  }

  // Tall wall for wall-jump sections
  addWall(x, baseY, z, thickness, height, depth) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(thickness, height, depth),
      this._mats.wall
    );
    mesh.position.set(x, baseY + height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // Add scoring marks / grip texture (visual only)
    const lines = Math.floor(height / 1.5);
    for (let i = 0; i < lines; i++) {
      const mark = new THREE.Mesh(
        new THREE.BoxGeometry(thickness + 0.02, 0.06, depth * 0.8),
        new THREE.MeshStandardMaterial({ color: 0x3A3050, roughness: 0.9, metalness: 0 })
      );
      mark.position.set(x, baseY + 1 + i * 1.5, z);
      this.scene.add(mark);
    }

    this.physics.addBox(
      new THREE.Vector3(x, baseY + height / 2, z),
      new THREE.Vector3(thickness, height, depth)
    );
  }

  addMover(a, b, size, period = 7) {
    const h = 0.5;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, h, size), this._mats.mover);
    mesh.receiveShadow = true;
    // Glowing edge trim
    const trimGeo = new THREE.BoxGeometry(size + 0.1, 0.08, size + 0.1);
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x9B6FFF, emissive: 0x6040C0, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.5 });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.y = 0.26; // top edge of platform
    mesh.add(trim);
    this.scene.add(mesh);
    const collider = this.physics.addBox(
      new THREE.Vector3(a.x, a.y - h / 2, a.z),
      new THREE.Vector3(size, h, size),
      { isMover: true }
    );
    this.movers.push({ collider, mesh, a: a.clone(), b: b.clone(), period, phase: 0 });
  }

  addCrystal(x, y, z) {
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), this._mats.crystal);
    mesh.position.set(x, y, z);
    mesh.scale.y = 1.5;
    this.scene.add(mesh);
    this.crystals.push({ mesh, position: new THREE.Vector3(x, y, z), collected: false, baseY: y });
    this.totalCrystals++;
  }

  addSpikes(x, surfaceY, z, w, d) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), this._mats.spike);
    pad.position.set(x, surfaceY + 0.06, z);
    this.scene.add(pad);
    const nx = Math.floor(w / 0.7), nz = Math.floor(d / 0.7);
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 5), this._mats.spikeTip);
        spike.position.set(
          x - w / 2 + (i + 0.5) * (w / nx),
          surfaceY + 0.33,
          z - d / 2 + (j + 0.5) * (d / nz)
        );
        this.scene.add(spike);
      }
    }
    this.spikes.push(new THREE.Box3(
      new THREE.Vector3(x - w / 2, surfaceY, z - d / 2),
      new THREE.Vector3(x + w / 2, surfaceY + 0.6, z + d / 2)
    ));
  }

  addCheckpoint(x, surfaceY, z, isSpawn = false) {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: 0xCCCCCC, roughness: 0.3, metalness: 0.7 })
    );
    pole.position.y = 1.2;
    group.add(pole);
    const flagMat = new THREE.MeshStandardMaterial({ color: 0x888888, side: THREE.DoubleSide, roughness: 0.8, metalness: 0 });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), flagMat);
    flag.position.set(0.45, 2.0, 0);
    group.add(flag);
    group.position.set(x, surfaceY, z);
    this.scene.add(group);

    const cp = {
      position: new THREE.Vector3(x, surfaceY, z),
      radius: 3.2,
      flagMat,
      activated: isSpawn,
    };
    if (isSpawn) {
      flagMat.color.set(0xD03030);
      this.spawn.copy(cp.position);
    }
    this.checkpoints.push(cp);
  }

  addGoal(x, surfaceY, z) {
    const group = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.22, 10, 28),
      new THREE.MeshStandardMaterial({ color: 0xFFD75E, emissive: 0x886600, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.8 })
    );
    ring.position.y = 2.2;
    group.add(ring);
    const core = new THREE.Mesh(
      new THREE.CircleGeometry(1.4, 24),
      new THREE.MeshBasicMaterial({ color: 0x9FE8FF, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    core.position.y = 2.2;
    group.add(core);
    group.position.set(x, surfaceY, z);
    this.scene.add(group);
    this.goal = { position: new THREE.Vector3(x, surfaceY + 2.2, z), radius: 1.8, group, ring };
  }

  addEnemy(a, b, speed) {
    this.enemies.push(new Enemy(this.scene, a, b, speed));
  }

  _addDecor() {
    // drifting puffy clouds
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xEDE6F5, roughness: 1.0, metalness: 0.0 });
    for (let i = 0; i < 14; i++) {
      const cloud = new THREE.Group();
      const n = 3 + (i % 3);
      for (let j = 0; j < n; j++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1.6 + (j % 2), 8, 6), cloudMat);
        puff.position.set(j * 1.8 - n, (j % 2) * 0.5, (j % 2) * 0.8);
        puff.scale.y = 0.55;
        cloud.add(puff);
      }
      const side = i % 2 === 0 ? 1 : -1;
      cloud.position.set(side * (16 + (i * 7) % 20), 2 + (i * 3.1) % 14, -i * 13 - 5);
      this.scene.add(cloud);
    }
    // small floating rocks for depth
    const rockGeo = new THREE.DodecahedronGeometry(0.9);
    for (let i = 0; i < 10; i++) {
      const rock = new THREE.Mesh(rockGeo, this._mats.rock);
      const side = i % 2 === 0 ? 1 : -1;
      rock.position.set(side * (9 + (i * 5) % 12), -3 + (i * 2.3) % 16, -i * 16 - 10);
      rock.rotation.set(i, i * 2, i * 3);
      this.scene.add(rock);
    }
  }

  update(dt, time) {
    for (const m of this.movers) {
      m.phase += dt;
      const s = (Math.sin((m.phase / m.period) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      const center = new THREE.Vector3().lerpVectors(m.a, m.b, s);
      center.y -= 0.25; // collider center is below the surface
      this.physics.moveCollider(m.collider, center);
      m.mesh.position.copy(center);
    }
    for (const c of this.crystals) {
      if (c.collected) continue;
      c.mesh.rotation.y = time * 2;
      c.mesh.position.y = c.baseY + Math.sin(time * 3 + c.position.x) * 0.15;
    }
    for (const e of this.enemies) e.update(dt, time);
    if (this.goal) this.goal.ring.rotation.z = time * 0.8;
  }
}
