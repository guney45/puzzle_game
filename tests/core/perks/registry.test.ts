import { describe, expect, test } from 'vitest';
import { PERKS } from '../../../src/core/perks/perks';
import { PERK_REGISTRY, drawOffers } from '../../../src/core/perks/registry';
import { createRng } from '../../../src/core/rng';

describe('perk registry', () => {
  test('PERK_REGISTRY indexes every starter perk by id', () => {
    expect(Object.keys(PERK_REGISTRY)).toHaveLength(PERKS.length);
    for (const perk of PERKS) expect(PERK_REGISTRY[perk.id]).toBe(perk);
  });

  test('drawOffers draws exactly 3 distinct, currently-offerable perk ids', () => {
    const rng = createRng(99);
    const offers = drawOffers(rng, []);
    expect(offers).toHaveLength(3);
    expect(new Set(offers).size).toBe(3);
    for (const id of offers) expect(PERK_REGISTRY[id]).toBeDefined();
  });

  test('drawOffers excludes perks the player already owns', () => {
    const rng = createRng(1);
    const ownedIds = PERKS.slice(0, PERKS.length - 3).map((p) => p.id);
    const offers = drawOffers(rng, ownedIds);
    expect(offers).toHaveLength(3);
    for (const id of offers) expect(ownedIds).not.toContain(id);
  });

  test('drawOffers returns fewer than 3 once fewer than 3 perks remain offerable', () => {
    const rng = createRng(1);
    const ownedIds = PERKS.slice(0, PERKS.length - 1).map((p) => p.id);
    const offers = drawOffers(rng, ownedIds, 3);
    expect(offers).toHaveLength(1);
  });

  test('drawOffers is deterministic for a given rng state', () => {
    const offersA = drawOffers(createRng(42), []);
    const offersB = drawOffers(createRng(42), []);
    expect(offersA).toEqual(offersB);
  });
});
