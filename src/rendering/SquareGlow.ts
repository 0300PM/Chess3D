import * as THREE from 'three';
import type { Square } from '../chess/Board';
import { createSquareGlowTexture } from './ProceduralTextures';

export type SquareGlowMode = 'tile' | 'ring';

export type SquareGlowStyle = {
  color: THREE.Color;
  mode: SquareGlowMode;
  intensity: number;
  pulse?: boolean;
};

type Layer = {
  mesh: THREE.InstancedMesh;
  base: THREE.Matrix4[];
  additive: boolean;
  scale: number;
};

type Slot = {
  color: THREE.Color;
  mode: SquareGlowMode;
  intensity: number;
  pulse: boolean;
  visibility: number;
  flashLeft: number;
  flashDuration: number;
  flashPeak: number;
};

const SURFACE_OFFSET = 0.02;
const VISIBILITY_LERP_MS = 110;
const FLASH_DURATION_MS = 340;

export class SquareGlow {
  readonly group = new THREE.Group();

  private readonly layers: Layer[];
  private readonly indexBySquare = new Map<Square, number>();
  private readonly slots: Slot[] = [];
  private readonly dummy = new THREE.Object3D();
  private elapsed = 0;

  constructor(squares: Square[], centers: THREE.Vector3[], squareSize = 1) {
    this.layers = [
      this.buildLayer(squares.length, centers, squareSize * 0.98, createSquareGlowTexture(160, 0.34, 6), 0.5, false),
      this.buildLayer(squares.length, centers, squareSize * 0.98, createSquareGlowTexture(160, 0.3, 6, 0.62), 0.95, true),
      this.buildLayer(squares.length, centers, squareSize * 1.42, createSquareGlowTexture(160, 0.55, 3), 0.8, true)
    ];

    squares.forEach((square, index) => {
      this.indexBySquare.set(square, index);
      this.slots.push(createSlot());
    });

    this.layers.forEach((layer) => this.group.add(layer.mesh));
    this.reset();
  }

  set(square: Square, style: SquareGlowStyle) {
    const slot = this.slotAt(square);
    if (!slot) return;
    slot.color.copy(style.color);
    slot.mode = style.mode;
    slot.intensity = style.intensity;
    slot.pulse = style.pulse ?? false;
    slot.flashLeft = 0;
    slot.flashPeak = 0;
  }

  flash(square: Square, color: THREE.Color, mode: SquareGlowMode = 'ring', peak = 0.95, durationMs = FLASH_DURATION_MS) {
    const slot = this.slotAt(square);
    if (!slot) return;
    slot.color.copy(color);
    slot.mode = mode;
    slot.flashLeft = durationMs;
    slot.flashDuration = durationMs;
    slot.flashPeak = peak;
    slot.visibility = Math.max(slot.visibility, 0.4);
  }

  reset() {
    this.slots.forEach((slot, index) => {
      slot.color.set(0xffffff);
      slot.mode = 'tile';
      slot.intensity = 0;
      slot.pulse = false;
      slot.visibility = 0;
      slot.flashLeft = 0;
      slot.flashDuration = FLASH_DURATION_MS;
      slot.flashPeak = 0;
      this.writeSlot(index);
    });
    this.flush(true);
  }

  tick(dtMs: number) {
    this.elapsed += dtMs;
    const blend = Math.min(1, dtMs / VISIBILITY_LERP_MS);
    let dirty = false;

    this.slots.forEach((slot, index) => {
      if (slot.flashLeft > 0) slot.flashLeft = Math.max(0, slot.flashLeft - dtMs);

      const target = slot.flashLeft > 0 || slot.intensity > 0 ? 1 : 0;
      const next = slot.visibility + (target - slot.visibility) * blend;
      const changed = Math.abs(next - slot.visibility) > 0.002;
      slot.visibility = next;

      if (changed || slot.flashLeft > 0) {
        this.writeSlot(index);
        dirty = true;
      }
    });

    if (dirty) this.flush(false);
  }

  dispose() {
    this.layers.forEach((layer) => {
      layer.mesh.geometry.dispose();
      (layer.mesh.material as THREE.Material).dispose();
    });
  }

  private buildLayer(count: number, centers: THREE.Vector3[], size: number, texture: THREE.Texture, opacity: number, additive: boolean): Layer {
    const mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: false,
        toneMapped: false,
        fog: false
      }),
      count
    );
    mesh.frustumCulled = false;
    mesh.renderOrder = 3;

    const base = centers.map((center) => {
      this.dummy.position.set(center.x, center.y + SURFACE_OFFSET, center.z);
      this.dummy.rotation.set(-Math.PI / 2, 0, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      return this.dummy.matrix.clone();
    });

    const collapsed = new THREE.Matrix4().makeScale(0, 0, 0);
    centers.forEach((_, index) => mesh.setMatrixAt(index, collapsed));
    mesh.instanceMatrix.needsUpdate = true;

    return { mesh, base, additive, scale: size };
  }

  private slotAt(square: Square) {
    const index = this.indexBySquare.get(square);
    return index === undefined ? null : this.slots[index];
  }

  private writeSlot(index: number) {
    const slot = this.slots[index];
    const flashRatio = slot.flashLeft > 0 ? slot.flashLeft / slot.flashDuration : 0;
    const pulse = slot.pulse ? 0.8 + 0.2 * Math.sin((this.elapsed / 520) * Math.PI * 2) : 1;
    const strength = Math.min(1, Math.max(slot.intensity * pulse, slot.flashPeak * flashRatio));
    const visible = slot.visibility > 0.004;
    const grow = 0.9 + 0.1 * slot.visibility;

    const [tile, ring, halo] = this.layers;

    if (!visible) {
      this.writeInstance(tile, index, 0, slot.color, 0);
      this.writeInstance(ring, index, 0, slot.color, 0);
      this.writeInstance(halo, index, 0, slot.color, 0);
      return;
    }

    const tileAlpha = 0.55 + 0.45 * slot.visibility;

    this.writeInstance(tile, index, slot.mode === 'tile' ? grow : 0, slot.color, 1, tileAlpha);
    this.writeInstance(ring, index, slot.mode === 'ring' ? grow : 0, slot.color, strength, 0.95);
    this.writeInstance(halo, index, grow, slot.color, strength * 0.45, 0.6);
  }

  private writeInstance(layer: Layer, index: number, grow: number, color: THREE.Color, intensity: number, alpha = 1) {
    if (grow <= 0) {
      this.dummy.matrix.makeScale(0, 0, 0);
      layer.mesh.setMatrixAt(index, this.dummy.matrix);
      layer.mesh.setColorAt(index, BLACK);
      return;
    }

    const matrix = this.dummy.matrix.copy(layer.base[index]);
    matrix.scale(scaleVector.setScalar(grow));
    layer.mesh.setMatrixAt(index, matrix);

    const tinted = tint.copy(color);
    if (layer.additive) tinted.multiplyScalar(intensity);
    tinted.multiplyScalar(alpha);
    layer.mesh.setColorAt(index, tinted);
  }

  private flush(matrices: boolean) {
    this.layers.forEach((layer) => {
      if (matrices) layer.mesh.instanceMatrix.needsUpdate = true;
      if (layer.mesh.instanceColor) layer.mesh.instanceColor.needsUpdate = true;
    });
  }
}

const BLACK = new THREE.Color(0, 0, 0);
const tint = new THREE.Color();
const scaleVector = new THREE.Vector3();

function createSlot(): Slot {
  return {
    color: new THREE.Color(0xffffff),
    mode: 'tile',
    intensity: 0,
    pulse: false,
    visibility: 0,
    flashLeft: 0,
    flashDuration: FLASH_DURATION_MS,
    flashPeak: 0
  };
}
