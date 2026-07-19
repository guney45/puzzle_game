// Seeded PRNG (mulberry32) — deterministic, serializable. No Math.random() in core.
export interface Rng {
  next(): number; // float in [0, 1)
  nextInt(maxExclusive: number): number; // integer in [0, maxExclusive)
  getState(): number;
}

export function createRng(seed: number): Rng {
  let state = seed | 0;

  function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    nextInt(maxExclusive: number): number {
      return Math.floor(next() * maxExclusive);
    },
    getState(): number {
      return state;
    },
  };
}

// Reconstructs an Rng that continues the exact sequence a prior Rng would have produced,
// given a state captured via getState().
export function rngFromState(state: number): Rng {
  return createRng(state);
}

// Deterministically picks n items from a list (with replacement).
export function pickN<T>(rng: Rng, items: readonly T[], n: number): T[] {
  const result: T[] = [];
  for (let i = 0; i < n; i++) {
    const index = rng.nextInt(items.length);
    result.push(items[index]);
  }
  return result;
}
