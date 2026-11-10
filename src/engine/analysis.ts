import { compareRows, evaluateRow } from './evaluate';
import { checkFoul, isBoardComplete } from './foul';
import { rowRoyalty } from './royalties';
import {
  HandCategory,
  ROW_SIZE,
  type Board,
  type Card,
  type FantasylandMode,
  type RowEval,
  type RowName,
  type Suit,
} from './types';

/** A way a row can improve, and how many live cards get it there. */
export interface RowOuts {
  /** Short name of what the row becomes, e.g. "Flush" or "Fantasyland". */
  label: string;
  /** Number of unseen cards that complete it (for `needs: 2`, live cards of the suit). */
  outs: number;
  /** Cards still required: 1 = one card away, 2 = a two-card draw. */
  needs: 1 | 2;
}

const SHORT_NAME: Readonly<Record<HandCategory, string>> = {
  [HandCategory.HighCard]: 'High card',
  [HandCategory.Pair]: 'Pair',
  [HandCategory.TwoPair]: 'Two pair',
  [HandCategory.Trips]: 'Trips',
  [HandCategory.Straight]: 'Straight',
  [HandCategory.Flush]: 'Flush',
  [HandCategory.FullHouse]: 'Full house',
  [HandCategory.Quads]: 'Quads',
  [HandCategory.StraightFlush]: 'Straight flush',
};

const qualifiesForFantasyland = (ev: RowEval): boolean =>
  ev.category === HandCategory.Trips ||
  (ev.category === HandCategory.Pair && (ev.tiebreak[0] ?? 0) >= 12);

/**
 * Live outs for a row, counted against the cards the player cannot see.
 * - One slot left: the exact number of cards that lift the row to each better hand type.
 * - Two slots left on a 5-card row with three suited cards: a flush draw (live suit cards).
 * At most the two most valuable improvements are returned.
 */
export const rowOuts = (
  board: Board,
  row: RowName,
  unseen: readonly Card[],
  fantasyland: FantasylandMode = 'off',
): RowOuts[] => {
  const cards = board[row];
  const empty = ROW_SIZE[row] - cards.length;
  if (cards.length === 0 || empty === 0) return [];

  if (empty === 1) {
    const current = evaluateRow(cards, row);
    const buckets = new Map<string, { outs: number; rank: number }>();
    for (const card of unseen) {
      const ev = evaluateRow([...cards, card], row);
      if (ev.category <= current.category) continue;
      let label = SHORT_NAME[ev.category];
      let rank: number = ev.category;
      if (row === 'front' && fantasyland !== 'off' && qualifiesForFantasyland(ev) && !qualifiesForFantasyland(current)) {
        label = 'Fantasyland';
        rank = 100;
      }
      const bucket = buckets.get(label) ?? { outs: 0, rank };
      bucket.outs++;
      buckets.set(label, bucket);
    }
    return [...buckets.entries()]
      .sort((a, b) => b[1].rank - a[1].rank)
      .slice(0, 2)
      .map(([label, b]) => ({ label, outs: b.outs, needs: 1 as const }));
  }

  if (empty === 2 && row !== 'front') {
    const suit = (cards[0] as Card).suit;
    if (cards.every((c) => c.suit === suit)) {
      const live = unseen.filter((c) => c.suit === suit).length;
      if (live >= 2) return [{ label: 'Flush draw', outs: live, needs: 2 }];
    }
  }
  return [];
};

/**
 * Royalties the board has already locked in, assuming it does not foul. Front pairs and
 * trips count as soon as they are made; so do middle/back trips and quads (they can only
 * improve). Straights, flushes and full houses count once the row is complete.
 */
export const royaltyPreview = (board: Board): Record<RowName, number> => {
  const preview: Record<RowName, number> = { front: 0, mid: 0, back: 0 };
  for (const row of ['front', 'mid', 'back'] as const) {
    const cards = board[row];
    if (cards.length === 0) continue;
    const ev = evaluateRow(cards, row);
    const complete = cards.length === ROW_SIZE[row];
    const locked =
      row === 'front' ||
      complete ||
      ev.category === HandCategory.Trips ||
      ev.category === HandCategory.Quads;
    if (locked) preview[row] = rowRoyalty(ev, row);
  }
  return preview;
};

/** Strongest hand a row can still reach, drawing its missing cards from `pool`. */
const bestPossible = (cards: readonly Card[], row: RowName, pool: readonly Card[]): RowEval => {
  const empty = ROW_SIZE[row] - cards.length;
  let best = evaluateRow(cards, row);
  const consider = (extra: Card[]): void => {
    const ev = evaluateRow([...cards, ...extra], row);
    if (compareRows(ev, best) > 0) best = ev;
  };
  if (empty === 1) {
    for (const a of pool) consider([a]);
  } else if (empty === 2) {
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) consider([pool[i] as Card, pool[j] as Card]);
    }
  }
  return best;
};

export type FoulStatus =
  /** The board is complete and legal. */
  | 'safe'
  /** The board is complete and fouled. */
  | 'fouled'
  /** Not complete yet, but no remaining card can save it. */
  | 'certain'
  /** Still open: it may or may not foul. */
  | 'open';

/**
 * Checks whether a foul is already unavoidable. `pool` is every card that could still land
 * on the board: the unseen cards plus anything still in hand. Conservative: it only reports
 * "certain" when it can prove it.
 * - A row can only get stronger as cards are added, so a partial front (or middle) that
 *   already beats a *complete* row behind it is a certain foul.
 * - If a row is complete and the row behind it has at most two slots left, every way of
 *   filling those slots is tried.
 */
export const foulStatus = (board: Board, pool: readonly Card[]): FoulStatus => {
  if (isBoardComplete(board)) return checkFoul(board) ? 'fouled' : 'safe';

  const pairs: [RowName, RowName][] = [
    ['front', 'mid'],
    ['mid', 'back'],
  ];
  for (const [upper, lower] of pairs) {
    const upperCards = board[upper];
    const lowerCards = board[lower];
    if (upperCards.length === 0) continue;
    const upperEval = evaluateRow(upperCards, upper);
    const lowerFull = lowerCards.length === ROW_SIZE[lower];
    const upperFull = upperCards.length === ROW_SIZE[upper];
    if (lowerFull) {
      if (compareRows(upperEval, evaluateRow(lowerCards, lower)) > 0) return 'certain';
    } else if (upperFull && ROW_SIZE[lower] - lowerCards.length <= 2) {
      if (compareRows(bestPossible(lowerCards, lower, pool), upperEval) < 0) return 'certain';
    }
  }
  return 'open';
};

/** Cards of a suit, for the dead-card tracker. */
export const SUIT_ORDER: readonly Suit[] = ['s', 'h', 'd', 'c'];
