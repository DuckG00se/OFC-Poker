import {
  HandCategory,
  ROW_SIZE,
  compareRows,
  evaluateRow,
  isBoardComplete,
  legalTurnOptions,
  rowRoyalty,
  type Board,
  type Card,
  type PlayerView,
  type RowEval,
  type RowName,
} from '../engine';
import { solveFantasyland } from './fantasyland';
import type { TurnPlan } from './types';

const CATEGORY_VALUE: Readonly<Record<HandCategory, number>> = {
  [HandCategory.HighCard]: 0,
  [HandCategory.Pair]: 1.6,
  [HandCategory.TwoPair]: 3.2,
  [HandCategory.Trips]: 4.5,
  [HandCategory.Straight]: 5,
  [HandCategory.Flush]: 6,
  [HandCategory.FullHouse]: 7,
  [HandCategory.Quads]: 9,
  [HandCategory.StraightFlush]: 12,
};

const FOUL_SCORE = -100;

/** Longest run of ranks that still fits inside one 5-card straight window (wheel included). */
const straightWindowCount = (cards: readonly Card[]): number => {
  const ranks = new Set(cards.map((c) => c.rank as number));
  if (ranks.has(14)) ranks.add(1);
  let best = 0;
  for (let low = 1; low <= 10; low++) {
    let count = 0;
    for (let r = low; r < low + 5; r++) if (ranks.has(r)) count++;
    best = Math.max(best, count);
  }
  return best;
};

/** Rough value of a row: what it already is plus what it is likely to become. */
const rowPotential = (
  cards: readonly Card[],
  row: RowName,
  ev: RowEval,
  frontWeight: number,
): number => {
  if (cards.length === 0) return 0;
  const empty = ROW_SIZE[row] - cards.length;
  const top = (ev.tiebreak[0] ?? 0) / 14;

  if (row === 'front') {
    let value = top * 0.6;
    if (ev.category === HandCategory.Pair) {
      const rank = ev.tiebreak[0] ?? 0;
      value += frontWeight * (1.6 + rowRoyalty(ev, 'front') + (rank >= 12 ? 3 : 0)); // QQ+ also chases Fantasyland
    } else if (ev.category === HandCategory.Trips) {
      value += frontWeight * (4 + rowRoyalty(ev, 'front'));
    }
    return value;
  }

  let value = CATEGORY_VALUE[ev.category] + rowRoyalty(ev, row) * 1.1 + top * 0.6;
  if (empty > 0 && cards.length < 5) {
    const suits = new Map<string, number>();
    for (const c of cards) suits.set(c.suit, (suits.get(c.suit) ?? 0) + 1);
    const maxSuit = Math.max(...suits.values());
    if (maxSuit === cards.length && cards.length >= 3 && 5 - maxSuit <= empty) {
      value += cards.length === 4 ? 2.4 : 0.7; // flush draw
    }
    const window = straightWindowCount(cards);
    if (window >= 3 && window === new Set(cards.map((c) => c.rank)).size) {
      value += window === 4 ? 1.2 : 0.3; // straight draw
    }
    if (ev.category === HandCategory.Pair || ev.category === HandCategory.TwoPair) {
      value += 0.35 * empty; // room to improve into trips / full house
    }
  }
  return value;
};

const strength = (ev: RowEval): number => ev.category + (ev.tiebreak[0] ?? 0) / 15;

/**
 * Front-row pairs pay well, but chasing them is the main way a one-step heuristic fouls:
 * the pair goes up early and the rows behind it never catch up. Measured over 150 simulated
 * hands, weighting them at 1.0 fouls ~50% of the time, 0.25 about 19% (random play: 70%).
 */
export const FRONT_MADE_HAND_WEIGHT = 0.25;

/** Penalises boards whose rows already point towards a foul (front > mid or mid > back). */
const orderingPenalty = (
  board: Board,
  front: RowEval,
  mid: RowEval,
  back: RowEval,
): number => {
  let penalty = 0;
  if (board.front.length > 0 && board.mid.length > 0 && compareRows(front, mid) > 0) {
    penalty += 2.5 + 3 * Math.max(0, strength(front) - strength(mid)) + (board.mid.length >= 4 ? 3 : 0);
  }
  if (board.mid.length > 0 && board.back.length > 0 && compareRows(mid, back) > 0) {
    penalty += 2.5 + 3 * Math.max(0, strength(mid) - strength(back)) + (board.back.length >= 4 ? 3 : 0);
  }
  return penalty;
};

/**
 * Heuristic value of a (partial or complete) board. Complete boards that foul score hugely
 * negative. `frontWeight` scales how much made front-row hands are worth: the default is
 * cautious; pass 1 to see the board the way a Fantasyland chaser would.
 */
export const scoreBoard = (board: Board, frontWeight: number = FRONT_MADE_HAND_WEIGHT): number => {
  const front = evaluateRow(board.front, 'front');
  const mid = evaluateRow(board.mid, 'mid');
  const back = evaluateRow(board.back, 'back');
  if (isBoardComplete(board) && (compareRows(back, mid) < 0 || compareRows(mid, front) < 0)) {
    return FOUL_SCORE;
  }
  return (
    rowPotential(board.front, 'front', front, frontWeight) +
    rowPotential(board.mid, 'mid', mid, frontWeight) +
    rowPotential(board.back, 'back', back, frontWeight) -
    orderingPenalty(board, front, mid, back)
  );
};

/**
 * The "Easy" opponent: for every legal way to place (and, in Pineapple, discard) this turn's
 * cards, score the resulting board and take the best. `noise` adds random jitter so that
 * lower difficulties play less consistently. Unlike the old AI it never walks into a foul it
 * can see coming.
 */
export const heuristicTurn = (view: PlayerView, rng: () => number, noise = 0): TurnPlan => {
  const turn = view.turn;
  if (!turn) return { placements: [], discards: [] };
  if (turn.need.place >= 13) return solveFantasyland(view.held);

  const options = legalTurnOptions(view.myBoard, view.held, turn.need);
  let best = options[0];
  let bestScore = -Infinity;
  for (const option of options) {
    const board: Record<RowName, Card[]> = {
      front: [...view.myBoard.front],
      mid: [...view.myBoard.mid],
      back: [...view.myBoard.back],
    };
    for (const p of option.placements) {
      const card = view.held.find((c) => c.id === p.cardId);
      if (card) board[p.row].push(card);
    }
    const score = scoreBoard(board) + (noise > 0 ? (rng() - 0.5) * 2 * noise : 0);
    if (score > bestScore) {
      bestScore = score;
      best = option;
    }
  }
  return best ?? { placements: [], discards: [] };
};
