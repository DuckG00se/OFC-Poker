# OFC Poker

Single-player **Open Face Chinese Poker** against a CPU opponent. React 18 + TypeScript + Vite + Tailwind CSS v4, deployed to Cloudflare with `wrangler`.

> Work in progress: Phases 1 (rules engine) and 2 (Monte Carlo CPU) are complete. See [Roadmap](#roadmap).

## Run, test, deploy

```bash
npm install
npm run dev          # local dev server
npm test             # Vitest unit tests (engine, AI, state)
npm run typecheck    # tsc --noEmit (strict)
npm run build        # typecheck + production build into dist/
npm run deploy       # build, then `wrangler deploy` (needs `wrangler login` first)
```

## How the game is built

```
src/
  engine/      Pure, typed game engine. No React, no DOM, no timers, no Math.random.
    evaluate   row evaluation + comparison (wheel, kickers, 3-card front)
    foul       foul detection
    royalties  royalty tables, Fantasyland entry / stay rules
    scoring    full-hand scoring (rows, scoop, foul, royalties)
    reducer    the state machine: dealing, turns, staging/undo, scoring
    rng, deck  seeded shuffling (same seed = same deal)
    session    bankroll, dealer button, Fantasyland carry-over
  ai/          CPU opponent: heuristic, Monte Carlo search, Fantasyland solver, personas.
               Runs in a Web Worker; sees only what a player may see.
  state/       React glue: app reducer + the one hook that owns timers
  components/  Rendering only; they dispatch actions
tests/         Vitest suites for everything above
```

The engine is a reducer: `gameReducer(state, action) -> state`. Illegal actions return the *same* state object, so double clicks and late timers are harmless. Every applied action is logged, and `replay(log)` rebuilds a hand exactly. Cards are only ever dealt inside the reducer, so a card can never be dealt twice.

## Rules

Each player builds three rows from 13 cards: **front** (3 cards), **middle** (5) and **back** (5). Cards are placed face up and can't be moved once confirmed. The back row must be at least as strong as the middle, and the middle at least as strong as the front, or the board **fouls**.

### Variants

| Variant   | Deal                                                      |
|-----------|-----------------------------------------------------------|
| Classic   | 5 cards, then 8 single cards, all placed                  |
| Pineapple | 5 cards, then 4 times: get 3, place 2, discard 1          |

Players alternate turns. The dealer button flips every hand, and the player after the button acts first on each street. Discards are dead cards that only their owner can see.

### Scoring (heads-up)

* **+1** per row won, **0** for a tied row.
* **Scoop:** winning all three rows adds **+3**.
* **Foul:** a fouled board loses a full scoop (**6 points**) to the opponent and earns **no royalties**. If both boards foul, nothing changes hands. The non-fouling player still collects their royalties.
* Payout = net points × stake per point. Your bankroll starts at $1,000 and can go negative.

### Royalties (standard American table)

| Row    | Hand                                                                                            | Points |
|--------|-------------------------------------------------------------------------------------------------|--------|
| Front  | Pair of 6s, 7s, 8s, 9s, 10s, Js, Qs, Ks, As                                                     | 1, 2, 3, 4, 5, 6, 7, 8, 9 |
| Front  | Three of a kind, 222 up to AAA                                                                  | 10 up to 22 |
| Middle | Trips / Straight / Flush / Full house / Quads / Straight flush / Royal flush                    | 2 / 4 / 8 / 12 / 20 / 30 / 50 |
| Back   | Straight / Flush / Full house / Quads / Straight flush / Royal flush                            | 2 / 4 / 6 / 10 / 15 / 25 |

The three-card front row can only make high card, pair or trips. The wheel (A-2-3-4-5) is the lowest straight. Suits never break ties.

### Fantasyland

* **Entry:** a non-fouling board with **QQ or better** in the front row.
* **Cards dealt:** configurable.
  * *14 cards* (flat), or
  * *Progressive*: QQ = 14, KK = 15, AA = 16, trips = 17.
* A Fantasyland player gets all their cards at once, places 13 and discards the rest. Their board stays face-down to the opponent until the hand is over.
* **Staying in:** play a non-fouling board with **front trips, a middle full house or better, or back quads or better**. In progressive mode a stay re-deals by the front hand again (14 if you stay through the middle or back row).
* Both players can be in Fantasyland in the same hand.

### Conventions where the rules are ambiguous

These follow the most common online-OFC behaviour:

* A front row that ties the top cards of the middle row is **not** a foul (e.g. A-K-Q front under A-K-Q-J-9 in the middle).
* A foul is a flat 6 points plus the opponent's royalties; the fouler's rows are not scored individually.
* Fantasyland royalties are paid like any other hand.
* The seed behind every deal is shown in the header and a hand can be replayed from it.

## The CPU opponent

Pick a level in the settings (before a hand, or between hands). Each level has its own name and personality, and can explain some of its moves ("Why" toggle above the CPU's board).

| Level  | Name          | How it plays                                                                                  |
|--------|---------------|-----------------------------------------------------------------------------------------------|
| Easy   | Lucky Lou     | One-step heuristic with random jitter. Makes mistakes (fouls ~35-40% of hands).               |
| Medium | Madame Vega   | Monte Carlo over its 3 best placements, 12 simulated futures each. Fouls ~10-15%.             |
| Hard   | The Professor | Monte Carlo over up to 11 placements (including Fantasyland-seeking ones), 240 futures each.  |

**How the Monte Carlo search works** (`src/ai/montecarlo.ts`)

* It shortlists placements with the heuristic, then simulates random futures for each one. Only cards the CPU can't see are drawn: its own board, hand and discards, and everything visible on your board, are dead cards. Your hidden Pineapple discards are not known to it.
* Both players are completed with the heuristic as a stand-in playout policy, then scored exactly with the real rules. The value of a placement is the average of points, royalties, foul penalties and Fantasyland equity.
* Every placement faces the same simulated futures (common random numbers), and clearly losing placements are dropped halfway, so few simulations still rank placements reliably.
* Fantasyland hands (14-17 cards) are solved exactly by a dedicated royalty-maximising search.
* The thinking runs in a Web Worker (`src/ai/worker.ts`), started the moment the CPU's turn begins, with a short minimum delay so pacing feels natural. If workers are unavailable the same code runs on the main thread.

**Measured strength** (points per hand, with standard error; seats swapped; `scripts/bench-ai.ts`):

| Match                    | Classic        | Pineapple      |
|--------------------------|----------------|----------------|
| Medium vs Easy           | +2.7 (0.35)    | +2.5 (0.73)    |
| Hard vs Medium           | +1.0 (0.42)    | not measured   |
| Hard vs Easy             | +3.4 (0.60)    | +7.3 (0.93)    |

Fouls per hand: Easy ~35-40%, Medium ~10-15%, Hard ~2-7%. Fantasyland shows up mainly in Pineapple (Hard reaches it in ~8% of hands). In Classic, the gap between Medium and Hard is modest because the playout policy, not the number of simulations, limits strength there.

To reproduce:

```bash
npx vite-node scripts/bench-ai.ts hard medium 12 10 classic   # A B sessions handsPerSession variant
PARAMS_A='{"sims":60}' npx vite-node scripts/bench-ai.ts medium easy 20 10   # override sim settings
```

## Roadmap

1. ✅ **Foundation and correctness:** pure engine, real OFC rules, Pineapple, Fantasyland, tests, clean tooling.
2. ✅ **Monte Carlo CPU:** three levels, Web Worker, names and personalities, optional move explanations.
3. Game feel: animation, sound, drag and touch input, helpers, responsive polish.
4. Settings, saved games and stats, hand replay, tutorial, achievements, PWA.
5. Lighthouse pass, deployment polish, screenshots.
