# 05 — Working Agreement & Prompt Templates (for the coding agent)

This doc tells the implementing agent (Sonnet) **how** to work, and gives you **copy-paste
prompts** so you never re-explain context. Token-efficient by design: each prompt points the
agent at the exact docs it needs and nothing more.

## 5.1 Coding conventions

- **TypeScript strict.** No `any` (use `unknown` + narrowing). Prefer `readonly` and pure
  functions in `core/`.
- **The layer boundary is law:** nothing in `src/core/` may import Phaser, the DOM, `window`,
  or call `Math.random()`. If the agent is tempted to, it's a design smell — pass it in instead.
- **Single source of truth:** all rules/constants live where `03 §3.3` says (e.g. scoring only in
  `scoring.ts`, tunables only in `constants.ts`). No magic numbers scattered in the view.
- **Small, named functions** over clever one-liners. Names match the GDD vocabulary
  (`resolveClears`, `canPlaceAnywhere`, `onHandGenerate`).
- **Tests live next to their milestone** and must pass before commit. Test the CORE heavily; keep
  E2E light.
- Keep comments about *why*, not *what*. Match surrounding style.

## 5.2 Testing strategy

- **Core logic → Vitest, exhaustively.** This is where bugs hide and where headless tests shine.
  Every rule in `02` should have a test. Aim for full coverage of `placement`, `clearing`,
  `scoring`, `gameOver`, `engine`, and one test per perk.
- **UI → Playwright, lightly.** A few smoke tests (loads, can place a piece, score updates,
  reload+continue). Don't try to unit-test pixels.
- **Determinism:** seed the RNG in tests; assert exact scores and board states.
- Gate before every commit: `npm run typecheck && npm test`.

## 5.3 Definition of Done (repeat of `04`, keep it honest)

A milestone is done only when: typecheck + unit tests + e2e smoke are green, new logic is tested,
no layer-boundary violations, and it's committed with a clear message. If something was skipped or
a test is red, say so — don't claim done.

## 5.4 Git conventions

- Branch: `claude/block-puzzle-game-plan-i5gyd8` (already set) unless told otherwise.
- Commit per milestone (or per logical sub-step). Message format:
  `M1: core engine — grid, placement, clearing, scoring, game-over (+ unit tests)`.
- Don't open a PR unless the human asks.

## 5.5 How to run a milestone (the loop the agent should follow)

1. Read this doc + the milestone's entry in `04` + the specific `02`/`03` sections it references.
2. Restate the milestone's Deliverables and AC in one short paragraph, then implement.
3. Write tests alongside code. Run `npm run typecheck && npm test` (+ `npm run e2e` where relevant).
4. Fix until green. Commit. Report what was built, what's tested, and anything deferred.
5. **Stop at the milestone boundary.** Don't wander into the next milestone.

## 5.6 Copy-paste prompt templates

Paste one of these into a fresh Sonnet session (with this repo attached). Fill nothing else in —
the docs carry the context.

> **M0 — scaffold**
> "This repo contains a plan in `/docs` and no game code yet. Implement **Milestone M0** from
> `docs/04-implementation-roadmap.md`, following `docs/03-technical-architecture.md` (stack &
> folder structure) and `docs/05-sonnet-working-agreement.md` (conventions). Set up Vite +
> TypeScript(strict) + Phaser 3 + Vitest + Playwright, the folder structure, package scripts, and
> `constants.ts`. Meet M0's acceptance criteria, ensure `npm run typecheck && npm test && npm run
> build` pass, then commit. Do only M0."

> **M1 — core engine**
> "Implement **Milestone M1** (core engine) from `docs/04-implementation-roadmap.md`. Follow the
> rules in `docs/02-game-design-document.md` (§2.2–2.6 for grid/pieces/clearing/scoring/game-over)
> and `docs/03-technical-architecture.md` (§3.2 layer boundary, §3.4 data models, §3.5 RNG). All
> code goes in `src/core/` — **no Phaser, no DOM, no Math.random**. Write exhaustive Vitest tests
> per M1's test list. Get typecheck + tests green, then commit. Do only M1."

> **M2 — rendering & input** *(target: iPhone 12, portrait)*
> "Implement **Milestone M2** (Phaser rendering + drag-drop input) from
> `docs/04-implementation-roadmap.md`. The engine from M1 is the only game-logic source — the view
> must call it and render its state (see `docs/03 §3.2`). Build for **iPhone 12 in portrait** per
> `docs/02 §2.12` and `docs/03 §3.1.1`: safe-area-aware layout, PWA shell (manifest + Apple meta,
> Add-to-Home-Screen), touch drag with the ghost preview offset **above the finger**, ≥44pt touch
> targets. Deliver GameScene (grid + tray + HUD), MenuScene, minimal GameOverScene, and localStorage
> high score. Add a Playwright smoke test (optionally with an iPhone-12 device profile). Green +
> commit. Do only M2."

> **M3 — perk system**
> "Implement **Milestone M3** (roguelite perk system) from `docs/04-implementation-roadmap.md`,
> per `docs/02 §2.7` (hooks + the ~15 starter perks) and `docs/03 §3.4` (Perk interface). Add the
> hook calls in the engine, the registry with seeded 3-of draw, the perk-select UI every 5 clears,
> and one unit test per perk. If it's too large, split into M3a (framework + perks #1–#11) and M3b
> (active-ability/currency perks + UI polish) across two sessions. Green + commit each. Do only M3
> (or the stated sub-step)."

> **M4 — juice** / **M5 — persistence** / **M6 — iOS ads+Capacitor** / **M7 — App Store**
> "Implement **Milestone M<n>** from `docs/04-implementation-roadmap.md`, following its
> Deliverables/AC/Tests and the referenced sections of `docs/02` and `docs/03`. Meet DoD, green,
> commit. Do only M<n>."
>
> *(Reminder: M6/M7 are **iOS-first** and require a **Mac + Xcode + Apple Developer account**. If
> those aren't available, stay on the web/PWA build and postpone them — see `docs/03 §3.1.1`.)*

## 5.7 If the agent gets stuck or finds an ambiguity

- Prefer the simplest thing that satisfies the AC; note assumptions in the commit/report.
- If a rule in `02` and a model in `03` seem to conflict, `02` (design intent) wins for behavior,
  `03` (structure) wins for where code lives — and flag it to the human.
- Never silently expand scope. Surface trade-offs instead of guessing on anything user-facing
  (monetization, difficulty, spending currency).

## 5.8 Token-efficiency notes (why it's structured this way)

- Docs are split so each session loads only what it needs (`04` + one milestone + referenced
  sections), not the whole plan.
- The pure-logic boundary means M1 is verified without a browser — cheap, fast, no screenshot
  round-trips.
- One-milestone-per-session keeps context windows small and diffs reviewable.
