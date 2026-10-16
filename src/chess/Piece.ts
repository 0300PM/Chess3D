import * as THREE from 'three';
import type { ColorCode, PieceKind } from '../assets/AssetCatalog';

export type PieceId = string;

export class Piece {
  readonly group: THREE.Group;
  readonly material: THREE.MeshPhysicalMaterial;

  constructor(
    readonly id: PieceId,
    readonly kind: PieceKind,
    readonly color: ColorCode,
    prototype: THREE.Mesh,
    material: THREE.MeshPhysicalMaterial
  ) {
    this.group = new THREE.Group();
    this.group.name = `Piece_${id}`;

    this.material = material.clone();
    this.material.emissive = new THREE.Color(0x000000);
    this.material.emissiveIntensity = 1;

    const mesh = prototype.clone();
    mesh.material = this.material;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  setGlow(color: THREE.Color, strength: number) {
    this.material.emissive.copy(color).multiplyScalar(Math.max(0, strength));
  }

  clearGlow() {
    this.material.emissive.setRGB(0, 0, 0);
  }

  setOpacity(opacity: number) {
    this.material.transparent = opacity < 1;
    this.material.opacity = opacity;
    this.material.depthWrite = opacity >= 1;
  }

  dispose() {
    this.material.dispose();
  }
}
