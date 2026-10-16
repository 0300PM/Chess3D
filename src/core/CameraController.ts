import * as THREE from 'three';
import { AnimationManager } from './AnimationManager';

export type CameraShot =
  | { type: 'default' }
  | { type: 'select'; focus: THREE.Vector3 }
  | { type: 'moveFollow'; from: THREE.Vector3; to: THREE.Vector3 }
  | { type: 'capture'; focus: THREE.Vector3 }
  | { type: 'check'; focus: THREE.Vector3 }
  | { type: 'finale' };

type Pose = { yaw: number; pitch: number; radius: number };
type MutableVec3 = { x: number; y: number; z: number };

const DEFAULT_POSE: Pose = { yaw: Math.PI / 4, pitch: 0.83, radius: 13.6 };
const MIN_PITCH = 0.34;
const MAX_PITCH = 1.34;
const MIN_RADIUS = 7.6;
const MAX_RADIUS = 22;

export class CameraController {
  readonly target = new THREE.Vector3();
  readonly desiredTarget = new THREE.Vector3();

  private readonly pose: Pose = { ...DEFAULT_POSE };
  private readonly poseProxy: Pose = { ...DEFAULT_POSE };
  private readonly targetProxy: MutableVec3 = { x: 0, y: 0, z: 0 };
  private readonly orbitVelocity = { yaw: 0, pitch: 0, radius: 0 };
  private readonly shakeOffset = new THREE.Vector3();

  private idleYawSpeed = 0;
  private shakeLeftMs = 0;
  private shakeAmount = 0;
  private manualOrbit = false;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly animations: AnimationManager
  ) {
    this.camera.position.set(7.03, 9.27, 7.03);
    this.camera.lookAt(0, 0, 0);
  }

  setDefaultImmediate() {
    Object.assign(this.pose, DEFAULT_POSE);
    Object.assign(this.poseProxy, DEFAULT_POSE);
    this.orbitVelocity.yaw = 0;
    this.orbitVelocity.pitch = 0;
    this.orbitVelocity.radius = 0;
    this.target.set(0, 0, 0);
    this.desiredTarget.set(0, 0, 0);
    this.targetProxy.x = 0;
    this.targetProxy.y = 0;
    this.targetProxy.z = 0;
    this.idleYawSpeed = 0;
    this.syncCamera();
  }

  idleOrbit(speed: number) {
    this.idleYawSpeed = speed;
  }

  playShot(shot: CameraShot) {
    if (this.manualOrbit) return;
    const plan = planShot(shot, this.pose);

    this.animations.animate({
      targets: this.targetProxy,
      x: plan.target.x,
      y: plan.target.y,
      z: plan.target.z,
      duration: plan.duration,
      easing: plan.easing,
      update: () => this.desiredTarget.set(this.targetProxy.x, this.targetProxy.y, this.targetProxy.z)
    });

    if (plan.pose) {
      this.animations.animate({
        targets: this.poseProxy,
        yaw: plan.pose.yaw,
        pitch: plan.pose.pitch,
        radius: plan.pose.radius,
        duration: plan.duration,
        easing: plan.easing
      });
    }
  }

  shake(amount = 0.14, durationMs = 260) {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
    this.shakeLeftMs = Math.max(this.shakeLeftMs, durationMs);
  }

  update(dtMs: number) {
    const damping = Math.pow(0.0016, dtMs / 16.666);

    this.pose.yaw += this.orbitVelocity.yaw + this.idleYawSpeed * dtMs;
    this.pose.pitch += this.orbitVelocity.pitch;
    this.pose.radius += this.orbitVelocity.radius;
    this.pose.yaw += (this.poseProxy.yaw - this.pose.yaw) * Math.min(1, dtMs / 240);
    this.pose.pitch += (this.poseProxy.pitch - this.pose.pitch) * Math.min(1, dtMs / 240);
    this.pose.radius += (this.poseProxy.radius - this.pose.radius) * Math.min(1, dtMs / 240);

    this.orbitVelocity.yaw *= damping;
    this.orbitVelocity.pitch *= damping;
    this.orbitVelocity.radius *= damping;

    this.pose.pitch = THREE.MathUtils.clamp(this.pose.pitch, MIN_PITCH, MAX_PITCH);
    this.pose.radius = THREE.MathUtils.clamp(this.pose.radius, MIN_RADIUS, MAX_RADIUS);

    this.target.lerp(this.desiredTarget, 1 - Math.pow(0.0022, dtMs / 16.666));
    this.updateShake(dtMs);
    this.syncCamera();
  }

  beginManualOrbit() {
    this.manualOrbit = true;
  }

  endManualOrbit() {
    this.manualOrbit = false;
    Object.assign(this.poseProxy, this.pose);
  }

  orbitBy(deltaX: number, deltaY: number) {
    const speed = 0.0068;
    this.orbitVelocity.yaw -= deltaX * speed;
    this.orbitVelocity.pitch -= deltaY * speed;
    Object.assign(this.poseProxy, this.pose);
  }

  zoomBy(delta: number) {
    this.orbitVelocity.radius += delta * 0.02;
    Object.assign(this.poseProxy, this.pose);
  }

  panBoard(deltaX: number, deltaY: number) {
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    right.y = 0;
    if (right.lengthSq() < 1e-8) right.set(1, 0, 0);
    right.normalize();

    const pan = right
      .multiplyScalar(-deltaX * 0.02)
      .add(new THREE.Vector3(0, 1, 0).multiplyScalar(deltaY * 0.02));

    this.target.add(pan);
    this.desiredTarget.add(pan);
    this.targetProxy.x += pan.x;
    this.targetProxy.y += pan.y;
    this.targetProxy.z += pan.z;
  }

  getDebug() {
    return {
      pos: this.camera.position.clone(),
      target: this.target.clone(),
      orbit: { ...this.pose, manual: this.manualOrbit }
    };
  }

  private updateShake(dtMs: number) {
    this.shakeOffset.set(0, 0, 0);
    if (this.shakeLeftMs <= 0 || this.shakeAmount <= 0) return;

    this.shakeLeftMs = Math.max(0, this.shakeLeftMs - dtMs);
    const strength = this.shakeAmount * (0.25 + 0.75 * (this.shakeLeftMs / 260));
    this.shakeOffset.set(
      (Math.random() * 2 - 1) * strength,
      (Math.random() * 2 - 1) * strength * 0.55,
      (Math.random() * 2 - 1) * strength
    );

    if (this.shakeLeftMs <= 0) this.shakeAmount = 0;
  }

  private syncCamera() {
    const sinPitch = Math.sin(this.pose.pitch);
    this.camera.position.set(
      this.target.x + this.pose.radius * sinPitch * Math.sin(this.pose.yaw),
      this.target.y + this.pose.radius * Math.cos(this.pose.pitch),
      this.target.z + this.pose.radius * sinPitch * Math.cos(this.pose.yaw)
    );
    this.camera.position.add(this.shakeOffset);
    this.camera.lookAt(this.target);
  }
}

function planShot(shot: CameraShot, pose: Pose) {
  const focusHeight = 0.2;

  if (shot.type === 'select') {
    const target = shot.focus.clone().setY(shot.focus.y + focusHeight);
    return {
      target,
      pose: { ...pose, pitch: pose.pitch - 0.08, radius: Math.max(MIN_RADIUS, pose.radius - 1.1) },
      duration: 520,
      easing: 'easeOutCubic' as const
    };
  }

  if (shot.type === 'moveFollow') {
    const target = shot.from.clone().lerp(shot.to, 0.55);
    return {
      target: target.setY(focusHeight),
      pose: { ...pose, pitch: pose.pitch - 0.04, radius: Math.max(MIN_RADIUS, pose.radius - 0.5) },
      duration: 620,
      easing: 'easeInOutCubic' as const
    };
  }

  if (shot.type === 'capture') {
    return {
      target: shot.focus.clone(),
      pose: { ...pose, pitch: pose.pitch - 0.12, radius: Math.max(MIN_RADIUS, pose.radius - 1.6) },
      duration: 460,
      easing: 'easeOutExpo' as const
    };
  }

  if (shot.type === 'check') {
    return {
      target: shot.focus.clone(),
      pose: { ...pose, pitch: Math.min(MAX_PITCH, pose.pitch + 0.12), radius: Math.min(MAX_RADIUS, pose.radius + 1.4) },
      duration: 780,
      easing: 'easeInOutExpo' as const
    };
  }

  if (shot.type === 'finale') {
    return {
      target: new THREE.Vector3(0, focusHeight, 0),
      pose: { yaw: pose.yaw + 0.85, pitch: Math.min(MAX_PITCH, pose.pitch + 0.16), radius: Math.min(MAX_RADIUS, pose.radius + 2.6) },
      duration: 1500,
      easing: 'easeInOutCubic' as const
    };
  }

  return {
    target: new THREE.Vector3(0, focusHeight, 0),
    pose: { ...DEFAULT_POSE },
    duration: 950,
    easing: 'easeInOutCubic' as const
  };
}
