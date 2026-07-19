import { describe, expect, test } from 'vitest';
import { GameEngine } from '../../src/core/engine';
import { createEmptyGrid, setCell } from '../../src/core/grid';
import { getPieceById } from '../../src/core/pieces';
import { createRng, pickN } from '../../src/core/rng';
import { PIECE_CATALOGUE } from '../../src/core/pieces';
import { HAND_SIZE, SCORE_PER_LINE_CLEAR, SCORE_PER_PLACED_CELL } from '../../src/config/constants';
import type { Grid, Hand, RunState } from '../../src/core/types';

function buildEngine(overrides: Partial<RunState>): GameEngine {
  const base: RunState = {
    grid: createEmptyGrid(),
    hand: [null, null, null],
    score: 0,
    totalClears: 0,
    clearsSinceLastPerk: 0,
    activePerks: [],
    perkState: {},
    rngState: createRng(1).getState(),
    status: 'playing',
  };
  return GameEngine.deserialize(JSON.stringify({ ...base, ...overrides }));
}

describe('GameEngine', () => {
  test('constructor deals a hand of HAND_SIZE pieces deterministically from the seed', () => {
    const engine = GameEngine.deserialize(new GameEngine({ seed: 777 }).serialize());
    const state = engine.getState();
    expect(state.hand).toHaveLength(HAND_SIZE);
    expect(state.hand.every((p) => p !== null)).toBe(true);
    expect(state.score).toBe(0);
    expect(state.status).toBe('playing');
  });

  test('two engines built from the same seed deal identical hands and behave identically', () => {
    const a = new GameEngine({ seed: 42 });
    const b = new GameEngine({ seed: 42 });
    expect(a.getState().hand.map((p) => p?.id)).toEqual(b.getState().hand.map((p) => p?.id));

    const resultA = a.tryPlace(0, { x: 0, y: 0 });
    const resultB = b.tryPlace(0, { x: 0, y: 0 });
    expect(resultA).toEqual(resultB);
    expect(a.getState()).toEqual(b.getState());
  });

  test('tryPlace on an invalid position is a no-op and does not mutate state', () => {
    const engine = new GameEngine({ seed: 5 });
    const before = engine.getState();
    const result = engine.tryPlace(0, { x: -1, y: 0 });
    expect(result.ok).toBe(false);
    expect(result.scoreDelta).toBe(0);
    expect(engine.getState()).toEqual(before);
  });

  test('placing a single-cell piece with no clear: exact score delta, no clear, then game over', () => {
    // Checkerboard fill: no row/col/box is ever full (half the cells are empty), and no two
    // empty cells are orthogonally adjacent — so no 2+ cell piece can fit anywhere.
    const grid = createEmptyGrid();
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) setCell(grid, x, y, (x + y) % 2 === 0 ? 1 : 0);
    }
    const A = { x: 1, y: 0 }; // an empty (odd-sum) cell

    const hand: Hand = [getPieceById('single'), getPieceById('line1x2'), getPieceById('line2x1')];
    const engine = buildEngine({ grid, hand });

    const result = engine.tryPlace(0, A);

    expect(result.ok).toBe(true);
    expect(result.placedCells).toEqual([A]);
    expect(result.clearedCells).toHaveLength(0);
    expect(result.combo).toBe(0);
    expect(result.scoreDelta).toBe(1 * SCORE_PER_PLACED_CELL); // no line/combo points
    expect(result.triggeredPerkSelect).toBe(false);
    expect(result.events.map((e) => e.type)).not.toContain('handRefilled');
    expect(result.events.map((e) => e.type)).not.toContain('linesCleared');

    // Remaining hand (line1x2, line2x1, size 2 each) needs 2 adjacent empty cells, and the
    // checkerboard guarantees none exist anywhere on the board — this is game over.
    expect(result.gameOver).toBe(true);
    expect(result.events.map((e) => e.type)).toContain('gameOver');

    const state = engine.getState();
    expect(state.score).toBe(1 * SCORE_PER_PLACED_CELL);
    expect(state.status).toBe('game_over');
    expect(state.hand[0]).toBeNull();
  });

  test('a placement that completes a single row clears exactly that row and scores exactly', () => {
    const grid = createEmptyGrid();
    for (let x = 0; x < 8; x++) setCell(grid, x, 0, 1); // row 0 missing only x=8
    const hand: Hand = [getPieceById('single'), getPieceById('line1x2'), getPieceById('line2x1')];
    const engine = buildEngine({ grid, hand });

    const result = engine.tryPlace(0, { x: 8, y: 0 });

    expect(result.ok).toBe(true);
    expect(result.combo).toBe(1);
    expect(result.clearedLines).toEqual({ rows: [0], cols: [], boxes: [] });
    expect(result.clearedCells).toHaveLength(9);
    // placement(1) + line(1 * SCORE_PER_LINE_CLEAR), no combo bonus for a single line.
    expect(result.scoreDelta).toBe(1 * SCORE_PER_PLACED_CELL + 1 * SCORE_PER_LINE_CLEAR);

    const state = engine.getState();
    expect(state.totalClears).toBe(1);
    expect(state.clearsSinceLastPerk).toBe(1);
    expect(state.grid[0].every((c) => c === 0)).toBe(true); // row cleared
    // row 0 is fully cleared, board otherwise empty — plenty of room, not game over.
    expect(result.gameOver).toBe(false);
  });

  test('hand refills deterministically once all 3 pieces are placed', () => {
    const grid = createEmptyGrid();
    const hand: Hand = [getPieceById('single'), null, null];
    const rngState = createRng(31415).getState();
    const engine = buildEngine({ grid, hand, rngState });

    const result = engine.tryPlace(0, { x: 8, y: 8 });

    expect(result.events.map((e) => e.type)).toContain('handRefilled');
    const state = engine.getState();
    expect(state.hand).toHaveLength(HAND_SIZE);
    expect(state.hand.every((p) => p !== null)).toBe(true);

    // The refill draw is deterministic from the rngState captured just before the deal.
    const expectedIds = pickN(createRng(rngState), PIECE_CATALOGUE, HAND_SIZE).map((p) => p.id);
    expect(state.hand.map((p) => p?.id)).toEqual(expectedIds);
  });

  test('perk-select triggers when clearsSinceLastPerk reaches PERK_EVERY_N_CLEARS, with remainder carried', () => {
    const grid = createEmptyGrid();
    for (let x = 0; x < 8; x++) setCell(grid, x, 0, 1); // row 0 missing only x=8
    const hand: Hand = [getPieceById('single'), null, null];
    // clearsSinceLastPerk starts at 4; a single clear pushes it to 5 == threshold.
    const engine = buildEngine({ grid, hand, clearsSinceLastPerk: 4, totalClears: 4 });

    const result = engine.tryPlace(0, { x: 8, y: 0 });

    expect(result.triggeredPerkSelect).toBe(true);
    const state = engine.getState();
    expect(state.status).toBe('perk_select');
    expect(state.clearsSinceLastPerk).toBe(0); // 5 (4 + 1 clear) - threshold(5) = 0
  });

  test('choosePerk resolves perk_select back to playing (no-op perk effect in M1)', () => {
    const grid = createEmptyGrid();
    const hand: Hand = [getPieceById('single'), null, null];
    const engine = buildEngine({ grid, hand, status: 'perk_select' });

    engine.choosePerk('some-perk-id');

    const state = engine.getState();
    expect(state.status).toBe('playing');
    expect(state.activePerks).toEqual(['some-perk-id']);
  });

  test('tryPlace is a no-op while status is perk_select', () => {
    const grid = createEmptyGrid();
    const hand: Hand = [getPieceById('single'), null, null];
    const engine = buildEngine({ grid, hand, status: 'perk_select' });

    const result = engine.tryPlace(0, { x: 0, y: 0 });
    expect(result.ok).toBe(false);
  });

  test('serialize/deserialize round-trip reproduces identical subsequent behavior', () => {
    const engine = new GameEngine({ seed: 2024 });
    engine.tryPlace(0, { x: 0, y: 0 });

    const snapshot = engine.serialize();
    const resumed = GameEngine.deserialize(snapshot);

    expect(resumed.getState()).toEqual(engine.getState());

    // Continue both engines identically from here and confirm they stay in lockstep.
    const stateBefore = engine.getState();
    const nextIndex = stateBefore.hand.findIndex((p) => p !== null);
    if (nextIndex === -1) {
      // Nothing left to place in this scenario; the round-trip equality above already
      // proves determinism.
      expect(true).toBe(true);
      return;
    }
    const piece = stateBefore.hand[nextIndex];
    if (!piece) throw new Error('expected a piece');
    const spots = enumerateFirstValidSpot(stateBefore.grid, piece);
    if (!spots) {
      expect(true).toBe(true);
      return;
    }

    const resultOriginal = engine.tryPlace(nextIndex, spots);
    const resultResumed = resumed.tryPlace(nextIndex, spots);
    expect(resultResumed).toEqual(resultOriginal);
    expect(resumed.getState()).toEqual(engine.getState());
  });
});

function enumerateFirstValidSpot(grid: Grid, piece: { cells: { x: number; y: number }[] }): { x: number; y: number } | null {
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      let ok = true;
      for (const offset of piece.cells) {
        const px = x + offset.x;
        const py = y + offset.y;
        if (px < 0 || px >= 9 || py < 0 || py >= 9 || grid[py][px] !== 0) {
          ok = false;
          break;
        }
      }
      if (ok) return { x, y };
    }
  }
  return null;
}
