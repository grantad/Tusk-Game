import * as THREE from 'three';

// Scrapbot: a stompable, horn-chargeable patrol enemy built from primitives.
export class Enemy {
  constructor(scene, pointA, pointB, speed = 2.2) {
    this.a = pointA.clone();
    this.b = pointB.clone();
    this.speed = speed;
    this.alive = true;
    this.t = 0;
    this.dyingTimer = 0;
    this.radius = 0.55;
    this.height = 0.9;

    const g = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x8A4030 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x2A2A33 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), bodyMat);
    body.position.y = 0.5;
    body.scale.y = 0.8;
    body.castShadow = true;
    g.add(body);

    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xFFD040, emissive: 0xAA6000 })
    );
    eye.position.set(0, 0.58, -0.38);
    g.add(eye);
    this.eye = eye;

    for (const side of [-1, 1]) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 6), darkMat);
      spike.position.set(side * 0.3, 0.92, 0);
      g.add(spike);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), darkMat);
      leg.position.set(side * 0.22, 0.15, 0);
      g.add(leg);
      this[side === -1 ? 'legL' : 'legR'] = leg;
    }

    this.mesh = g;
    this.position = this.a.clone();
    scene.add(g);
  }

  update(dt, time) {
    if (!this.alive) {
      if (this.dyingTimer > 0) {
        this.dyingTimer -= dt;
        this.mesh.scale.multiplyScalar(Math.max(0.01, 1 - dt * 9));
        this.mesh.rotation.y += dt * 20;
        if (this.dyingTimer <= 0) this.mesh.visible = false;
      }
      return;
    }
    const dist = this.a.distanceTo(this.b);
    const prev = this.position.clone();
    if (dist > 1e-6) {
      this.t += dt * this.speed / dist;
      const s = (Math.sin(this.t * Math.PI * 2) + 1) / 2; // smooth ping-pong
      this.position.lerpVectors(this.a, this.b, s);
    } else {
      this.position.copy(this.a);
    }
    this.mesh.position.copy(this.position);

    const dir = this.position.clone().sub(prev);
    if (dir.lengthSq() > 1e-8) {
      this.mesh.rotation.y = Math.atan2(-dir.x, -dir.z);
    }
    const wob = Math.sin(time * 14) * 0.25;
    this.legL.rotation.x = wob;
    this.legR.rotation.x = -wob;
  }

  kill() {
    this.alive = false;
    this.dyingTimer = 0.35;
  }
}
