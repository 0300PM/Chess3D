import * as THREE from 'three';
import { RANKS, type ColorCode } from '../assets/AssetCatalog';
import type { AssetBundle } from '../assets/AssetLoader';
import type { MaterialPack } from '../rendering/Materials';
import type { Board, Square } from './Board';

const DECOR_RANKS = 3;
const DARK_SQUARE_PARITY = 0;

export function createMenuDecor(board: Board, assets: AssetBundle, materials: MaterialPack): THREE.Group {
  const group = new THREE.Group();
  group.name = 'MenuDecor';

  const sides: Array<{ color: ColorCode; ranks: readonly number[] }> = [
    { color: 'b', ranks: RANKS.slice(0, DECOR_RANKS) },
    { color: 'w', ranks: RANKS.slice(-DECOR_RANKS) }
  ];

  sides.forEach(({ color, ranks }) => {
    const material = color === 'w' ? materials.checkerWhite : materials.checkerBlack;
    ranks.forEach((rank) => {
      'abcdefgh'.split('').forEach((file, fileIndex) => {
        if ((fileIndex + rank - 1) % 2 !== DARK_SQUARE_PARITY) return;

        const checker = assets.checkers[color].clone();
        checker.material = material;
        checker.castShadow = true;
        checker.receiveShadow = true;
        checker.position.copy(board.squareCenter(`${file}${rank}` as Square));
        checker.rotation.y = ((fileIndex * 7 + rank * 5) % 6) * 0.11;
        group.add(checker);
      });
    });
  });

  return group;
}
