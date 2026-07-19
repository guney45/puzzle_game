import { describe, expect, test } from 'vitest';
import { createRng, pickN, rngFromState } from '../../src/core/rng';
import { PIECE_CATALOGUE } from '../../src/core/pieces';

describe('rng', () => {
  test('same seed produces the same sequence', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  test('different seeds produce different sequences', () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  test('next() values stay within [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test('nextInt(n) stays within [0, n)', () => {
    const rng = createRng(99);
    for (let i = 0; i < 100; i++) {
      const v = rng.nextInt(9);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(9);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  test('rngFromState continues the exact sequence a saved-state rng would produce', () => {
    const original = createRng(1234);
    original.next();
    original.next();
    const savedState = original.getState();
    const expectedNext = original.next();
    const expectedAfter = original.next();

    const resumed = rngFromState(savedState);
    expect(resumed.next()).toBe(expectedNext);
    expect(resumed.next()).toBe(expectedAfter);
  });

  test('pickN is deterministic for a given seed', () => {
    const a = pickN(createRng(5), PIECE_CATALOGUE, 3);
    const b = pickN(createRng(5), PIECE_CATALOGUE, 3);
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
  });
});
