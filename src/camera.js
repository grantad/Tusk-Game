import * as THREE from 'three';

export class FollowCamera {
  constructor(camera, physics) {
    this.camera = camera;
    this.physics = physics;
    this.yaw = 0;             // camera at +Z behind the player, level extends toward -Z
    this.pitch = 0.35;
    this.distance = 8.5;
    this.targetOffset = new THREE.Vector3(0, 1.6, 0);
    this.smoothPos = new THREE.Vector3();
    this.initialized = false;
  }

  applyLook(dx, dy) {
    this.yaw -= dx * 0.0035;
    this.pitch += dy * 0.0035;
    this.pitch = Math.max(-0.2, Math.min(1.2, this.pitch));
  }

  update(playerPos, dt) {
    const target = playerPos.clone().add(this.targetOffset);
    const dir = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    const desired = target.clone().add(dir.clone().multiplyScalar(this.distance));

    if (!this.initialized) {
      this.smoothPos.copy(desired);
      this.initialized = true;
    } else {
      const k = 1 - Math.exp(-10 * dt);
      this.smoothPos.lerp(desired, k);
    }

    this.camera.position.copy(this.smoothPos);
    this.camera.lookAt(target);
  }

  // Direction the camera faces projected onto the ground plane (for movement).
  getForward() {
    const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    return f.normalize();
  }

  getRight() {
    const f = this.getForward();
    return new THREE.Vector3(-f.z, 0, f.x);
  }
}
