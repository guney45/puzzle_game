# 01 — Concept & Strategy

## 1.1 The concept

A single-screen, offline puzzle game:

- A **9×9 grid**. The player is dealt a **hand of 3 block pieces** (polyomino shapes).
- Drag pieces onto the grid. Pieces **do not fall or gravity-drop** — they stay exactly
  where placed (this is Blockudoku/Woodoku, **not** Tetris).
- When a full **row**, full **column**, or full **3×3 box** (sudoku-style region) becomes
  filled, those cells clear and award points. Clearing multiple lines at once = combo bonus.
- When all 3 pieces are placed, a new hand of 3 is dealt.
- **Game over** when none of the 3 current pieces can fit anywhere on the grid.

### The twist (the reason this game exists)

Every time the player reaches **5 total clears** (rows + columns + boxes counted together),
the game pauses and offers **3 random passive perks (cards)**. The player picks 1. Perks
permanently change the rules of *that run* — scoring, piece generation, board behavior, or
grant active abilities. Examples: "corner placements score +10", "once per run, rotate the
whole board 90°", "every 4th piece is a single 1×1 cell", "clears also remove the cell
above them".

Because the perks are drawn randomly and stack in different combinations, **no two runs
play the same** — this is the roguelite loop (à la *Balatro*, *Slay the Spire*) grafted onto
a proven casual puzzle base.

## 1.2 My honest opinion (asked for)

**The base genre is a good, safe choice, and the roguelite twist is genuinely the right
differentiator. But be realistic about the market.**

What's right about it:

- **It's the correct genre for an AI-built game.** Pure 2D, discrete array logic, no
  physics, no netcode. An agent can build and *verify* it end-to-end. This matters more
  than it sounds.
- **The twist is the moat.** The base block-puzzle market is brutally saturated and
  dominated by Block Blast! and Woodoku, backed by huge user-acquisition budgets. You will
  **not** win by shipping a cleaner clone. You *can* carve a niche with the roguelite layer,
  which those market leaders deliberately avoid (they optimize for the widest possible casual
  audience). *Balatro* proved that "simple, familiar mechanic + roguelite perk stacking" can
  be a breakout. Your job is to be the "Balatro of block puzzles" for a smaller, stickier
  audience.
- **Retention economics favor the twist.** Perk builds create "just one more run" and give
  players a reason to come back — which is exactly what ad-based monetization needs.

What to be sober about:

- **Revenue expectations.** The overwhelming majority of indie casual games earn little.
  Casual puzzle money comes from *volume × retention × ad monetization*, and volume comes
  from either luck (organic virality) or paid user acquisition (which costs money you may
  not want to spend on v1). Treat v1 as: *build something genuinely fun and shippable, learn
  the pipeline, get real retention numbers.* Do **not** budget your life on it.
- **"Fun" is the only real risk here, and it can't be planned into existence.** The plan
  de-risks the *engineering*. It cannot guarantee the perk balance feels good. That's why the
  roadmap front-loads a playable core and a perk system you can tune quickly — you must
  playtest and iterate on feel.
- **Polish and "juice" are not optional in this genre.** Players judge casual puzzlers in the
  first 30 seconds on feel (satisfying clears, sound, particles). A mechanically perfect but
  dry game will bounce. This is budgeted as a real milestone (M4), not an afterthought.

**Verdict: proceed.** It's a sound plan with a real differentiator and a realistic build
path. Just anchor your expectations to "ship a good game and learn," not "get rich."

## 1.3 Target audience

- Primary: casual puzzle players who already play Woodoku/Block Blast but want more depth.
- Secondary: roguelite/strategy fans (Balatro/StS players) who like short, snackable runs.
- Platform: **iOS-first**. The developer tests on their own **iPhone 12** first; Android is
  **deferred** (revisited only if the game graduates to a wider launch). Because the game is
  built **web-first**, early iPhone testing happens in **mobile Safari / as a PWA** — no Mac,
  no Xcode, no Apple Developer account needed until the native App Store phase (M6). See
  `03-technical-architecture.md §3.1.1` for the two iPhone delivery paths.

## 1.4 Monetization strategy (kept OUT of MVP on purpose)

Design the game to be monetizable, but **do not build ads/IAP until the core loop is proven
fun** (see roadmap M6). Planned model — hybrid casual:

1. **Rewarded video ads (primary, player-friendly):**
   - "Continue run" — watch an ad to clear a few cells / get one more hand after game-over
     (once or twice per run). This is the highest-value placement in roguelites.
   - "Reroll perks" — watch an ad to re-draw the 3 perk options.
   - Optional "double run rewards" at run end (feeds meta-progression currency later).
2. **Interstitial ads (secondary, sparingly):** shown at game-over, frequency-capped
   (e.g. not more than once per 2–3 minutes) to avoid tanking retention.
3. **IAP:**
   - **Remove ads** (one-time, removes interstitials, keeps rewarded opt-in). The single most
     important IAP for casual.
   - Later: cosmetic themes/skins, a "starter perk pack" or premium perk set.
4. **No pay-to-win.** Roguelite integrity matters to the target audience; keep purchases
   cosmetic or convenience.

Tech for this (AdMob via Capacitor) is specced in `03-technical-architecture.md` and
scheduled in M6 — the game logic stays completely independent of it.

> **iOS specifics (because we ship to iPhone first):**
> - **Ads:** AdMob on iOS requires an **App Tracking Transparency (ATT)** prompt and
>   `SKAdNetwork` configuration in `Info.plist`. Non-personalized ads still serve if the user
>   declines tracking, so revenue isn't zero — just lower CPMs.
> - **IAP:** on iOS all in-app purchases go through **Apple StoreKit** (Apple takes ~15–30%).
> - **Build/publish requirements:** a native iOS build needs a **Mac + Xcode**, and running on a
>   physical iPhone / submitting to the App Store needs an **Apple Developer account ($99/yr)**.
>   App Review is stricter than Google Play (expect a review pass before each release).
> - **All of the above is M6+ only.** Testing the *gameplay* on your iPhone 12 needs none of it —
>   Safari or a home-screen PWA is enough (see `03 §3.1.1`).

## 1.5 Success metrics (what "working" means)

Track these once there's a build; they drive iteration decisions:

- **D1 retention** (came back next day) — casual benchmark ≈ 30–40%+ is healthy.
- **Average session length** and **runs per session**.
- **Perk pick distribution** — if one perk is always/never taken, it's mis-tuned.
- **Average run length / clears per run** — the difficulty curve dial.
- **Rewarded-ad opt-in rate** (post-M6) — how often players choose to watch.

For MVP, the only metric that matters is your own honest answer to: *"Do I want to press
'play again'?"*
