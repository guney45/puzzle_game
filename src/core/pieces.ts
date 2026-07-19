import type { Coord, Piece } from './types';

function toCoords(offsets: ReadonlyArray<readonly [number, number]>): Coord[] {
  return offsets.map(([x, y]) => ({ x, y }));
}

function definePiece(id: string, colorId: string, offsets: ReadonlyArray<readonly [number, number]>): Piece {
  const cells = toCoords(offsets);
  return { id, cells, colorId, size: cells.length };
}

// Starter catalogue, roughly Woodoku-like (02 §2.3). Pieces are placed as-is — no rotation.
export const PIECE_CATALOGUE: readonly Piece[] = [
  definePiece('single', 'blue', [[0, 0]]),

  definePiece('line1x2', 'green', [[0, 0], [1, 0]]),
  definePiece('line2x1', 'green', [[0, 0], [0, 1]]),
  definePiece('line1x3', 'green', [[0, 0], [1, 0], [2, 0]]),
  definePiece('line3x1', 'green', [[0, 0], [0, 1], [0, 2]]),
  definePiece('line1x4', 'yellow', [[0, 0], [1, 0], [2, 0], [3, 0]]),
  definePiece('line4x1', 'yellow', [[0, 0], [0, 1], [0, 2], [0, 3]]),
  definePiece('line1x5', 'orange', [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]),
  definePiece('line5x1', 'orange', [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]),

  definePiece('square2x2', 'purple', [[0, 0], [1, 0], [0, 1], [1, 1]]),
  definePiece('rect2x3', 'purple', [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]]),
  definePiece('rect3x2', 'purple', [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]),
  definePiece('square3x3', 'red', [
    [0, 0], [1, 0], [2, 0],
    [0, 1], [1, 1], [2, 1],
    [0, 2], [1, 2], [2, 2],
  ]),

  definePiece('lTromino', 'cyan', [[0, 0], [0, 1], [1, 1]]),
  definePiece('jTromino', 'cyan', [[1, 0], [1, 1], [0, 1]]),

  definePiece('lTetromino', 'pink', [[0, 0], [0, 1], [0, 2], [1, 2]]),
  definePiece('jTetromino', 'pink', [[1, 0], [1, 1], [1, 2], [0, 2]]),
  definePiece('tTetromino', 'teal', [[0, 0], [1, 0], [2, 0], [1, 1]]),
  definePiece('sTetromino', 'lime', [[1, 0], [2, 0], [0, 1], [1, 1]]),
  definePiece('zTetromino', 'crimson', [[0, 0], [1, 0], [1, 1], [2, 1]]),

  definePiece('cornerSmall', 'gold', [[0, 0], [1, 0], [0, 1]]),
];

export function getPieceById(id: string): Piece {
  const piece = PIECE_CATALOGUE.find((p) => p.id === id);
  if (!piece) throw new Error(`Unknown piece id: ${id}`);
  return piece;
}
