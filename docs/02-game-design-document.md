# 02 — Game Design Document (GDD)

This is the source of truth for *what the game does*. `03-technical-architecture.md` describes
*how it's built*. When implementing, the rules here map 1:1 to the pure logic engine.

## 2.1 Core loop

```
Deal hand of 3 pieces
      │
      ▼
Player drags a piece onto a valid location ──► place it (grid updated)
      │
      ▼
Resolve clears: any full row / column / 3×3 box clears ──► award score (+ combo bonus)
      │
      ├─ increment totalClears counter
      │        │
      │        ▼
      │   every 5 clears ──► PERK SELECTION (pick 1 of 3) ──► apply perk to run
      │
      ▼
Hand empty? ──► deal new hand of 3
      │
      ▼
Can ANY of the 3 current pieces be placed somewhere? ── no ──► GAME OVER
      │ yes
      └─► back to "Player drags a piece"
```

## 2.2 Board

- Grid is **9 columns × 9 rows** (81 cells). Each cell is empty or filled.
- The board is divided into nine **3×3 boxes** (like sudoku regions), used for box-clears.
- No gravity. Placed cells persist until cleared.

## 2.3 Pieces (polyominoes)

- A **piece** is a fixed shape defined by a set of relative cell offsets (e.g. an L-tromino,
  a 2×2 square, a 1×5 line, a single 1×1).
- The player is always holding a **hand of 3 pieces**, shown in a tray below the board.
- Pieces are **placed as-is** — **no rotation by the player** in MVP (rotation, if ever, is a
  perk or a later feature; keeping placement rotation-free simplifies logic and UX).
- A piece can be placed at a target grid position **iff** every one of its cells maps to an
  in-bounds, currently-empty grid cell.
- When all 3 pieces of a hand are placed, deal a **new hand of 3**.
- **Piece set (starter, ~ Woodoku-like):** define a catalogue of shapes. Suggested MVP set:
  - 1×1 (single)
  - 1×2, 1×3, 1×4, 1×5 lines (and their vertical variants)
  - 2×2 square, 2×3 / 3×2 rectangles, 3×3 square
  - L / J trominoes and tetrominoes, T, S, Z, corner (small L) shapes
  - Store each with a default color/skin id for rendering.
- **Piece generation:** by default, draw 3 pieces per hand from the catalogue via the seeded
  RNG. Generation should be **guardable/overridable** because perks modify it (see §2.7).
  A light "fairness" bias (avoid dealing 3 huge pieces onto a nearly-full board) is a
  post-MVP nicety, not required for M1.

## 2.4 Clearing rules

After each piece placement, in a single resolution step:

1. Find every **fully-filled row** (all 9 cells filled).
2. Find every **fully-filled column** (all 9 cells filled).
3. Find every **fully-filled 3×3 box** (all 9 cells filled).
4. Compute the union of all cells belonging to any cleared line/box, then empty them **all at
   once** (a cell shared by a cleared row and a cleared box is cleared once; the *count* of
   cleared lines still counts each line/column/box separately for scoring & combos).
5. `totalClears += (number of rows + columns + boxes cleared this step)`.

## 2.5 Scoring

Baseline formula (tune during playtest; keep it in one place so perks can hook it):

- **Placement points:** `+cellsInPiece` (e.g. placing a 4-cell piece gives +4). Rewards
  progress even without a clear.
- **Line clear points:** each cleared row/column/box = **+18** base (9 cells × 2). Tune later.
- **Combo bonus:** if `L` = number of lines cleared in one placement and `L ≥ 2`, add a
  multiplier bonus, e.g. `bonus = base × (L − 1)` or a stepped table
  `{2:×1.5, 3:×2, 4:×3, 5+:×4}`. Simultaneous multi-clears must feel dramatically rewarding —
  this is the skill-expression and the dopamine.
- **Streak (optional, post-MVP):** consecutive placements that each clear ≥1 line build an
  escalating multiplier that resets on a no-clear placement.
- Perks can add flat bonuses, multipliers, or conditional scoring (see §2.7).

`score` and `highScore` are separate. `highScore` persists across runs (local).

## 2.6 Game over

- After dealing/holding a hand, the game is over **iff none of the currently-held pieces can
  be legally placed at any position**. Detection = for each held piece, scan all grid
  positions; if at least one placement is valid for any piece, the game continues.
- On game over: show final score, high-score status, run summary (clears, perks taken),
  and a **Play Again** button. (Post-M6: offer a rewarded "Continue" here.)

## 2.7 The roguelite perk system (the twist)

### Trigger

Maintain `clearsSinceLastPerk`. Whenever `totalClears` crosses a multiple of **5**, enqueue a
**perk selection**. Present it at the next safe moment (after the current placement/clear
animation resolves, before the player's next move). Offer **3 distinct random perks** the
player doesn't already own (unless the perk is stackable). Player picks exactly 1.

> Design note: "every 5 clears" is the starting cadence. Expose it as a tunable constant
> (`PERK_EVERY_N_CLEARS`) so playtesting can adjust pacing without code changes.

### How perks work (architecture the engine must support)

Perks are **not** special-cased in the core rules. Instead the engine exposes **hooks/events**,
and each perk is a small object that registers handlers. A run holds a list of **active perks**;
the engine calls the relevant hook on all active perks at each step. Required hooks:

| Hook | Fired when | A perk can… |
|------|-----------|-------------|
| `onHandGenerate(hand, ctx)` | a new hand of 3 is about to be dealt | replace/modify pieces (e.g. force a 1×1, bias shapes) |
| `onBeforePlace(piece, pos, ctx)` | player commits a placement | validate/annotate (rarely used in MVP) |
| `onAfterPlace(piece, pos, ctx)` | piece cells written to grid | trigger board effects (e.g. also fill/clear neighbors) |
| `modifyClears(clearedLines, ctx)` | clears computed, before erasing | add/remove cleared cells (e.g. "clears also take the row above") |
| `scoreModifier(baseScore, event, ctx)` | any score is awarded | add flat/multiplier/conditional bonuses |
| `onClearResolved(result, ctx)` | after cells erased & scored | grant currency/energy, charge active abilities |
| `activeAbility(ctx)` | player taps a perk's button (if it has one) | one-shot/cooldown effects (e.g. rotate board, bomb a cell) |
| `onGameOver(ctx)` | game-over detected | last-chance effects (post-MVP) |

`ctx` gives read/controlled-write access to grid, hand, score, RNG, and run state. Keep hook
signatures stable — this is the extension point for *all* future perks, so getting it clean in
M3 pays off forever.

### Starter perk list (~15, ship in M3)

Implement these; they exercise every hook so the framework is proven. Tune numbers later.

**Scoring perks**
1. **Corner Master** — placing a piece touching a board corner: +10 score.
2. **Combo Fiend** — combo multipliers are increased by one tier.
3. **Box Bonus** — clearing a 3×3 box scores double.
4. **Momentum** — each consecutive clearing-placement adds a stacking +5 (resets on a no-clear).
5. **Full House** — clearing a row *and* column *and* box in one move: +200 jackpot.

**Piece-generation perks**
6. **Minimalist** — every 4th piece dealt is a 1×1 single.
7. **Slim Pickings** — never be dealt a 3×3 square (removes the most board-clogging piece).
8. **Twin Lines** — bias the deck toward long lines (1×4 / 1×5) more often.
9. **Fresh Hand** — once per run, an active ability: discard current hand, deal a new 3.

**Board/rules perks**
10. **Overflow** — when you clear a row, also clear the row directly above it (via `modifyClears`).
11. **Chain Reaction** — a placement that clears ≥2 lines clears one extra random full-ish line
    if one is 8/9 filled (soft "almost" clear).
12. **Second Wind** — active ability, once per run: rotate the entire board 90°.
13. **Bomb Draw** — active ability with a cooldown: destroy a single tapped cell.
14. **Gap Filler** — once per run: fill all isolated single-empty gaps enclosed by filled cells.

**Meta/economy perk (bridges to post-MVP monetization)**
15. **Greed** — clears grant a small "gold" run-currency (unused in MVP beyond display; wires
    up meta-progression later). Proves the `onClearResolved` currency hook.

> Only #1–#11 are strictly needed to validate "is it fun." #12–#15 (active abilities /
> currency) can slip to M3.5 if M3 runs long — but the *framework* must support them from day one.

### Perk selection UX

- Modal overlay: 3 cards, each showing name, icon, and one-line effect. Tap a card to select.
- Show the player's **owned perks** somewhere persistent (small icons strip) so builds are legible.
- Active-ability perks add a tappable button to the HUD when owned.

## 2.8 Difficulty & progression

- The game self-scales: as the board fills, clears get harder; perks push back. There are **no
  discrete levels** in MVP — a run is one continuous session ending at game-over.
- The perk cadence (every 5 clears) is the pacing metronome. Early perks make the player feel
  powerful; the challenge is managing an increasingly constrained board.
- Post-MVP meta-progression (out of scope for MVP): unlock new perks into the draw pool, daily
  challenges with fixed seeds, and cosmetic unlocks funded by run-currency.

## 2.9 Screens / states (finite state machine)

`BOOT → MAIN_MENU → PLAYING ⇄ PERK_SELECT → PLAYING → GAME_OVER → (PLAYING | MAIN_MENU)`

- **BOOT**: load assets, restore save.
- **MAIN_MENU**: Play, Continue (if a saved run exists), high score, settings (sound toggle).
- **PLAYING**: the core loop; HUD shows score, high score, owned perks, active-ability buttons.
- **PERK_SELECT**: modal; pauses PLAYING.
- **GAME_OVER**: summary + Play Again + (later) rewarded Continue.

## 2.10 Feel / "juice" (M4 — do not skip)

The genre lives or dies on feedback. Budgeted, concrete items:

- Snap-to-grid with a valid/invalid placement highlight (ghost preview under the dragged piece).
- Clear animation: cells pop/flash/shrink out; short particle burst.
- Score popups that float up from the clear location; combo text ("COMBO ×3!").
- Light screen shake on big/multi clears (respect a "reduce motion" setting).
- Sound: place, clear, combo, perk-pick, game-over. One-shot SFX, a mutable toggle.
- Perk selection: a small celebratory beat (the reward moment of the loop).
- Haptics on native (Capacitor Haptics) — post-MVP nicety.

## 2.11 Accessibility & settings (lightweight)

- Sound on/off, music on/off (music optional).
- Reduce-motion toggle (disables shake/heavy particles).
- Colorblind-friendly piece palette (distinct shapes/patterns, not color alone, for state).

## 2.12 Mobile screen & orientation (iPhone 12 is the primary target)

The first device this must look and feel right on is an **iPhone 12** (held in one hand).
Design for it from M2 onward:

- **Portrait, locked.** The whole game is portrait-only. Layout top→bottom: HUD (score / high
  score / owned-perk strip) → the 9×9 board (the visual anchor, centered) → the 3-piece tray →
  active-ability buttons if any.
- **iPhone 12 geometry:** 390×844 pt logical (1170×2532 px @3×), 19.5:9 aspect, a **top notch**
  and a **bottom home indicator**. Keep all interactive/important UI inside the **safe area** —
  never under the notch or the home indicator. Use the CSS `env(safe-area-inset-*)` values
  (see `03 §3.1.1`) and pad the HUD/tray accordingly.
- **Responsive, not pixel-fixed.** Size the board as a share of available width and scale
  everything from there, so it also fits taller/shorter phones later. Don't hardcode 390×844.
- **Touch targets ≥ 44×44 pt** (Apple HIG). Tray pieces and buttons must be comfortably
  thumb-tappable; the drag hit-area can be larger than the visible piece.
- **Drag ergonomics for touch:** show the dragged piece **offset above the finger** so the
  player can see the ghost preview and target cells (a finger covering the drop spot is the #1
  block-puzzle usability complaint). Snap to grid; show valid/invalid ghost as in §2.10.
- **No hover.** Everything must work with touch only (no mouse-hover affordances).
- Test each visual milestone on the real iPhone via Safari/PWA before calling it done.
