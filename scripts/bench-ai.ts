/**
 * Head-to-head AI benchmark.
 *   npx vite-node scripts/bench-ai.ts <A> <B> [sessions] [handsPerSession] [variant]
 * A and B are easy | medium | hard. Seats are swapped every other session, and each session
 * carries Fantasyland between hands, so Fantasyland play is rewarded realistically.
 * Prints A's average points per hand against B with a standard error.
 */
import { chooseTurn, planToActions, type MonteCarloParams } from '../src/ai';
import {
  DEFAULT_CONFIG,
  createSession,
  gameReducer,
  initialGameState,
  settleHand,
  setupForSession,
  viewFor,
  type Difficulty,
  type GameState,
  type Seat,
  type Variant,
} from '../src/engine';

const [a = 'hard', b = 'easy', sessionsArg = '10', handsArg = '10', variantArg = 'classic'] =
  process.argv.slice(2);
// Optional simulation overrides, e.g. PARAMS_A='{"sims":12,"shortlist":3}'
const paramsFor = (key: 'A' | 'B'): Partial<MonteCarloParams> | undefined => {
  const raw = process.env[`PARAMS_${key}`];
  return raw ? (JSON.parse(raw) as Partial<MonteCarloParams>) : undefined;
};
const params = { A: paramsFor('A'), B: paramsFor('B') };
const sessions = Number(sessionsArg);
const hands = Number(handsArg);
const variant = variantArg as Variant;

interface Tally {
  points: number[];
  fouls: number;
  fl: number;
  hands: number;
  ms: number;
  moves: number;
}
const tally = (): Tally => ({ points: [], fouls: 0, fl: 0, hands: 0, ms: 0, moves: 0 });
const stats: Record<'A' | 'B', Tally> = { A: tally(), B: tally() };

const playHand = (
  game: GameState,
  levels: Record<Seat, Difficulty>,
  who: Record<Seat, 'A' | 'B'>,
): GameState => {
  let state = game;
  for (let guard = 0; state.phase === 'placing' && guard < 100; guard++) {
    const turn = state.turn;
    if (!turn) break;
    const t0 = performance.now();
    const plan = chooseTurn(viewFor(state, turn.seat), {
      difficulty: levels[turn.seat],
      seed: `${state.setup?.seed}#${turn.seat}#${turn.street}`,
      params: params[who[turn.seat]],
    });
    const entry = stats[who[turn.seat]];
    entry.ms += performance.now() - t0;
    entry.moves++;
    for (const action of planToActions(turn.seat, plan)) state = gameReducer(state, action);
  }
  return state;
};

for (let s = 0; s < sessions; s++) {
  const aSeat: Seat = s % 2 === 0 ? 'human' : 'ai';
  const levels = { human: aSeat === 'human' ? a : b, ai: aSeat === 'human' ? b : a } as Record<
    Seat,
    Difficulty
  >;
  const who = { human: aSeat === 'human' ? 'A' : 'B', ai: aSeat === 'human' ? 'B' : 'A' } as Record<
    Seat,
    'A' | 'B'
  >;
  let session = createSession({ ...DEFAULT_CONFIG, variant, stake: 1 }, `bench-${a}-${b}-${s}`);
  for (let h = 0; h < hands; h++) {
    const game = playHand(
      gameReducer(initialGameState(), { type: 'START_HAND', setup: setupForSession(session) }),
      levels,
      who,
    );
    const result = game.result;
    if (!result) throw new Error('hand did not finish');
    for (const seat of ['human', 'ai'] as const) {
      const t = stats[who[seat]];
      t.points.push(result.points[seat]);
      t.hands++;
      if (result.seats[seat].fouled) t.fouls++;
      if (game.fantasylandNext[seat] > 0) t.fl++;
    }
    session = settleHand(session, game);
  }
}

const mean = (xs: number[]): number => xs.reduce((x, y) => x + y, 0) / Math.max(1, xs.length);
const se = (xs: number[]): number => {
  const m = mean(xs);
  const v = xs.reduce((x, y) => x + (y - m) ** 2, 0) / Math.max(1, xs.length - 1);
  return Math.sqrt(v / Math.max(1, xs.length));
};
const pct = (n: number, d: number): string => `${((n / Math.max(1, d)) * 100).toFixed(1)}%`;

for (const key of ['A', 'B'] as const) {
  const t = stats[key];
  const name = key === 'A' ? a : b;
  console.log(
    `${key} (${name}): ${mean(t.points).toFixed(2)} ± ${se(t.points).toFixed(2)} pts/hand | foul ${pct(t.fouls, t.hands)} | Fantasyland ${pct(t.fl, t.hands)} | ${(t.ms / Math.max(1, t.moves)).toFixed(0)} ms/move | ${t.hands} hands`,
  );
}
