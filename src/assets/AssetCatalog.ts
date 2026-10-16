import blackBishopUrl from '../../Public/Models/SM_Blackbishop.fbx';
import blackCheckerUrl from '../../Public/Models/SM_BlackCheckerPiece.fbx';
import blackKingUrl from '../../Public/Models/SM_BlackKing.fbx';
import blackKnightUrl from '../../Public/Models/SM_BlackKnight.fbx';
import blackPawnUrl from '../../Public/Models/SM_BlackPawn.fbx';
import blackQueenUrl from '../../Public/Models/SM_BlackQueen.fbx';
import blackRookUrl from '../../Public/Models/SM_BlackRook.fbx';
import boardUrl from '../../Public/Models/SM_ChessBoard.fbx';
import whiteBishopUrl from '../../Public/Models/SM_Whitebishop.fbx';
import whiteCheckerUrl from '../../Public/Models/SM_WhiteCheckerPiece.fbx';
import whiteKingUrl from '../../Public/Models/SM_WhiteKing.fbx';
import whiteKnightUrl from '../../Public/Models/SM_WhiteKnight.fbx';
import whitePawnUrl from '../../Public/Models/SM_WhitePawn.fbx';
import whiteQueenUrl from '../../Public/Models/SM_WhiteQueen.fbx';
import whiteRookUrl from '../../Public/Models/SM_WhiteRook.fbx';

import blackBaseColorUrl from '../../Public/Textures/BlackPieces/Mat_ChessPieces_BaseColor.png';
import blackNormalUrl from '../../Public/Textures/BlackPieces/Mat_ChessPieces_Normal.png';
import blackRoughnessUrl from '../../Public/Textures/BlackPieces/Mat_ChessPieces_Roughness.png';
import boardBaseColorUrl from '../../Public/Textures/ChessBoard_CheckerPieces/Mat_Board_Checkers_BaseColor.png';
import boardNormalUrl from '../../Public/Textures/ChessBoard_CheckerPieces/Mat_Board_Checkers_Normal.png';
import boardRoughnessUrl from '../../Public/Textures/ChessBoard_CheckerPieces/Mat_Board_Checkers_Roughness.png';
import whiteBaseColorUrl from '../../Public/Textures/WhitePieces/Mat_ChessPieces_BaseColor.png';
import whiteNormalUrl from '../../Public/Textures/WhitePieces/Mat_ChessPieces_Normal.png';
import whiteRoughnessUrl from '../../Public/Textures/WhitePieces/Mat_ChessPieces_Roughness.png';

export type ColorCode = 'w' | 'b';
export type PieceKind = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type TextureKey = 'board' | 'white' | 'black';

export type TextureUrls = {
  map: string;
  normalMap: string;
  roughnessMap: string;
};

export const PIECE_MODELS: Record<ColorCode, Record<PieceKind, string>> = {
  w: {
    p: whitePawnUrl,
    r: whiteRookUrl,
    n: whiteKnightUrl,
    b: whiteBishopUrl,
    q: whiteQueenUrl,
    k: whiteKingUrl
  },
  b: {
    p: blackPawnUrl,
    r: blackRookUrl,
    n: blackKnightUrl,
    b: blackBishopUrl,
    q: blackQueenUrl,
    k: blackKingUrl
  }
};

export const CHECKER_MODELS: Record<ColorCode, string> = {
  w: whiteCheckerUrl,
  b: blackCheckerUrl
};

export const BOARD_MODEL = boardUrl;

export const TEXTURE_URLS: Record<TextureKey, TextureUrls> = {
  board: {
    map: boardBaseColorUrl,
    normalMap: boardNormalUrl,
    roughnessMap: boardRoughnessUrl
  },
  white: {
    map: whiteBaseColorUrl,
    normalMap: whiteNormalUrl,
    roughnessMap: whiteRoughnessUrl
  },
  black: {
    map: blackBaseColorUrl,
    normalMap: blackNormalUrl,
    roughnessMap: blackRoughnessUrl
  }
};

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export const BOARD_SIZE = 8;
export const SQUARE_SIZE = 1;
export const BOARD_Y = 0;

export const BOARD_MODEL_PLAYFIELD_SPAN = 73.44;
export const BOARD_MODEL_SCALE = BOARD_SIZE / BOARD_MODEL_PLAYFIELD_SPAN;
export const PIECE_HEIGHT_SCALE = 0.86;
