import { describe, expect, test } from 'vitest';
import { createEmptyGrid, setCell } from '../../src/core/grid';
import { canPlaceAnywhere } from '../../src/core/gameOver';
import { getPieceById } from '../../src/core/pieces';
import { GRID_SIZE } from '../../src/config/constants';
import type { Hand } from '../../src/core/types';

describe('gameOver', () => {
  test('a fully-filled board with any held piece is game over (true)', () => {
    const grid = createEmptyGrid();
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) setCell(grid, x, y, 1);
    }
    const hand: Hand = [getPieceById('single'), null, null];
    expect(canPlaceAnywhere(grid, hand)).toBe(false);
  });

  test('a board with exactly one free cell fitting the single piece is not game over', () => {
    const grid = createEmptyGrid();
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) setCell(grid, x, y, 1);
    }
    setCell(grid, 5, 5, 0); // one gap
    const hand: Hand = [getPieceById('single'), null, null];
    expect(canPlaceAnywhere(grid, hand)).toBe(true);
  });

  test('an empty hand (all null) is treated as no legal placement', () => {
    const grid = createEmptyGrid();
    const hand: Hand = [null, null, null];
    expect(canPlaceAnywhere(grid, hand)).toBe(false);
  });

  test('a nearly full board with a lone gap too small for the held pieces is game over', () => {
    const grid = createEmptyGrid();
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) setCell(grid, x, y, 1);
    }
    // Two adjacent gaps, but held piece is a 1x3 line — doesn't fit two cells.
    setCell(grid, 0, 0, 0);
    setCell(grid, 1, 0, 0);
    const hand: Hand = [getPieceById('line1x3'), null, null];
    expect(canPlaceAnywhere(grid, hand)).toBe(false);
  });
});
