# 04 — Implementation Roadmap

**Rule: one milestone per coding session.** Each milestone is self-contained, ends green
(`npm test` + `npm run typecheck` pass), and is committed before the next starts. This keeps
each Sonnet session small and cheap, and makes regressions obvious.

Legend — every milestone lists **Deliverables**, **Acceptance criteria (AC)**, and **Tests**.

---

## M0 — Project scaffold

**Deliverables**
- Vite + TypeScript (strict) + Phaser 3 project. `index.html`, `src/main.ts` boot an empty
  Phaser game showing a placeholder "Boot OK" scene.
- Vitest and Playwright configured. Folder structure from `03 §3.3` created (empty stubs OK).
- `package.json` scripts from `03 §3.9`. `tsconfig.json` strict. `.gitignore` (node_modules, dist).
- `constants.ts` with `GRID_SIZE=9, BOX_SIZE=3, HAND_SIZE=3, PERK_EVERY_N_CLEARS=5` and score consts.

**AC**
- `npm install` clean. `npm run dev` serves a page. `npm run build` succeeds. `npm run typecheck`
  passes. `npm test` runs (a trivial `expect(true).toBe(true)` is fine). `npm run e2e` runs and
  the smoke test loads the page.

**Tests**: one trivial Vitest test + one Playwright test that opens the page and asserts the canvas exists.

---

## M1 — Core engine (pure logic, no rendering)

The heart of the game. **No Phaser, no DOM.** All in `src/core/`, all unit-tested.

**Deliverables**
- `grid.ts`: create empty grid, get/set cell, in-bounds check, box-index helpers.
- `pieces.ts`: the starter piece catalogue (`02 §2.3`) as data.
- `rng.ts`: seeded PRNG with serializable state; helper to pick N from a list deterministically.
- `placement.ts`: `canPlace(grid, piece, at)`, `place(...)` (returns new grid or mutates a copy),
  `enumerateValidPlacements(grid, piece)`.
- `clearing.ts`: detect full rows/cols/boxes; `resolveClears(grid)` → cleared cells + counts.
- `scoring.ts`: placement points, line points, combo bonus (`02 §2.5`) — single source of truth.
- `gameOver.ts`: `canPlaceAnywhere(grid, hand)`.
- `engine.ts`: `GameEngine` with `tryPlace`, hand dealing/refill, `totalClears`/perk-trigger
  counter (trigger just flips status to `perk_select` for now; perks land in M3), `getState`,
  `serialize`/`deserialize`. Deterministic from a seed.

**AC**
- A test can play a full scripted run through the engine (deal → place → clear → refill →
  game-over) with **zero** rendering, and every number matches expectations.
- Serialize→deserialize reproduces identical subsequent behavior (determinism).

**Tests (this is where testing effort concentrates):**
- Placement: valid/invalid (out of bounds, overlap), all catalogue shapes.
- Clearing: single row, single col, single box, overlapping row+col+box union, nothing-cleared.
- Combos: 2/3/4 simultaneous clears score per the formula.
- Scoring: placement points, line points, combo math — exact values.
- Game-over: constructed board where no piece fits → true; where one fits → false.
- Hand lifecycle: refill on empty, seeded determinism, serialize/deserialize round-trip.

---

## M2 — Rendering & input (playable, no perks yet)

**Deliverables**
- `GameScene`: draw the 9×9 grid (with visible 3×3 box separators), the 3-piece tray, and a HUD
  (score, high score).
- Drag-and-drop: pick a tray piece, drag over the grid, show a **ghost preview** (valid = green,
  invalid = red), drop to commit via `engine.tryPlace`. Snap to cells.
- Render `PlaceResult`: fill placed cells, animate cleared cells (basic tween is fine for now),
  refill the tray, reflect score.
- `MenuScene` (Play button → GameScene) and a minimal `GameOverScene` (score + Play Again).
- `platform/storage.web.ts` + high-score persistence.

**AC**
- You can open the browser, play a real game start-to-finish, clear lines, and hit game-over.
  It's not pretty yet, but it's fully playable and the score is correct.

**Tests**
- Playwright smoke: load → place a scripted piece via drag → assert score/DOM/canvas state
  changed. (E2E stays light; logic is covered by M1 units.)

---

## M3 — Roguelite perk system (the twist)

**Deliverables**
- `perks/perkTypes.ts`: `Perk` interface + all hooks + `PerkContext` (`03 §3.4`).
- Engine integration: at each hook point, iterate active perks and apply them. Perk-select
  trigger every `PERK_EVERY_N_CLEARS` clears; `choosePerk`; `useActiveAbility`.
- `perks/registry.ts`: id→perk map; seeded random draw of 3 distinct offerable perks.
- `perks/perks.ts`: the ~15 starter perks (`02 §2.7`). At minimum #1–#11; #12–#15 (active
  abilities/currency) may land in an M3.5 but the hooks for them exist now.
- `PerkSelectScene`/overlay: 3 cards, pick one, applies to run; owned-perks strip in HUD;
  active-ability buttons for perks that have them.

**AC**
- Reaching 5 clears opens the perk modal; picking a perk **visibly and correctly** changes play
  (e.g. Corner Master adds +10 on corner placements; Overflow clears the row above).
- Each perk has a unit test proving its hook effect in isolation.

**Tests**
- One focused unit test per perk (drive the engine, assert the perk's effect on state/score).
- Registry: draws exactly 3 distinct, currently-offerable perks; respects `stackable`.
- Trigger cadence: perk-select fires at the right clear counts.

---

## M4 — Juice & polish (make it *feel* good)

**Deliverables** (from `02 §2.10`)
- Clear animation (pop/flash/particles), floating score popups, combo text.
- Screen shake on big clears (gated by reduce-motion setting).
- SFX: place / clear / combo / perk-pick / game-over, with a mute toggle in settings.
- Perk-pick celebratory beat. Polished game-over summary (clears, perks taken, high-score badge).
- Settings menu: sound, music (optional), reduce-motion.

**AC**
- Clears and combos feel satisfying; the "just one more run" pull is noticeably present in your
  own playtest. Reduce-motion actually disables shake/heavy particles.

**Tests**: Playwright smoke still green; add a test that toggling mute persists. (Feel is judged by playtest.)

---

## M5 — Persistence & meta polish

**Deliverables**
- Save/resume an in-progress run (serialize `RunState`, incl. RNG state) → **Continue** on menu.
- High score + settings persistence hardened. Clear-save on game-over.
- Basic run-currency display if **Greed** perk shipped (no spending yet).

**AC**
- Start a run, refresh the page, hit **Continue** → identical board/hand/score/perks restored.

**Tests**: unit round-trip on full `RunState` incl. mid-run perks; Playwright reload-and-continue smoke.

---

## ⭐ MVP COMPLETE after M5 — validate fun before proceeding

Stop and playtest hard. If the core loop isn't fun, **tune perks/scoring/cadence, don't add
features.** Only move to M6 once you'd genuinely choose "Play Again." Consider shipping the
**web build** here (itch.io / GitHub Pages) to gather real feedback cheaply.

---

## M6 — Mobile packaging & monetization

**Deliverables**
- Add Capacitor; configure Android project; verify the web build runs in the native shell.
- `storage.capacitor.ts` (Preferences) wired behind the storage interface.
- `platform/ads.ts` AdMob implementation (`@capacitor-community/admob`) using **test ad unit
  ids**. Placements per `01 §1.4`: rewarded "Continue" at game-over, rewarded "Reroll perks",
  frequency-capped interstitial at game-over. Web keeps the no-op stub.
- "Remove ads" IAP scaffold (can stub the store call until store setup).

**AC**
- Native Android debug build installs and runs; test ads display; rewarded "Continue" grants its
  reward; interstitial respects the frequency cap; web build unaffected (stub ads).

**Tests**: unit tests for ad-placement decision logic (cap timing, reward granting) with a mock Ads impl.

---

## M7 — Store preparation & launch

**Deliverables**
- App icon, adaptive icon, splash; store screenshots; short/long descriptions; privacy policy
  (ads require one); content rating; real AdMob ad unit ids; signed release build.
- Google Play internal/closed testing track; iterate on crash/feedback.

**AC**: a signed release AAB uploaded to a Play testing track, installable by testers.

---

## Suggested order & parallelism

Strictly sequential M0→M1→M2→M3 (each depends on the prior). M4 and M5 can be interleaved. M6/M7
only after MVP is validated fun. Keep each milestone to one session; if one is too big (M3 is the
largest), split it (e.g. M3a framework + perks #1–#11, M3b active-ability/currency perks + UI polish).

## Definition of Done (applies to every milestone)

- `npm run typecheck` and `npm test` pass; new logic has unit tests; E2E smoke still green.
- No Phaser/DOM imports leaked into `src/core/`.
- Committed with a clear message referencing the milestone (see `05` for conventions).
