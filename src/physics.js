import * as THREE from 'three';

// Axis-aligned box collision world. The player is an AABB moved axis-by-axis,
// which gives the crisp, predictable feel platformers want.
export class PhysicsWorld {
  constructor() {
    this.colliders = []; // { box: THREE.Box3, mesh, isMover, delta: Vector3 }
    this._wallNormal = new THREE.Vector3(); // reusable
  }

  addBox(center, size, opts = {}) {
    const half = new THREE.Vector3(size.x / 2, size.y / 2, size.z / 2);
    const box = new THREE.Box3(
      new THREE.Vector3().copy(center).sub(half),
      new THREE.Vector3().copy(center).add(half)
    );
    const col = { box, half, center: center.clone(), delta: new THREE.Vector3(), ...opts };
    this.colliders.push(col);
    return col;
  }

  moveCollider(col, newCenter) {
    col.delta.copy(newCenter).sub(col.center);
    col.center.copy(newCenter);
    col.box.min.copy(newCenter).sub(col.half);
    col.box.max.copy(newCenter).add(col.half);
  }

  // Moves an AABB (center + halfExtents) by `displacement`, resolving collisions.
  // Returns { position, grounded, groundCollider, hitCeiling, hitWall }.
  moveAABB(center, half, displacement) {
    const pos = center.clone();
    const result = { grounded: false, groundCollider: null, hitCeiling: false, hitWall: false, wallNormal: null, wallCollider: null };

    // Y axis
    pos.y += displacement.y;
    for (const col of this.colliders) {
      if (!this._overlaps(pos, half, col.box)) continue;
      if (displacement.y <= 0 && center.y - half.y >= col.box.max.y - 0.3) {
        pos.y = col.box.max.y + half.y;
        result.grounded = true;
        result.groundCollider = col;
      } else if (displacement.y > 0 && center.y + half.y <= col.box.min.y + 0.3) {
        pos.y = col.box.min.y - half.y;
        result.hitCeiling = true;
      }
    }

    // X axis
    pos.x += displacement.x;
    for (const col of this.colliders) {
      if (!this._overlaps(pos, half, col.box)) continue;
      if (displacement.x > 0) pos.x = col.box.min.x - half.x;
      else if (displacement.x < 0) pos.x = col.box.max.x + half.x;
      result.hitWall = true;
      this._wallNormal.set(displacement.x > 0 ? -1 : 1, 0, 0);
      result.wallNormal = this._wallNormal;
      result.wallCollider = col;
    }

    // Z axis
    pos.z += displacement.z;
    for (const col of this.colliders) {
      if (!this._overlaps(pos, half, col.box)) continue;
      if (displacement.z > 0) pos.z = col.box.min.z - half.z;
      else if (displacement.z < 0) pos.z = col.box.max.z + half.z;
      result.hitWall = true;
      this._wallNormal.set(0, 0, displacement.z > 0 ? -1 : 1);
      result.wallNormal = this._wallNormal;
      result.wallCollider = col;
    }

    result.position = pos;
    return result;
  }

  _overlaps(center, half, box) {
    const EPS = 0.001;
    return (
      center.x - half.x < box.max.x - EPS && center.x + half.x > box.min.x + EPS &&
      center.y - half.y < box.max.y - EPS && center.y + half.y > box.min.y + EPS &&
      center.z - half.z < box.max.z - EPS && center.z + half.z > box.min.z + EPS
    );
  }
}
