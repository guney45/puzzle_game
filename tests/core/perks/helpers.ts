import { GameEngine } from '../../../src/core/engine';
import { createEmptyGrid } from '../../../src/core/grid';
import { createRng } from '../../../src/core/rng';
import type { RunState } from '../../../src/core/types';

// Builds a GameEngine with an arbitrary RunState via the serialize/deserialize round-trip,
// same trick tests/core/engine.test.ts uses to drop the engine into a scripted scenario.
export function buildEngine(overrides: Partial<RunState>): GameEngine {
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
