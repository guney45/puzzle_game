import { describe, expect, test } from 'vitest';
import { boxCells, boxIndexOf, boxOrigin, createEmptyGrid, getCell, inBounds, setCell } from '../../src/core/grid';
import { BOX_SIZE, GRID_SIZE } from '../../src/config/constants';

describe('grid', () => {
  test('createEmptyGrid produces GRID_SIZE x GRID_SIZE all-empty cells', () => {
    const grid = createEmptyGrid();
    expect(grid.length).toBe(GRID_SIZE);
    for (const row of grid) {
      expect(row.length).toBe(GRID_SIZE);
      expect(row.every((c) => c === 0)).toBe(true);
    }
  });

  test('inBounds accepts cells within [0, GRID_SIZE) and rejects outside', () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(GRID_SIZE - 1, GRID_SIZE - 1)).toBe(true);
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(0, -1)).toBe(false);
    expect(inBounds(GRID_SIZE, 0)).toBe(false);
    expect(inBounds(0, GRID_SIZE)).toBe(false);
  });

  test('getCell/setCell round-trip', () => {
    const grid = createEmptyGrid();
    setCell(grid, 3, 4, 1);
    expect(getCell(grid, 3, 4)).toBe(1);
    expect(getCell(grid, 0, 0)).toBe(0);
  });

  test('boxIndexOf maps every cell to a 0..8 box, 9 cells each', () => {
    const counts = new Map<number, number>();
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const idx = boxIndexOf(x, y);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan((GRID_SIZE / BOX_SIZE) ** 2);
        counts.set(idx, (counts.get(idx) ?? 0) + 1);
      }
    }
    expect(counts.size).toBe(9);
    for (const count of counts.values()) expect(count).toBe(9);
  });

  test('boxCells(0) covers the top-left 3x3 region', () => {
    const cells = boxCells(0);
    expect(cells).toHaveLength(9);
    for (const { x, y } of cells) {
      expect(x).toBeLessThan(BOX_SIZE);
      expect(y).toBeLessThan(BOX_SIZE);
    }
  });

  test('boxOrigin(4) is the center box origin (3,3)', () => {
    expect(boxOrigin(4)).toEqual({ x: 3, y: 3 });
  });
});
