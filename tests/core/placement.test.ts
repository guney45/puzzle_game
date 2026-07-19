import { describe, expect, test } from 'vitest';
import { createEmptyGrid, setCell } from '../../src/core/grid';
import { canPlace, enumerateValidPlacements, place } from '../../src/core/placement';
import { PIECE_CATALOGUE, getPieceById } from '../../src/core/pieces';
import { GRID_SIZE } from '../../src/config/constants';

describe('placement', () => {
  test('canPlace is true for a valid in-bounds, empty-cell placement', () => {
    const grid = createEmptyGrid();
    const piece = getPieceById('single');
    expect(canPlace(grid, piece, { x: 0, y: 0 })).toBe(true);
  });

  test('canPlace is false when any cell is out of bounds', () => {
    const grid = createEmptyGrid();
    const piece = getPieceById('line1x5'); // spans x=0..4
    expect(canPlace(grid, piece, { x: GRID_SIZE - 2, y: 0 })).toBe(false);
    expect(canPlace(grid, piece, { x: -1, y: 0 })).toBe(false);
  });

  test('canPlace is false when a cell is already occupied', () => {
    const grid = createEmptyGrid();
    setCell(grid, 1, 0, 1);
    const piece = getPieceById('line1x2'); // (0,0),(1,0)
    expect(canPlace(grid, piece, { x: 0, y: 0 })).toBe(false);
  });

  test('place() fills exactly the piece cells and returns a new grid (no mutation)', () => {
    const grid = createEmptyGrid();
    const piece = getPieceById('square2x2');
    const { grid: next, placedCells } = place(grid, piece, { x: 2, y: 3 });

    expect(placedCells).toEqual([
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 2, y: 4 },
      { x: 3, y: 4 },
    ]);
    for (const { x, y } of placedCells) expect(next[y][x]).toBe(1);
    expect(grid[3][2]).toBe(0); // original untouched
  });

  test('place() throws if the placement is invalid', () => {
    const grid = createEmptyGrid();
    const piece = getPieceById('single');
    expect(() => place(grid, piece, { x: -1, y: 0 })).toThrow();
  });

  test('enumerateValidPlacements finds every legal origin on an empty board', () => {
    const grid = createEmptyGrid();
    const piece = getPieceById('single');
    const placements = enumerateValidPlacements(grid, piece);
    expect(placements).toHaveLength(GRID_SIZE * GRID_SIZE);
  });

  test('enumerateValidPlacements returns empty when the board is full', () => {
    const grid = createEmptyGrid();
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) setCell(grid, x, y, 1);
    }
    const piece = getPieceById('single');
    expect(enumerateValidPlacements(grid, piece)).toHaveLength(0);
  });

  test('every catalogue shape can be placed at (0,0) on an empty board', () => {
    const grid = createEmptyGrid();
    for (const piece of PIECE_CATALOGUE) {
      expect(canPlace(grid, piece, { x: 0, y: 0 })).toBe(true);
    }
  });

  test('every catalogue shape has at least one valid placement on an empty board', () => {
    const grid = createEmptyGrid();
    for (const piece of PIECE_CATALOGUE) {
      expect(enumerateValidPlacements(grid, piece).length).toBeGreaterThan(0);
    }
  });
});
