import type { Move, Square as ChessSquare } from 'chess.js';
import { Rules } from './Rules';
import type { Square } from './Board';

export type MoveResult = {
  ok: boolean;
  capture: boolean;
  check: boolean;
  san?: string;
  from?: Square;
  to?: Square;
};

export class MoveSystem {
  readonly rules = new Rules();

  get turn() {
    return this.rules.turn;
  }

  reset() {
    this.rules.reset();
  }

  legalMoves(from: Square): Move[] {
    return this.rules.legalMovesFrom(from as unknown as ChessSquare);
  }

  inCheck() {
    return this.rules.inCheck();
  }

  kingSquare(color: 'w' | 'b'): Square | null {
    const rows = this.rules.board();
    for (let row = 0; row < rows.length; row++) {
      for (let fileIndex = 0; fileIndex < rows[row].length; fileIndex++) {
        const cell = rows[row][fileIndex];
        if (cell?.type === 'k' && cell.color === color) {
          return `${'abcdefgh'[fileIndex]}${8 - row}` as Square;
        }
      }
    }
    return null;
  }

  tryMove(from: Square, to: Square): MoveResult {
    const res = this.rules.move(from as unknown as ChessSquare, to as unknown as ChessSquare);
    if (!res) return { ok: false, capture: false, check: false };
    return {
      ok: true,
      capture: Boolean(res.captured),
      check: this.rules.inCheck(),
      san: res.san,
      from,
      to
    };
  }

  historySAN() {
    return this.rules.history();
  }

  fen() {
    return this.rules.fen();
  }

  gameOverReason(): 'checkmate' | 'stalemate' | 'draw' | 'time' | null {
    if (this.rules.isCheckmate()) return 'checkmate';
    if (this.rules.isStalemate()) return 'stalemate';
    if (this.rules.isDraw()) return 'draw';
    return null;
  }
}

