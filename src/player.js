import * as THREE from 'three';
import { createTusk, animateTusk } from './tusk.js';

const GRAVITY = -32;
const RUN_SPEED = 8;
const ACCEL = 50;
const AIR_ACCEL = 28;
const JUMP_VEL = 12.5;
const DOUBLE_JUMP_VEL = 11;
const COYOTE_TIME = 0.12;
const JUMP_BUFFER = 0.12;
const CHARGE_SPEED = 19;
const CHARGE_TIME = 0.32;
const CHARGE_COOLDOWN = 0.7;
const INVULN_TIME = 1.2;
const MAX_HEARTS = 3;

// --- Phase 1 ability constants ---
const SLAM_VEL = -35;             // rapid downward speed during bear slam
const SLAM_SHOCKWAVE_RADIUS = 4;  // enemy kill radius on ground pound landing
const SLAM_RECOVERY = 0.25;       // brief recovery time after landing a slam

const WALL_SLIDE_GRAVITY = -4;    // slow fall while clinging
const WALL_SLIDE_MAX_TIME = 1.5;  // auto-detach after this
const WALL_JUMP_UP_VEL = 11;     // upward velocity from wall jump
const WALL_JUMP_PUSH_VEL = 8;    // push-away velocity from wall jump

const SHIELD_COOLDOWN = 3.0;      // cooldown after shield absorbs a hit

const FURY_DURATION = 8.0;        // seconds fury mode lasts
const FURY_SPEED_MULT = 1.5;      // speed multiplier during fury
const FURY_CHARGE_SPEED = 24;     // horn charge speed during fury

const THUNDER_POUNCE_VEL = 13;   // upward velocity for thunder pounce
const THUNDER_POUNCE_RADIUS = 3; // damage radius on thunder pounce landing

export class Player {
  constructor(scene, physics) {
    this.physics = physics;
    this.half = new THREE.Vector3(0.42, 0.88, 0.42);
    this.position = new THREE.Vector3(); // AABB center
    this.velocity = new THREE.Vector3();
    this.facing = 0; // yaw of the model
    this.grounded = false;
    this.jumpsLeft = 0;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.charging = 0;
    this.chargeCooldown = 0;
    this.chargeDir = new THREE.Vector3();
    this.invuln = 0;
    this.blinkUntil = 0;
    this.hearts = MAX_HEARTS;
    this.dead = false;
    this.time = 0;

    // --- Phase 1 ability state ---
    // Bear Slam
    this.slamming = false;         // true while diving downward
    this.slamRecovery = 0;         // brief ground-pound landing recovery
    this.slamLanded = false;       // set to true on the frame slam hits ground (read by main.js)
    this.slamPosition = new THREE.Vector3(); // position where slam landed

    // Wall Crush
    this.wallSliding = false;
    this.wallSlideTime = 0;
    this.wallNormal = new THREE.Vector3();

    // Arcane Guard
    this.shielding = false;
    this.shieldCooldown = 0;
    this.shieldBroken = false;     // set true when shield absorbs a hit (read by main.js)

    // Fury Mode
    this.furyMeter = 0;            // 0..1
    this.furyActive = false;
    this.furyTimer = 0;

    // Thunder Pounce
    this.thunderPounced = false;   // set true when thunder pounce lands (read by main.js)
    this.thunderPosition = new THREE.Vector3();

    const { group, parts } = createTusk();
    this.mesh = group;
    this.parts = parts;
    scene.add(group);
  }

  spawnAt(point) {
    this.position.set(point.x, point.y + this.half.y + 0.05, point.z);
    this.velocity.set(0, 0, 0);
    this.charging = 0;
    this.invuln = 1.0;
    this.dead = false;
    this.mesh.visible = true;
    this.slamming = false;
    this.slamRecovery = 0;
    this.wallSliding = false;
    this.shielding = false;
    this.shieldCooldown = 0;
    // Don't reset fury meter on respawn — keep progress
  }

  get speed() {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  // Add fury meter charge (called from main.js on crystal collect / enemy kill)
  addFury(amount) {
    if (this.furyActive) return; // don't charge while active
    this.furyMeter = Math.min(1, this.furyMeter + amount);
  }

  update(dt, input, cam, events) {
    this.time += dt;
    this.coyote = Math.max(0, this.coyote - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.chargeCooldown = Math.max(0, this.chargeCooldown - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.slamRecovery = Math.max(0, this.slamRecovery - dt);
    this.shieldCooldown = Math.max(0, this.shieldCooldown - dt);

    // Clear per-frame event flags
    this.slamLanded = false;
    this.shieldBroken = false;
    this.thunderPounced = false;

    // --- fury mode timer ---
    if (this.furyActive) {
      this.furyTimer -= dt;
      this.furyMeter = Math.max(0, this.furyTimer / FURY_DURATION);
      if (this.furyTimer <= 0) {
        this.furyActive = false;
        this.furyMeter = 0;
        events.onFuryEnd?.();
      }
    }

    // --- fury activation ---
    if (input.furyPressed && !this.furyActive && this.furyMeter >= 1) {
      this.furyActive = true;
      this.furyTimer = FURY_DURATION;
      events.onFuryActivate?.();
    }

    // --- arcane guard (shield) ---
    // Can't shield while charging or slamming
    if (input.guardHeld && this.shieldCooldown <= 0 && this.charging <= 0 && !this.slamming) {
      this.shielding = true;
    } else {
      this.shielding = false;
    }

    // --- desired horizontal velocity from input, camera-relative ---
    const fwd = cam.getForward();
    const right = cam.getRight();
    const wish = new THREE.Vector3()
      .addScaledVector(right, input.moveX)
      .addScaledVector(fwd, -input.moveZ);
    const wishLen = Math.min(1, wish.length());
    if (wishLen > 0.01) wish.normalize();

    // Speed multiplier (fury mode)
    const speedMult = this.furyActive ? FURY_SPEED_MULT : 1;

    // --- slam recovery: can't move briefly after ground pound landing ---
    if (this.slamRecovery > 0) {
      this.velocity.x = 0;
      this.velocity.z = 0;
    } else if (this.wallSliding) {
      // --- wall slide: slow fall, no horizontal input ---
      this.wallSlideTime -= dt;
      this.velocity.x = 0;
      this.velocity.z = 0;
      this.velocity.y = Math.max(this.velocity.y, WALL_SLIDE_GRAVITY);

      // Exit wall slide
      if (this.grounded || this.wallSlideTime <= 0) {
        this.wallSliding = false;
      }

      // Wall jump
      if (input.jumpPressed) {
        this.wallSliding = false;
        this.velocity.y = WALL_JUMP_UP_VEL;
        this.velocity.x = this.wallNormal.x * WALL_JUMP_PUSH_VEL;
        this.velocity.z = this.wallNormal.z * WALL_JUMP_PUSH_VEL;
        this.jumpsLeft = 1; // allow double jump after wall jump
        events.onJump?.(false);
        events.onWallJump?.();
      }
    } else if (this.slamming) {
      // --- bear slam: lock horizontal, plummet downward ---
      this.velocity.x *= 0.85; // slight air drag
      this.velocity.z *= 0.85;
      this.velocity.y = SLAM_VEL;
    } else if (this.charging > 0) {
      this.charging -= dt;
      const chargeSpeed = this.furyActive ? FURY_CHARGE_SPEED : CHARGE_SPEED;
      this.velocity.x = this.chargeDir.x * chargeSpeed;
      this.velocity.z = this.chargeDir.z * chargeSpeed;
      this.velocity.y = Math.max(this.velocity.y, -2); // glide-ish during charge
    } else {
      const accel = this.grounded ? ACCEL : AIR_ACCEL;
      const targetX = wish.x * RUN_SPEED * wishLen * speedMult;
      const targetZ = wish.z * RUN_SPEED * wishLen * speedMult;
      this.velocity.x = approach(this.velocity.x, targetX, accel * dt);
      this.velocity.z = approach(this.velocity.z, targetZ, accel * dt);
    }

    // --- jump ---
    if (input.jumpPressed) this.jumpBuffer = JUMP_BUFFER;
    const canGroundJump = this.grounded || this.coyote > 0;
    if (this.jumpBuffer > 0 && !this.wallSliding && !this.slamming) {
      if (canGroundJump) {
        this.velocity.y = JUMP_VEL;
        this.jumpsLeft = 1;
        this.coyote = 0;
        this.jumpBuffer = 0;
        this.charging = 0;
        events.onJump?.(false);
      } else if (this.jumpsLeft > 0) {
        // Thunder Pounce: electrified double jump (fury mode only)
        if (this.furyActive) {
          this.velocity.y = THUNDER_POUNCE_VEL;
          this.jumpsLeft--;
          this.jumpBuffer = 0;
          this.charging = 0;
          events.onThunderPounce?.();
          // Thunder pounce lands check is done in main.js via proximity
        } else {
          this.velocity.y = DOUBLE_JUMP_VEL;
          this.jumpsLeft--;
          this.jumpBuffer = 0;
          this.charging = 0;
          events.onJump?.(true);
        }
      }
    }

    // --- attack: horn charge (ground) or bear slam (air) ---
    if (input.attackPressed && !this.shielding) {
      if (!this.grounded && !this.slamming && this.charging <= 0) {
        // Bear Slam: initiate downward slam
        this.slamming = true;
        this.charging = 0;
        this.velocity.y = SLAM_VEL;
        events.onSlam?.();
      } else if (this.grounded && this.chargeCooldown <= 0 && this.charging <= 0) {
        // Horn Charge: forward dash
        this.charging = CHARGE_TIME;
        this.chargeCooldown = CHARGE_COOLDOWN;
        const dir = wishLen > 0.01
          ? wish.clone()
          : new THREE.Vector3(-Math.sin(this.facing), 0, -Math.cos(this.facing));
        this.chargeDir.copy(dir.setY(0).normalize());
        events.onCharge?.();
      }
    }

    // --- gravity ---
    if (!this.wallSliding) {
      this.velocity.y += GRAVITY * dt;
      this.velocity.y = Math.max(this.velocity.y, -40);
    }

    // --- ride moving platforms ---
    if (this.grounded && this.groundCollider?.isMover) {
      this.position.add(this.groundCollider.delta);
    }

    // --- integrate with collision ---
    const disp = this.velocity.clone().multiplyScalar(dt);
    const res = this.physics.moveAABB(this.position, this.half, disp);
    this.position.copy(res.position);

    // --- wall cling detection ---
    if (res.hitWall && !this.grounded && !this.slamming && !this.wallSliding
        && this.charging <= 0 && res.wallNormal && wishLen > 0.3) {
      // Check player is moving INTO the wall
      const moveDir = new THREE.Vector3(this.velocity.x, 0, this.velocity.z).normalize();
      const dot = moveDir.dot(res.wallNormal);
      if (dot < -0.3) {
        this.wallSliding = true;
        this.wallSlideTime = WALL_SLIDE_MAX_TIME;
        this.wallNormal.copy(res.wallNormal);
        this.velocity.y = 0;
        this.jumpsLeft = 1; // reset jump for wall-jump
        events.onWallCling?.();
      }
    }

    // --- ground contact ---
    if (res.grounded) {
      // Bear slam landed!
      if (this.slamming) {
        this.slamming = false;
        this.slamLanded = true;
        this.slamPosition.copy(this.position);
        this.slamRecovery = SLAM_RECOVERY;
        this.velocity.y = 0;
        events.onSlamLand?.();
      }

      if (!this.grounded && this.velocity.y < -18) events.onLand?.();
      this.grounded = true;
      this.groundCollider = res.groundCollider;
      this.jumpsLeft = 1;
      this.coyote = COYOTE_TIME;
      this.velocity.y = Math.max(this.velocity.y, 0);
      this.wallSliding = false;
    } else {
      if (this.grounded) this.coyote = COYOTE_TIME;
      this.grounded = false;
      this.groundCollider = null;
    }
    if (res.hitCeiling) this.velocity.y = Math.min(this.velocity.y, 0);

    // --- face movement direction ---
    if (!this.wallSliding) {
      const hv = new THREE.Vector2(this.velocity.x, this.velocity.z);
      if (hv.length() > 0.5) {
        const targetYaw = Math.atan2(-this.velocity.x, -this.velocity.z);
        this.facing = dampAngle(this.facing, targetYaw, 14, dt);
      }
    } else {
      // Face away from wall while sliding
      const targetYaw = Math.atan2(this.wallNormal.x, this.wallNormal.z);
      this.facing = dampAngle(this.facing, targetYaw, 14, dt);
    }

    // --- sync mesh ---
    this.mesh.position.set(this.position.x, this.position.y - this.half.y, this.position.z);
    this.mesh.rotation.y = this.facing;
    animateTusk(this.parts, {
      grounded: this.grounded,
      speed: this.speed,
      velY: this.velocity.y,
      charging: this.charging > 0,
      slamming: this.slamming,
      slamRecovery: this.slamRecovery > 0,
      wallSliding: this.wallSliding,
      shielding: this.shielding,
      furyActive: this.furyActive,
    }, this.time, dt);

    // damage blink
    this.mesh.visible = this.time >= this.blinkUntil || Math.floor(this.time * 12) % 2 === 0;
  }

  // Returns true if damage was applied (not invulnerable).
  takeDamage(fromPos, events) {
    if (this.invuln > 0 || this.dead) return false;

    // Arcane Guard: absorb the hit instead
    if (this.shielding && this.shieldCooldown <= 0) {
      this.shieldCooldown = SHIELD_COOLDOWN;
      this.shielding = false;
      this.shieldBroken = true;
      events.onShieldBreak?.();
      // Small knockback but no damage
      const away = this.position.clone().sub(fromPos).setY(0);
      if (away.lengthSq() < 0.01) away.set(0, 0, 1);
      away.normalize();
      this.velocity.x = away.x * 5;
      this.velocity.z = away.z * 5;
      this.velocity.y = 4;
      this.invuln = 0.5;
      return false;
    }

    this.hearts--;
    this.invuln = INVULN_TIME;
    this.blinkUntil = this.time + INVULN_TIME;
    this.charging = 0;
    this.slamming = false;
    this.wallSliding = false;
    const away = this.position.clone().sub(fromPos).setY(0);
    if (away.lengthSq() < 0.01) away.set(0, 0, 1);
    away.normalize();
    this.velocity.x = away.x * 9;
    this.velocity.z = away.z * 9;
    this.velocity.y = 8;
    events.onHurt?.();
    if (this.hearts <= 0) this.dead = true;
    return true;
  }

  healFull() {
    this.hearts = MAX_HEARTS;
    this.dead = false;
  }

  get isCharging() {
    return this.charging > 0;
  }

  get isSlamming() {
    return this.slamming;
  }
}

function approach(current, target, maxDelta) {
  if (current < target) return Math.min(current + maxDelta, target);
  return Math.max(current - maxDelta, target);
}

function dampAngle(current, target, rate, dt) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-rate * dt));
}
