import { describe, expect, test } from 'vitest';
import { GameEngine } from '../../src/core/engine';
import { createEmptyGrid, setCell } from '../../src/core/grid';
import { getPieceById } from '../../src/core/pieces';
import { createRng } from '../../src/core/rng';
import type { RunState } from '../../src/core/types';

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
    runCurrency: 0,
  };
  return GameEngine.deserialize(JSON.stringify({ ...base, ...overrides }));
}

// M5: save/resume must reproduce an identical board/hand/score/perks (04 §M5 AC). The engine
// already round-trips plain state (tests/core/engine.test.ts); this focuses on the parts M3
// added — nested perkState, pendingPerkChoices, and run currency — since those are exactly
// what a naive serializer could drop or shallow-copy incorrectly.
describe('persistence — full RunState round-trip including mid-run perks', () => {
  test('serialize/deserialize preserves activePerks, nested perkState, pendingPerkChoices, and runCurrency', () => {
    const grid = createEmptyGrid();
    setCell(grid, 4, 4, 1);
    const engine = buildEngine({
      grid,
      hand: [getPieceById('single'), getPieceById('line1x3'), null],
      score: 137,
      totalClears: 6,
      clearsSinceLastPerk: 1,
      activePerks: ['momentum', 'bomb-draw', 'greed'],
      perkState: {
        momentum: { streak: 3 },
        'bomb-draw': { cooldown: 2 },
      },
      status: 'perk_select',
      pendingPerkChoices: ['corner-master', 'overflow', 'chain-reaction'],
      runCurrency: 9,
    });

    const resumed = GameEngine.deserialize(engine.serialize());

    expect(resumed.getState()).toEqual(engine.getState());
    expect(resumed.getState().perkState['momentum']).toEqual({ streak: 3 });
    expect(resumed.getState().perkState['bomb-draw']).toEqual({ cooldown: 2 });
    expect(resumed.getState().pendingPerkChoices).toEqual(['corner-master', 'overflow', 'chain-reaction']);
    expect(resumed.getState().runCurrency).toBe(9);
  });

  test('a resumed run with active perks continues to score identically to the original', () => {
    const grid = createEmptyGrid();
    for (let x = 0; x < 8; x++) setCell(grid, x, 0, 1); // row0 missing only x=8
    const hand = [getPieceById('single'), null, null] as RunState['hand'];
    const engine = buildEngine({
      grid,
      hand,
      activePerks: ['momentum'],
      perkState: { momentum: { streak: 2 } },
    });

    const resumed = GameEngine.deserialize(engine.serialize());

    const resultOriginal = engine.tryPlace(0, { x: 8, y: 0 });
    const resultResumed = resumed.tryPlace(0, { x: 8, y: 0 });

    expect(resultResumed).toEqual(resultOriginal);
    expect(resumed.getState()).toEqual(engine.getState());
    // Momentum streak 2 -> 3 means +15 on top of placement(1) + line(10), no combo (1 line).
    expect(resultOriginal.scoreDelta).toBe(1 + 10 + 15);
  });

  test('choosePerk resolved from a resumed perk_select state applies identically', () => {
    const engine = buildEngine({
      hand: [getPieceById('single'), null, null],
      status: 'perk_select',
      pendingPerkChoices: ['corner-master', 'overflow', 'greed'],
    });
    const resumed = GameEngine.deserialize(engine.serialize());

    engine.choosePerk('corner-master');
    resumed.choosePerk('corner-master');

    expect(resumed.getState()).toEqual(engine.getState());
    expect(resumed.getState().activePerks).toEqual(['corner-master']);
  });
});
