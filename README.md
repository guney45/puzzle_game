# Block Puzzle Roguelite — Project Plan

Working title: **PerkBlocks** (rename freely).

A 9×9 block-placement puzzle (Woodoku / Blockudoku family) with a **roguelite twist**:
every 5 line/box clears the player picks 1 of 3 random passive perks, so each run
builds a different rule-set. The perk system is the differentiator and the retention hook.

> **This repository currently contains the PLAN only — no game code yet.**
> The docs below are written so a coding agent (Sonnet) can implement the game
> milestone-by-milestone with minimal back-and-forth.

## How to use this plan

1. Read the docs in order (they build on each other).
2. Implement **one milestone per coding session** — see `docs/04-implementation-roadmap.md`.
3. Copy the matching prompt template from `docs/05-sonnet-working-agreement.md`
   into your Sonnet session. Each template points Sonnet at the exact docs it needs,
   so you never re-explain context (token-efficient).

## Documents

| # | File | What it covers |
|---|------|----------------|
| 1 | [`docs/01-concept-and-strategy.md`](docs/01-concept-and-strategy.md) | The concept, an honest market/revenue reality check, target audience, monetization strategy, success metrics. |
| 2 | [`docs/02-game-design-document.md`](docs/02-game-design-document.md) | Full game design: rules, scoring, the perk system, the starter perk list, progression, UX flows. |
| 3 | [`docs/03-technical-architecture.md`](docs/03-technical-architecture.md) | Tech stack + rationale, folder structure, core data models, module boundaries, save/RNG/ads. |
| 4 | [`docs/04-implementation-roadmap.md`](docs/04-implementation-roadmap.md) | Phased milestones (M0–M7), each with concrete deliverables, acceptance criteria, and test requirements. |
| 5 | [`docs/05-sonnet-working-agreement.md`](docs/05-sonnet-working-agreement.md) | Coding conventions, testing strategy, Definition of Done, and copy-paste prompt templates per milestone. |

## The one rule that makes this AI-buildable

**The game logic is pure, framework-free TypeScript with zero rendering code, and it is
100% unit-tested. The visual layer (Phaser) only reads state and draws it.**

This single boundary is why an agent can build the whole game correctly: all the hard,
bug-prone logic (placement, clearing, combos, perks, scoring, game-over) runs and is
verified headlessly, with no browser and no "does it look right" guessing.

## Scope at a glance

**MVP (must be fun before we monetize):** 9×9 grid, 3-piece hand, row/column/3×3-box
clearing, combos, scoring, game-over detection, the roguelite perk system with ~15 perks,
local high score + run save/resume, and enough "juice" (animation/sound) to feel good.

**After MVP:** ads + IAP (AdMob via Capacitor), native **iOS** build, App Store submission,
meta-progression. Explicitly out of MVP so we validate the fun first.

**Target platform: iOS-first (iPhone 12).** Because the game is web-first, you playtest the whole
MVP on your iPhone through **Safari / a home-screen PWA — no Mac or Apple Developer account needed**
until the native App Store phase (M6). Android is deferred. See
[`docs/03-technical-architecture.md §3.1.1`](docs/03-technical-architecture.md) for the two
iPhone delivery paths.
