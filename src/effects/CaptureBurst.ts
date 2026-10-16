import * as THREE from 'three';
import { createGlowTexture } from '../rendering/ProceduralTextures';

type Particle = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  lifetime: number;
  size: number;
};

const POOL_SIZE = 72;
const GRAVITY = 4.6;
const WARM_TINT = new THREE.Color(0xffe9c8);

export class CaptureBurst {
  readonly group = new THREE.Group();

  private readonly mesh: THREE.InstancedMesh;
  private readonly particles: Particle[] = [];
  private readonly dummy = new THREE.Object3D();
  private cursor = 0;

  constructor(private readonly camera: THREE.Camera) {
    this.mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: createGlowTexture(96, 2.1, 0.85),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: false
      }),
      POOL_SIZE
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(POOL_SIZE * 3), 3);

    for (let index = 0; index < POOL_SIZE; index++) {
      this.particles.push({ position: new THREE.Vector3(), velocity: new THREE.Vector3(), life: 0, lifetime: 1, size: 0 });
      this.writeMatrix(index, 0);
      this.mesh.setColorAt(index, new THREE.Color(0, 0, 0));
    }

    this.group.name = 'CaptureBurst';
    this.group.add(this.mesh);
  }

  burst(position: THREE.Vector3, color: THREE.Color, count = 26) {
    for (let emitted = 0; emitted < count; emitted++) {
      const slot = this.cursor;
      const particle = this.particles[slot];
      this.cursor = (this.cursor + 1) % POOL_SIZE;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.9 + Math.random() * 2.1;
      particle.position.copy(position);
      particle.position.y += 0.12 + Math.random() * 0.22;
      particle.velocity.set(Math.cos(angle) * speed, 1.1 + Math.random() * 1.9, Math.sin(angle) * speed);
      particle.lifetime = 0.42 + Math.random() * 0.42;
      particle.life = particle.lifetime;
      particle.size = 0.1 + Math.random() * 0.18;

      this.mesh.setColorAt(slot, color.clone().lerp(WARM_TINT, Math.random() * 0.6));
    }

    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  tick(dtMs: number) {
    const seconds = dtMs / 1000;
    let active = false;

    this.particles.forEach((particle, index) => {
      if (particle.life <= 0) return;
      active = true;

      particle.life = Math.max(0, particle.life - seconds);
      particle.velocity.y -= GRAVITY * seconds;
      particle.velocity.multiplyScalar(Math.max(0, 1 - 2.4 * seconds));
      particle.position.addScaledVector(particle.velocity, seconds);

      const ratio = particle.life / particle.lifetime;
      this.writeMatrix(index, particle.size * (0.35 + ratio * 0.95), particle.position);
    });

    if (active) this.mesh.instanceMatrix.needsUpdate = true;
  }

  private writeMatrix(index: number, scale: number, position?: THREE.Vector3) {
    if (position) this.dummy.position.copy(position);
    this.dummy.quaternion.copy(this.camera.quaternion);
    this.dummy.scale.setScalar(scale);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(index, this.dummy.matrix);
  }
}
