import { Chess, type Move, type Square } from 'chess.js';

const PIECE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

function materialEval(chess: Chess): number {
  let w = 0;
  let b = 0;
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = board[r][f];
      if (!cell) continue;
      const v = PIECE[cell.type] ?? 0;
      if (cell.color === 'w') w += v;
      else b += v;
    }
  }
  return w - b;
}

function leafScore(chess: Chess): number {
  if (chess.isCheckmate()) return -1_000_000;
  if (chess.isStalemate() || chess.isDraw()) return 0;
  const mat = materialEval(chess);
  return chess.turn() === 'w' ? mat : -mat;
}

function negamax(chess: Chess, depth: number, alpha: number, beta: number): number {
  if (depth === 0 || chess.isGameOver()) return leafScore(chess);

  const moves = chess.moves({ verbose: true }) as Move[];
  moves.sort((a, b) => {
    const cap = (m: Move) => (m.captured ? 1 : 0);
    return cap(b) - cap(a);
  });

  let best = -Infinity;
  for (const m of moves) {
    chess.move(m);
    const score = -negamax(chess, depth - 1, -beta, -alpha);
    chess.undo();
    best = Math.max(best, score);
    alpha = Math.max(alpha, score);
    if (alpha >= beta) break;
  }
  return best;
}

export function pickBestMove(fen: string, depth = 2): { from: Square; to: Square } | null {
  const chess = new Chess(fen);
  if (chess.isGameOver()) return null;

  const moves = chess.moves({ verbose: true }) as Move[];
  if (moves.length === 0) return null;

  let best: Move | null = null;
  let bestScore = -Infinity;
  let alpha = -Infinity;

  for (const m of moves) {
    chess.move(m);
    const score = -negamax(chess, depth - 1, -Infinity, -alpha);
    chess.undo();
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
    alpha = Math.max(alpha, score);
  }

  if (!best) return null;
  return { from: best.from as Square, to: best.to as Square };
}
