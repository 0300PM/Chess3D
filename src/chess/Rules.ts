import { Chess, type Move, type Square } from 'chess.js';

export type Color = 'w' | 'b';

export class Rules {
  readonly chess = new Chess();

  reset() {
    this.chess.reset();
  }

  get turn(): Color {
    return this.chess.turn();
  }

  legalMovesFrom(square: Square): Move[] {
    return this.chess.moves({ square, verbose: true }) as Move[];
  }

  move(from: Square, to: Square) {
    try {
      return this.chess.move({ from, to, promotion: 'q' });
    } catch {
      return null;
    }
  }

  inCheck() {
    return this.chess.inCheck();
  }

  isGameOver() {
    return this.chess.isGameOver();
  }

  board() {
    return this.chess.board();
  }

  history() {
    return this.chess.history();
  }

  fen() {
    return this.chess.fen();
  }

  isCheckmate() {
    return this.chess.isCheckmate();
  }

  isStalemate() {
    return this.chess.isStalemate();
  }

  isDraw() {
    return this.chess.isDraw();
  }
}
