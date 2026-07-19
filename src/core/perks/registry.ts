import type { Rng } from '../rng';
import type { PerkId } from '../types';
import type { Perk } from './perkTypes';
import { PERKS } from './perks';

export const PERK_REGISTRY: Readonly<Record<PerkId, Perk>> = Object.fromEntries(
  PERKS.map((perk) => [perk.id, perk]),
);

export function getPerk(id: PerkId): Perk | undefined {
  return PERK_REGISTRY[id];
}

function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Draws `count` distinct, currently-offerable perks: owned non-stackable perks are excluded
// (02 §2.7 "3 distinct random perks the player doesn't already own, unless stackable").
// Uses the run's seeded RNG so the offer is deterministic/replayable.
export function drawOffers(rng: Rng, ownedPerks: readonly PerkId[], count = 3): PerkId[] {
  const owned = new Set(ownedPerks);
  const offerable = PERKS.filter((perk) => perk.stackable || !owned.has(perk.id));
  return shuffled(rng, offerable)
    .slice(0, Math.min(count, offerable.length))
    .map((perk) => perk.id);
}
