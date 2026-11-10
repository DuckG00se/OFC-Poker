import {
  HandCategory,
  ROW_SIZE,
  evaluateRow,
  legalTurnOptions,
  nextFantasyland,
  FOUL_PENALTY,
  scoreHand,
  scoreSeat,
  type Board,
  type Card,
  type DealStep,
  type PlayerView,
  type RowName,
  type Seat,
} from '../engine';
import { FRONT_MADE_HAND_WEIGHT, scoreBoard } from './heuristic';
import type { TurnPlan } from './types';

export interface MonteCarloParams {
  /** How many of the heuristic's best placements get simulated. */
  shortlist: number;
  /** Extra placements picked by a Fantasyland-friendly view of the board (0 = none). */
  fantasylandExtra: number;
  /** Simulated futures per placement (before elimination). */
  sims: number;
  /** Points a Fantasyland hand is worth to this player. */
  fantasylandValue: number;
  /** Stop early (but never before a handful of sims) if this much time has passed. */
  budgetMs?: number;
}

export interface MonteCarloResult extends TurnPlan {
  /** Expected points (including Fantasyland equity) of the chosen placement. */
  expectedValue: number;
  simulations: number;
}

const MIN_SIMS = 12;
const FANTASYLAND_SCALE: Readonly<Record<number, number>> = { 14: 1, 15: 1.15, 16: 1.3, 17: 1.6 };

type Rows = Record<RowName, readonly Card[]>;

const withCard = (board: Rows, row: RowName, card: Card): Rows => ({
  ...board,
  [row]: [...board[row], card],
});

/** Rows in the order ties are settled: a card that fits equally well anywhere goes to the back. */
const BACK_FIRST: readonly RowName[] = ['back', 'mid', 'front'];

/** Places one card on the row where the heuristic likes the resulting board best. */
const placeGreedy = (board: Rows, card: Card, frontWeight: number): Rows => {
  let best: Rows | null = null;
  let bestScore = -Infinity;
  for (const row of BACK_FIRST) {
    if (board[row].length >= ROW_SIZE[row]) continue;
    const next = withCard(board, row, card);
    const score = scoreBoard(next, frontWeight);
    if (score > bestScore) {
      bestScore = score;
      best = next;
    }
  }
  return best ?? board;
};

const byRankDesc = (a: Card, b: Card): number => b.rank - a.rank;

/**
 * The simulation's stand-in for "play out the rest of the hand": for each deal, place cards
 * one at a time on the row the heuristic likes best (highest cards first). In Pineapple, try
 * discarding each card in turn and keep whichever leaves the best board.
 */
export const completeBoard = (
  start: Board,
  steps: readonly DealStep[],
  draws: readonly Card[],
  frontWeight: number,
): Board => {
  let board: Rows = start;
  let pos = 0;
  for (const step of steps) {
    if (step.place >= 13) break; // Fantasyland hands are solved separately, not simulated
    const dealt = draws.slice(pos, pos + step.deal);
    pos += step.deal;
    if (step.deal === step.place) {
      for (const card of [...dealt].sort(byRankDesc)) board = placeGreedy(board, card, frontWeight);
    } else {
      let best: Rows = board;
      let bestScore = -Infinity;
      for (let drop = 0; drop < dealt.length; drop++) {
        let candidate: Rows = board;
        for (const card of dealt.filter((_, i) => i !== drop).sort(byRankDesc)) {
          candidate = placeGreedy(candidate, card, frontWeight);
        }
        const score = scoreBoard(candidate, frontWeight);
        if (score > bestScore) {
          bestScore = score;
          best = candidate;
        }
      }
      board = best;
    }
  }
  return board;
};

const fantasylandBonus = (board: Board, view: PlayerView, value: number): number => {
  const cards = nextFantasyland(board, false, view.config.fantasyland);
  return cards > 0 ? value * (FANTASYLAND_SCALE[cards] ?? 1) : 0;
};

/** Points the seat expects from a finished pair of boards, plus Fantasyland equity. */
const outcome = (
  mine: Board,
  opp: Board | null,
  seat: Seat,
  view: PlayerView,
  flValue: number,
): number => {
  const bonus = fantasylandBonus(mine, view, flValue);
  if (opp === null) {
    // Opponent's board is hidden (they are in Fantasyland): judge ours on its own merits.
    const own = scoreSeat(mine);
    return own.fouled ? -FOUL_PENALTY + bonus : own.royaltyTotal + bonus;
  }
  const boards = seat === 'human' ? { human: mine, ai: opp } : { human: opp, ai: mine };
  return scoreHand(boards).points[seat] + bonus;
};

interface Candidate {
  placements: TurnPlan['placements'];
  discards: string[];
  board: Board;
  /** Continuation policy: chase made front hands only once one is already on the board. */
  frontWeight: number;
  total: number;
  count: number;
}

/**
 * True if the front row is already QQ+/trips, or is still open with a queen-or-better in it.
 * Such placements are simulated with a Fantasyland-seeking continuation (queens go up front);
 * with the cautious continuation the simulations would almost never realise the bonus, and
 * the chase would always look worse than it is.
 */
const chasesFantasyland = (board: Board): boolean => {
  const front = evaluateRow(board.front, 'front');
  const rank = front.tiebreak[0] ?? 0;
  if (front.category === HandCategory.Trips) return true;
  if (front.category === HandCategory.Pair) return rank >= 12;
  return board.front.length < 3 && board.front.some((c) => c.rank >= 12);
};

const sum = (steps: readonly DealStep[]): number => steps.reduce((n, s) => n + s.deal, 0);

/**
 * Chooses a turn by simulation. For each shortlisted placement it plays many random futures
 * using only cards this seat cannot see (its own board, hand and discards, and everything
 * visible on the opponent's board, are dead). Both players are completed with the heuristic
 * policy, and the placement with the best average result (points, royalties, foul risk and
 * Fantasyland equity) wins. Every placement faces the same futures, which keeps the
 * comparison fair with few simulations.
 */
export const monteCarloTurn = (
  view: PlayerView,
  rng: () => number,
  params: MonteCarloParams,
): MonteCarloResult => {
  const turn = view.turn;
  if (!turn) return { placements: [], discards: [], expectedValue: 0, simulations: 0 };

  const options = legalTurnOptions(view.myBoard, view.held, turn.need);
  const boards = options.map((option): Board => {
    const board: Record<RowName, Card[]> = {
      front: [...view.myBoard.front],
      mid: [...view.myBoard.mid],
      back: [...view.myBoard.back],
    };
    for (const p of option.placements) {
      const card = view.held.find((c) => c.id === p.cardId);
      if (card) board[p.row].push(card);
    }
    return board;
  });

  // --- Shortlist by the heuristic (and by a Fantasyland-friendly view of it). ---
  const ranked = boards
    .map((board, index) => ({
      index,
      safe: scoreBoard(board),
      greedy: scoreBoard(board, 1),
    }))
    .sort((a, b) => b.safe - a.safe);
  const picked = new Set(ranked.slice(0, params.shortlist).map((r) => r.index));
  if (params.fantasylandExtra > 0) {
    ranked
      .filter((r) => !picked.has(r.index))
      .sort((a, b) => b.greedy - a.greedy)
      .slice(0, params.fantasylandExtra)
      .forEach((r) => picked.add(r.index));
  }

  let candidates: Candidate[] = [...picked].map((index) => {
    const board = boards[index] as Board;
    const option = options[index];
    return {
      placements: option?.placements ?? [],
      discards: option?.discards ?? [],
      board,
      frontWeight: chasesFantasyland(board) ? 1 : FRONT_MADE_HAND_WEIGHT,
      total: 0,
      count: 0,
    };
  });

  const first = candidates[0];
  if (candidates.length <= 1 && first) {
    return { placements: first.placements, discards: first.discards, expectedValue: 0, simulations: 0 };
  }

  // --- Simulate. ---
  const seat = view.seat;
  const oppHidden = view.oppBoardHidden || view.oppFantasyland > 0;
  const oppSteps = oppHidden ? [] : view.oppRemaining;
  const oppDraws = sum(oppSteps);
  const myDraws = sum(view.myRemaining);
  const pool = [...view.unseen];
  const maxDraws = Math.min(oppDraws + myDraws, pool.length);
  const exact = oppDraws === 0 && myDraws === 0;
  const totalSims = exact ? 1 : params.sims;
  const started = typeof performance !== 'undefined' ? performance.now() : 0;
  const checkpoints = new Set([Math.floor(totalSims * 0.25), Math.floor(totalSims * 0.5)]);

  let done = 0;
  for (let sim = 0; sim < totalSims; sim++) {
    // Partial Fisher-Yates: the first `maxDraws` entries become a random sample.
    for (let i = 0; i < maxDraws; i++) {
      const j = i + Math.floor(rng() * (pool.length - i));
      const t = pool[i] as Card;
      pool[i] = pool[j] as Card;
      pool[j] = t;
    }
    const oppFinal: Board | null = oppHidden
      ? null
      : completeBoard(view.oppBoard, oppSteps, pool.slice(0, oppDraws), FRONT_MADE_HAND_WEIGHT);
    const mine = pool.slice(oppDraws, oppDraws + myDraws);

    for (const c of candidates) {
      const final = completeBoard(c.board, view.myRemaining, mine, c.frontWeight);
      c.total += outcome(final, oppFinal, seat, view, params.fantasylandValue);
      c.count++;
    }
    done++;

    // Successive elimination: stop spending sims on placements that are clearly behind.
    if (checkpoints.has(sim + 1) && candidates.length > 2) {
      candidates.sort((a, b) => b.total / b.count - a.total / a.count);
      candidates = candidates.slice(0, Math.max(2, Math.ceil(candidates.length / 2)));
    }
    if (
      params.budgetMs !== undefined &&
      done >= MIN_SIMS &&
      typeof performance !== 'undefined' &&
      performance.now() - started > params.budgetMs
    ) {
      break;
    }
  }

  candidates.sort((a, b) => b.total / b.count - a.total / a.count);
  const best = candidates[0] as Candidate;
  return {
    placements: best.placements,
    discards: best.discards,
    expectedValue: best.total / best.count,
    simulations: done,
  };
};

