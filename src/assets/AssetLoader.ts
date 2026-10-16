import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  BOARD_MODEL,
  BOARD_MODEL_SCALE,
  CHECKER_MODELS,
  PIECE_HEIGHT_SCALE,
  PIECE_MODELS,
  TEXTURE_URLS,
  type ColorCode,
  type PieceKind,
  type TextureKey
} from './AssetCatalog';

export type TextureSet = {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
};

export type AssetBundle = {
  board: THREE.Mesh;
  pieces: Record<ColorCode, Record<PieceKind, THREE.Mesh>>;
  checkers: Record<ColorCode, THREE.Mesh>;
  textures: Record<TextureKey, TextureSet>;
};

export type LoadProgressHandler = (ratio: number) => void;

type SilencedFbxLoader = FBXLoader & { textureLoader: THREE.TextureLoader };

class PlaceholderTextureLoader extends THREE.TextureLoader {
  override load(): THREE.Texture<HTMLImageElement> {
    return new THREE.Texture<HTMLImageElement>();
  }
}

const totalAssetCount = () =>
  1 + Object.values(PIECE_MODELS).reduce((sum, group) => sum + Object.keys(group).length, 0) + Object.keys(CHECKER_MODELS).length + Object.keys(TEXTURE_URLS).length * 3;

export async function loadAssets(renderer: THREE.WebGLRenderer, onProgress?: LoadProgressHandler): Promise<AssetBundle> {
  const manager = new THREE.LoadingManager();
  const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const textureLoader = new THREE.TextureLoader(manager);
  const fbxLoader = new FBXLoader(manager) as SilencedFbxLoader;
  fbxLoader.textureLoader = new PlaceholderTextureLoader(manager);

  const total = totalAssetCount();
  let completed = 0;
  const step = () => {
    completed += 1;
    onProgress?.(Math.min(1, completed / total));
  };

  const loadFbx = (url: string) =>
    new Promise<THREE.Group>((resolve, reject) => {
      fbxLoader.load(url, (group) => {
        const result = group as unknown as THREE.Group;
        step();
        resolve(result);
      }, undefined, reject);
    });

  const loadTexture = (url: string, colorSpace: THREE.ColorSpace) =>
    new Promise<THREE.Texture>((resolve, reject) => {
      textureLoader.load(url, (texture) => {
        texture.colorSpace = colorSpace;
        texture.anisotropy = maxAnisotropy;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        step();
        resolve(texture);
      }, undefined, reject);
    });

  const [boardSource, pieceSources, checkerSources, textures] = await Promise.all([
    loadFbx(BOARD_MODEL),
    Promise.all(
      (Object.keys(PIECE_MODELS) as ColorCode[]).map(async (color) => ({
        color,
        models: Object.fromEntries(
          await Promise.all(
            (Object.keys(PIECE_MODELS[color]) as PieceKind[]).map(async (kind) => [kind, await loadFbx(PIECE_MODELS[color][kind])] as const)
          )
        ) as Record<PieceKind, THREE.Group>
      }))
    ),
    Promise.all((Object.keys(CHECKER_MODELS) as ColorCode[]).map(async (color) => ({ color, model: await loadFbx(CHECKER_MODELS[color]) }))),
    Promise.all(
      (Object.keys(TEXTURE_URLS) as TextureKey[]).map(async (key) => [
        key,
        {
          map: await loadTexture(TEXTURE_URLS[key].map, THREE.SRGBColorSpace),
          normalMap: await loadTexture(TEXTURE_URLS[key].normalMap, THREE.NoColorSpace),
          roughnessMap: await loadTexture(TEXTURE_URLS[key].roughnessMap, THREE.NoColorSpace)
        } satisfies TextureSet
      ] as const)
    )
  ]);

  const pieces = Object.fromEntries(pieceSources.map(({ color, models }) => [color, models])) as Record<ColorCode, Record<PieceKind, THREE.Group>>;
  const checkers = Object.fromEntries(checkerSources.map(({ color, model }) => [color, model])) as Record<ColorCode, THREE.Group>;

  return {
    board: buildBoard(boardSource),
    pieces: mapRecord(pieces, (group) => mapRecord(group, (model) => buildPiece(model))),
    checkers: mapRecord(checkers, (model) => buildPiece(model)),
    textures: Object.fromEntries(textures) as Record<TextureKey, TextureSet>
  };
}

function mapRecord<K extends string, A, B>(source: Record<K, A>, map: (value: A, key: K) => B): Record<K, B> {
  return Object.fromEntries((Object.keys(source) as K[]).map((key) => [key, map(source[key], key)])) as Record<K, B>;
}

function buildBoard(source: THREE.Object3D) {
  const mesh = new THREE.Mesh(normalize(flatten(source), 'top', BOARD_MODEL_SCALE));
  mesh.name = 'ChessBoard';
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

function buildPiece(source: THREE.Object3D) {
  const mesh = new THREE.Mesh(normalize(flatten(source), 'base', BOARD_MODEL_SCALE * PIECE_HEIGHT_SCALE));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function flatten(source: THREE.Object3D) {
  source.updateMatrixWorld(true);
  const geometries: THREE.BufferGeometry[] = [];
  const disposables = new Set<THREE.Material>();

  source.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);
    geometries.push(geometry);
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => disposables.add(material));
  });

  disposables.forEach((material) => material.dispose());
  if (geometries.length === 1) return geometries[0];
  const merged = mergeGeometries(geometries, false);
  geometries.forEach((geometry) => geometry.dispose());
  return merged ?? geometries[0];
}

function normalize(geometry: THREE.BufferGeometry, anchor: 'base' | 'top', scale: number) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox ?? new THREE.Box3();
  const center = box.getCenter(new THREE.Vector3());
  geometry.translate(-center.x, anchor === 'base' ? -box.min.y : -box.max.y, -center.z);
  geometry.scale(scale, scale, scale);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
