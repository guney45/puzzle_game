import { createEmptyGrid } from '../../../src/core/grid';
import type { PerkContext } from '../../../src/core/perks/perkTypes';
import { createRng } from '../../../src/core/rng';
import type { Coord, Grid, Hand, RunState } from '../../../src/core/types';

interface FakeCtxOptions {
  grid?: Grid;
  hand?: Hand;
  rngSeed?: number;
  run?: RunState;
  target?: Coord;
}

interface Calls {
  scoreDelta: number;
  currencyDelta: number;
}

// A minimal PerkContext for testing a single perk hook in isolation, without spinning up a
// full GameEngine turn. Mirrors the controlled-mutator shape engine.ts's TurnContext gives
// perks (03 §3.4) so hook logic under test behaves exactly as it would in a real turn.
export function makeCtx(options: FakeCtxOptions = {}): { ctx: PerkContext; calls: Calls } {
  const grid = options.grid ?? createEmptyGrid();
  const hand = options.hand ?? [null, null, null];
  const rng = createRng(options.rngSeed ?? 1);
  const run =
    options.run ??
    ({
      grid,
      hand,
      score: 0,
      totalClears: 0,
      clearsSinceLastPerk: 0,
      activePerks: [],
      perkState: {},
      rngState: rng.getState(),
      status: 'playing',
      runCurrency: 0,
    } satisfies RunState);

  const calls: Calls = { scoreDelta: 0, currencyDelta: 0 };
  const ctx: PerkContext = {
    grid,
    hand,
    rng,
    run,
    target: options.target,
    addScore(n: number) {
      calls.scoreDelta += n;
    },
    addCurrency(n: number) {
      calls.currencyDelta += n;
    },
    setCell(x: number, y: number, value: 0 | 1) {
      grid[y][x] = value;
    },
    replaceHandPiece(index: number, piece) {
      hand[index] = piece;
    },
  };
  return { ctx, calls };
}
