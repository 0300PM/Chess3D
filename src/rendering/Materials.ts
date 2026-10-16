import * as THREE from 'three';
import type { AssetBundle, TextureSet } from '../assets/AssetLoader';

export type MaterialPack = {
  board: THREE.MeshPhysicalMaterial;
  checkerWhite: THREE.MeshPhysicalMaterial;
  checkerBlack: THREE.MeshPhysicalMaterial;
  pieceWhite: THREE.MeshPhysicalMaterial;
  pieceBlack: THREE.MeshPhysicalMaterial;
};

export const PIECE_GLOW = {
  hover: new THREE.Color('#8fe3ff'),
  select: new THREE.Color('#ffd27f'),
  check: new THREE.Color('#ff6b5c')
} as const;

export const SQUARE_GLOW = {
  select: new THREE.Color('#ffc774'),
  move: new THREE.Color('#63dcff'),
  capture: new THREE.Color('#ff8551'),
  illegal: new THREE.Color('#ff3b2d'),
  check: new THREE.Color('#ff5745'),
  lastMove: new THREE.Color('#a8bdff'),
  hover: new THREE.Color('#8fe2ff')
} as const;

export function createMaterials(textures: AssetBundle['textures']): MaterialPack {
  const board = applyMaps(new THREE.MeshPhysicalMaterial(boardSurface()), textures.board, 0.22);
  const pieceWhite = applyMaps(new THREE.MeshPhysicalMaterial(pieceSurface(0.28, '#fff2dc', 0.85)), textures.white, 1);
  const pieceBlack = applyMaps(new THREE.MeshPhysicalMaterial(pieceSurface(0.34, '#aec4ff', 0.9)), textures.black, 1);

  pieceWhite.color = new THREE.Color('#fdf3e4');
  pieceBlack.color = new THREE.Color('#9d8a76');

  return {
    board,
    pieceWhite,
    pieceBlack,
    checkerWhite: pieceWhite.clone(),
    checkerBlack: pieceBlack.clone()
  };
}

function applyMaps(material: THREE.MeshPhysicalMaterial, set: TextureSet, normalStrength: number) {
  material.map = set.map;
  material.normalMap = set.normalMap;
  material.normalScale = new THREE.Vector2(normalStrength, normalStrength);
  material.roughnessMap = set.roughnessMap;
  material.roughness = 1;
  material.metalness = 0;
  return material;
}

function boardSurface(): THREE.MeshPhysicalMaterialParameters {
  return {
    clearcoat: 0.1,
    clearcoatRoughness: 0.42,
    envMapIntensity: 0.8,
    sheen: 0.12,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color('#ffd9b0')
  };
}

function pieceSurface(clearcoat: number, sheenColor: string, envMapIntensity: number): THREE.MeshPhysicalMaterialParameters {
  return {
    clearcoat,
    clearcoatRoughness: 0.28,
    envMapIntensity,
    sheen: 0.35,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color(sheenColor)
  };
}
