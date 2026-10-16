import * as THREE from 'three';
import { BOARD_Y, FILES, RANKS, SQUARE_SIZE } from '../assets/AssetCatalog';

export type Square = `${(typeof FILES)[number]}${(typeof RANKS)[number]}`;

export const ALL_SQUARES: Square[] = FILES.flatMap((file) => RANKS.map((rank) => `${file}${rank}` as Square));

export const BOARD_HALF = (FILES.length * SQUARE_SIZE) / 2;

export class Board {
  readonly group = new THREE.Group();
  readonly centers = new Map<Square, THREE.Vector3>();
  readonly surfaceY = BOARD_Y;

  constructor(readonly mesh: THREE.Mesh) {
    this.group.name = 'Board';
    this.mesh.name = 'ChessBoardSurface';
    this.group.add(this.mesh);
    this.buildCenters();
  }

  squareCenter(square: Square) {
    const center = this.centers.get(square);
    if (!center) throw new Error(`Unknown square ${square}`);
    return center.clone();
  }

  squareFromWorld(point: THREE.Vector3): Square | null {
    const local = this.mesh.worldToLocal(point.clone());
    const fileIndex = Math.floor((local.x + BOARD_HALF) / SQUARE_SIZE);
    const rankIndex = Math.floor((BOARD_HALF - local.z) / SQUARE_SIZE);
    if (fileIndex < 0 || fileIndex > 7 || rankIndex < 0 || rankIndex > 7) return null;
    if (local.y < -SQUARE_SIZE || local.y > SQUARE_SIZE) return null;
    return `${FILES[fileIndex]}${RANKS[rankIndex]}` as Square;
  }

  contains(object: THREE.Object3D) {
    return object === this.mesh;
  }

  private buildCenters() {
    FILES.forEach((file, fileIndex) => {
      RANKS.forEach((rank, rankIndex) => {
        const square = `${file}${rank}` as Square;
        this.centers.set(
          square,
          new THREE.Vector3(
            -BOARD_HALF + SQUARE_SIZE * (fileIndex + 0.5),
            BOARD_Y,
            BOARD_HALF - SQUARE_SIZE * (rankIndex + 0.5)
          )
        );
      });
    });
  }
}
