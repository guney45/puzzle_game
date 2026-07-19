# 03 — Technical Architecture

## 3.1 Tech stack (decided — don't re-litigate mid-build)

| Concern | Choice | Why |
|---------|--------|-----|
| Language | **TypeScript** (strict) | Types catch the array-index bugs this game is full of. |
| Rendering / input / audio | **Phaser 3** | Mature 2D engine: scenes, drag input, tweens, particles, audio, screen-shake — all the "juice" for free. Well represented in training data. |
| Build tool / dev server | **Vite** | Instant HMR, TS-native, trivial to test and to build a static bundle Capacitor can wrap. |
| Unit tests (logic) | **Vitest** | Same config as Vite; fast; runs the pure engine headlessly. |
| E2E / smoke tests | **Playwright** | Headless Chromium is **preinstalled in this environment** — drives the real game in a browser. |
| Mobile packaging | **Capacitor** (M6) — **iOS first** | Wraps the web build into a native **iOS** shell (Android deferred); rich plugin ecosystem incl. AdMob. A native iOS build/release needs a **Mac + Xcode + Apple Developer account**. |
| Ads (M6) | **AdMob** via `@capacitor-community/admob` | Rewarded + interstitial; the casual-puzzle standard. |
| Persistence | `localStorage` (web) / **Capacitor Preferences** (native), behind one interface | Offline, no backend needed for MVP. |
| Backend | **None** for MVP | Fully offline. Leaderboards/cloud-save are a deliberate later phase. |

### Why web-first (and not Unity/Godot/Flutter)

- **Verifiability for an AI agent.** The whole engine runs and is unit-tested in Node with
  Vitest — no game runtime, no GPU, no manual "does it look right." Playwright then drives the
  real UI headlessly. Unity/Godot/Flutter are far harder to build *and verify* unattended.
- **Instant playtest + free web release.** `npm run dev` gives a shareable browser build in
  seconds; iterating on perk feel is fast.
- **Still ships to stores.** Capacitor produces a real native **iOS** app (Android later) with
  ad SDKs — and, being web-first, it also runs on the iPhone with **zero native tooling** during
  development (next section).

> Alternative if you dislike Phaser: plain HTML5 Canvas works for this static-grid game, but
> you'd re-implement tweens/particles/audio/input by hand (more code, more bugs). Recommend
> Phaser. **Whichever is chosen, the §3.3 pure-logic boundary is non-negotiable.**

### 3.1.1 Getting onto the iPhone (two paths — this drives the whole workflow)

The target device is an **iPhone 12**, and the plan is **iOS-first**. There are two distinct
ways the game reaches the phone, and they have very different costs:

**Path A — Web / PWA (development & playtesting; use this for all of M2–M5).**
- Run `npm run dev` (or `npm run preview` on the production build) on the computer, then open the
  dev server's LAN URL in **Safari on the iPhone 12** (both on the same Wi-Fi). Instant testing of
  the real game on the real device.
- Add a web app manifest + iOS meta tags so it can be **"Add to Home Screen"** as a fullscreen,
  offline **PWA** that looks like an app. Required bits in `index.html` / `public/`:
  - `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">`
  - `<meta name="apple-mobile-web-app-capable" content="yes">` and a status-bar-style meta
  - `manifest.webmanifest` (name, icons, `display: standalone`, `orientation: portrait`, theme color)
  - Apple touch icon(s) in `public/`
  - CSS: honor `env(safe-area-inset-*)` so the board clears the notch/home indicator (see `02 §2.12`)
  - Phaser `Scale` config: portrait, `Scale.FIT` (or `RESIZE`) + `autoCenter`, DPR-aware.
- **Cost: zero.** No Mac, no Xcode, no Apple Developer account. This is where you validate "is it fun."
- **Limits:** Safari/PWA can't show AdMob native ads or use StoreKit IAP — monetization needs Path B.

**Path B — Native iOS via Capacitor (M6+, for ads/IAP and the App Store).**
- `npx cap add ios` wraps the built web app; open in **Xcode**, run on the iPhone 12 or a simulator.
- **Requires a Mac + Xcode**, and a physical-device install / App Store submission requires an
  **Apple Developer account ($99/yr)**. Distribute test builds via **TestFlight**.
- This is the only path that supports AdMob and StoreKit IAP. Scheduled in M6 — not before.

> Practical implication: you can build and enjoy the entire MVP (M0–M5) on your iPhone with just a
> browser. You only need Mac/Xcode/Apple-account once you decide to monetize and publish (M6/M7).
> If you don't have a Mac, MVP is still fully doable; flag it before M6 so we plan the native step.

## 3.2 The architectural rule (most important thing in this repo)

**Two layers, one direction of dependency:**

```
┌─────────────────────────────────────────────┐
│  VIEW layer  (Phaser scenes, sprites, input) │  ── depends on ──►  CORE
│  Renders CORE state. Sends player intents.    │
│  NEVER contains game rules.                    │
└─────────────────────────────────────────────┘
                     ▲
                     │ (CORE never imports VIEW, Phaser, or the DOM)
┌─────────────────────────────────────────────┐
│  CORE layer  (pure TypeScript game engine)   │
│  Grid, pieces, placement, clearing, scoring,  │
│  perks, game-over, RNG. 100% unit-tested.      │
└─────────────────────────────────────────────┘
```

- **CORE** must not import Phaser, touch the DOM/`window`, use `Math.random` directly (use the
  injected seeded RNG), or read wall-clock time for logic. Everything it needs is passed in.
- **VIEW** owns pixels, animation, sound, and input gestures. It translates a drag-drop into a
  logic intent like `engine.tryPlace(pieceId, gridX, gridY)`, then re-renders from the returned
  state. It renders perk cards, HUD, and plays the animations described by the engine's result.
- Communication is either **return values** from engine methods or a small **event emitter**
  the engine writes to (e.g. `{type:'linesCleared', cells:[...], combo:3}`) that the VIEW
  listens to in order to trigger the right animation. Keep this event list small and explicit.

If you follow only one thing from these docs, follow this.

## 3.3 Folder structure

```
puzzle_game/
├─ README.md
├─ docs/                      # this plan (already present)
├─ index.html                 # Vite entry
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ vitest.config.ts           # (or share vite.config via test field)
├─ playwright.config.ts
├─ public/                    # static assets served as-is (icons, manifest)
├─ src/
│  ├─ main.ts                 # boots Phaser Game, registers scenes
│  ├─ core/                   # ← PURE LOGIC. No Phaser, no DOM. Fully tested.
│  │  ├─ types.ts             # Cell, Grid, Piece, Hand, PerkId, RunState, events…
│  │  ├─ grid.ts              # grid create/read/write, in-bounds, box helpers
│  │  ├─ pieces.ts            # piece catalogue + shape definitions
│  │  ├─ placement.ts         # canPlace(), place(), enumerateValidPlacements()
│  │  ├─ clearing.ts          # detect full rows/cols/boxes, resolve clears
│  │  ├─ scoring.ts           # score & combo formulas (single source of truth)
│  │  ├─ rng.ts               # seeded PRNG (mulberry32/xorshift) — deterministic
│  │  ├─ gameOver.ts          # any-piece-placeable check
│  │  ├─ engine.ts            # GameEngine: owns RunState, orchestrates a turn, emits events
│  │  └─ perks/
│  │     ├─ perkTypes.ts      # Perk interface + hook signatures + ctx type
│  │     ├─ registry.ts       # id → Perk map; random draw of 3 (seeded)
│  │     └─ perks.ts          # the ~15 starter perks (one object each)
│  ├─ view/                   # ← PHASER. Renders core state, sends intents.
│  │  ├─ scenes/
│  │  │  ├─ BootScene.ts
│  │  │  ├─ MenuScene.ts
│  │  │  ├─ GameScene.ts      # the board, tray, HUD; wires input → engine
│  │  │  ├─ PerkSelectScene.ts (or an overlay/DOM modal)
│  │  │  └─ GameOverScene.ts
│  │  ├─ render/              # grid renderer, piece sprites, ghost preview, popups
│  │  ├─ input/               # drag-drop → grid coords → engine intents
│  │  ├─ fx/                  # particles, screen shake, tweens (respect reduce-motion)
│  │  └─ audio/               # SFX manager + mute
│  ├─ platform/               # thin adapters (swap web ↔ native)
│  │  ├─ storage.ts           # Storage interface: get/set/remove
│  │  ├─ storage.web.ts       # localStorage impl
│  │  ├─ storage.capacitor.ts # Capacitor Preferences impl (M6)
│  │  └─ ads.ts               # Ads interface (no-op stub for web; AdMob impl in M6)
│  └─ config/
│     └─ constants.ts         # GRID_SIZE=9, BOX=3, HAND_SIZE=3, PERK_EVERY_N_CLEARS=5, scores…
└─ tests/
   ├─ core/                   # Vitest unit tests mirroring src/core (the bulk of tests)
   └─ e2e/                    # Playwright smoke tests
```

## 3.4 Core data models (TypeScript sketch — refine in code)

> Illustrative, not final. Names/shapes should match the actual code Sonnet writes.

```ts
// core/types.ts
export type CellState = 0 | 1;                 // empty | filled (add a color id later)
export type Grid = CellState[][];              // 9 rows × 9 cols (grid[y][x])

export interface Coord { x: number; y: number; }

export interface Piece {
  id: string;                                  // catalogue id, e.g. "L4", "line1x5"
  cells: Coord[];                              // offsets from the piece's origin
  colorId: string;                             // for rendering
  size: number;                                // cells.length (cached)
}

export type Hand = (Piece | null)[];           // length HAND_SIZE; null = already placed

export interface RunState {
  grid: Grid;
  hand: Hand;
  score: number;
  totalClears: number;
  clearsSinceLastPerk: number;
  activePerks: PerkId[];
  perkState: Record<PerkId, unknown>;          // per-perk bookkeeping (charges, counters)
  rngState: number;                            // serializable seed/state for save+resume
  status: 'playing' | 'perk_select' | 'game_over';
  pendingPerkChoices?: PerkId[];               // the 3 offered
  // + runCurrency, streak, settings snapshot, etc.
}

// Result of committing a placement — the VIEW animates from this.
export interface PlaceResult {
  ok: boolean;
  placedCells: Coord[];
  clearedCells: Coord[];
  clearedLines: { rows: number[]; cols: number[]; boxes: number[] };
  combo: number;
  scoreDelta: number;
  triggeredPerkSelect: boolean;
  gameOver: boolean;
  events: GameEvent[];                         // ordered fx cues for the view
}
```

```ts
// core/perks/perkTypes.ts
export interface PerkContext {
  grid: Grid;
  hand: Hand;
  rng: Rng;
  run: RunState;
  addScore(n: number): void;
  // controlled mutators the engine exposes to perks
}

export interface Perk {
  id: PerkId;
  name: string;
  description: string;
  iconId: string;
  stackable?: boolean;
  hasActiveAbility?: boolean;
  // all hooks optional — a perk implements only what it needs
  onHandGenerate?(hand: Hand, ctx: PerkContext): Hand;
  onAfterPlace?(piece: Piece, at: Coord, ctx: PerkContext): void;
  modifyClears?(lines: ClearedLines, ctx: PerkContext): ClearedLines;
  scoreModifier?(base: number, ev: ScoreEvent, ctx: PerkContext): number;
  onClearResolved?(result: PlaceResult, ctx: PerkContext): void;
  activeAbility?(ctx: PerkContext): void;
  onGameOver?(ctx: PerkContext): void;
}
```

The `GameEngine` in `engine.ts` is the only thing the VIEW calls. Suggested surface:

```ts
class GameEngine {
  constructor(opts: { seed: number; settings: Settings });
  getState(): Readonly<RunState>;
  tryPlace(pieceIndex: number, at: Coord): PlaceResult;   // core turn resolution
  canPlaceAnywhere(): boolean;
  choosePerk(perkId: PerkId): void;                       // resolves PERK_SELECT
  useActiveAbility(perkId: PerkId): PlaceResult | void;
  serialize(): string;                                     // save
  static deserialize(s: string): GameEngine;               // resume
}
```

## 3.5 Determinism & RNG

- One seeded PRNG (e.g. `mulberry32`) drives **all** randomness: piece deals, perk draws,
  perk internal randomness. No `Math.random()` in CORE.
- The RNG state is part of `RunState` and is serialized, so **save/resume reproduces exactly**,
  and tests are deterministic. Seeds also enable future "daily challenge" fixed-seed runs.

## 3.6 Persistence

- `platform/storage.ts` defines `interface Storage { get(k): string|null; set(k,v); remove(k) }`.
- MVP uses `storage.web.ts` (localStorage). M6 adds `storage.capacitor.ts`. The engine/game code
  depends only on the interface.
- Persist: `highScore`, `settings`, and a **serialized in-progress run** (for Continue). Save on
  each resolved turn (cheap) or debounced.

## 3.7 Ads/monetization integration (M6 — designed-for now, built later)

- `platform/ads.ts` defines `interface Ads { showRewarded(): Promise<'rewarded'|'dismissed'>;
  showInterstitial(): Promise<void>; init(): Promise<void>; }`.
- MVP ships a **no-op web stub** that resolves instantly (so rewarded flows are testable without
  a network). M6 adds the AdMob implementation for the native **iOS** build and wires the
  placements from `01-concept-and-strategy.md §1.4` (rewarded continue, reroll perks; capped
  interstitial at game-over). Game logic never imports the ad SDK directly.
- **iOS ad requirements (M6):** trigger the **App Tracking Transparency (ATT)** prompt before
  requesting personalized ads, add the `NSUserTrackingUsageDescription` string and the AdMob
  `GADApplicationIdentifier` + `SKAdNetworkItems` to `Info.plist`. The `Ads` interface stays the
  same; only the native implementation and Xcode config differ.

## 3.8 Performance / targets

- Target a smooth **60fps on iPhone 12** (its ProMotion-less display caps at 60Hz anyway) — and
  by extension any lower-end phone later. This game is trivial to render (≤81 cells + a few
  sprites), so performance is a non-issue *if* animations use Phaser tweens/particles sanely and
  the VIEW doesn't rebuild the whole scene per frame. Render from state on change, not every tick.
- Render at device pixel ratio (iPhone 12 is @3×) so the board looks crisp, but cap particle
  counts so the reduce-motion path and older devices stay smooth.
- Bundle: keep it small; Phaser is the main weight. Lazy-loading isn't needed for MVP.

## 3.9 Tooling & scripts (define in package.json)

```
npm run dev        # vite dev server (playtest in browser)
npm run build      # production static build → dist/
npm run preview    # serve dist/
npm test           # vitest run (core unit tests)  ← gate for every milestone
npm run test:watch # vitest watch
npm run e2e        # playwright test (headless Chromium)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint (optional but recommended)
```

`npm test` + `npm run typecheck` passing is the hard gate before any milestone is "done."
