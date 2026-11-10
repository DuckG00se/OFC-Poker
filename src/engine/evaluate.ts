import { rankLabel } from './deck';
import { HandCategory, type Card, type RowEval, type RowName } from './types';

const PLURAL: Readonly<Record<number, string>> = {
  2: 'Twos', 3: 'Threes', 4: 'Fours', 5: 'Fives', 6: 'Sixes', 7: 'Sevens', 8: 'Eights',
  9: 'Nines', 10: 'Tens', 11: 'Jacks', 12: 'Queens', 13: 'Kings', 14: 'Aces',
};
const SINGULAR: Readonly<Record<number, string>> = {
  2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight',
  9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace',
};

export const HAND_NAMES: Readonly<Record<HandCategory, string>> = {
  [HandCategory.HighCard]: 'High Card',
  [HandCategory.Pair]: 'Pair',
  [HandCategory.TwoPair]: 'Two Pair',
  [HandCategory.Trips]: 'Three of a Kind',
  [HandCategory.Straight]: 'Straight',
  [HandCategory.Flush]: 'Flush',
  [HandCategory.FullHouse]: 'Full House',
  [HandCategory.Quads]: 'Four of a Kind',
  [HandCategory.StraightFlush]: 'Straight Flush',
};

interface Group {
  rank: number;
  count: number;
}

/** Highest card of a 5-card straight in the given distinct, descending ranks; 0 if none. The wheel counts as 5-high. */
const straightHigh = (distinctDesc: readonly number[]): number => {
  if (distinctDesc.length !== 5) return 0;
  const first = distinctDesc[0] as number;
  const last = distinctDesc[4] as number;
  if (first - last === 4) return first;
  if (first === 14 && distinctDesc[1] === 5 && last === 2) return 5; // A-5-4-3-2
  return 0;
};

/**
 * Evaluates the cards currently on a row. Works for partial rows too, so it can power live
 * helpers. The front row only ever scores pairs and trips (three cards cannot make a straight
 * or flush); straights and flushes need exactly five cards on the middle or back row.
 */
export const evaluateRow = (cards: readonly Card[], row: RowName): RowEval => {
  if (cards.length === 0) {
    return { category: HandCategory.HighCard, tiebreak: [], name: 'Empty', isRoyalFlush: false };
  }

  const ranksDesc = cards.map((c) => c.rank as number).sort((a, b) => b - a);
  const counts = new Map<number, number>();
  for (const r of ranksDesc) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups: Group[] = [...counts.entries()]
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);
  const distinctDesc = groups.map((g) => g.rank).sort((a, b) => b - a);

  const g0 = groups[0] as Group;
  const g1 = groups[1];
  const kickersOf = (...used: number[]): number[] => ranksDesc.filter((r) => !used.includes(r));

  if (row !== 'front' && cards.length === 5) {
    const isFlush = cards.every((c) => c.suit === (cards[0] as Card).suit);
    const high = straightHigh(distinctDesc);
    if (isFlush && high > 0) {
      const royal = high === 14;
      return {
        category: HandCategory.StraightFlush,
        tiebreak: [high],
        name: royal ? 'Royal Flush' : 'Straight Flush',
        isRoyalFlush: royal,
      };
    }
    if (g0.count === 4) {
      return {
        category: HandCategory.Quads,
        tiebreak: [g0.rank, ...kickersOf(g0.rank)],
        name: `Four ${PLURAL[g0.rank]}`,
        isRoyalFlush: false,
      };
    }
    if (g0.count === 3 && g1?.count === 2) {
      return {
        category: HandCategory.FullHouse,
        tiebreak: [g0.rank, g1.rank],
        name: `Full House, ${PLURAL[g0.rank]} full`,
        isRoyalFlush: false,
      };
    }
    if (isFlush) {
      return {
        category: HandCategory.Flush,
        tiebreak: ranksDesc,
        name: `Flush, ${SINGULAR[ranksDesc[0] as number]} high`,
        isRoyalFlush: false,
      };
    }
    if (high > 0) {
      return {
        category: HandCategory.Straight,
        tiebreak: [high],
        name: `Straight, ${SINGULAR[high]} high`,
        isRoyalFlush: false,
      };
    }
  }

  if (g0.count === 4) {
    return {
      category: HandCategory.Quads,
      tiebreak: [g0.rank, ...kickersOf(g0.rank)],
      name: `Four ${PLURAL[g0.rank]}`,
      isRoyalFlush: false,
    };
  }
  if (g0.count === 3) {
    return {
      category: HandCategory.Trips,
      tiebreak: [g0.rank, ...kickersOf(g0.rank)],
      name: `Three ${PLURAL[g0.rank]}`,
      isRoyalFlush: false,
    };
  }
  if (g0.count === 2 && g1?.count === 2) {
    return {
      category: HandCategory.TwoPair,
      tiebreak: [g0.rank, g1.rank, ...kickersOf(g0.rank, g1.rank)],
      name: `Two Pair, ${PLURAL[g0.rank]} and ${PLURAL[g1.rank]}`,
      isRoyalFlush: false,
    };
  }
  if (g0.count === 2) {
    return {
      category: HandCategory.Pair,
      tiebreak: [g0.rank, ...kickersOf(g0.rank)],
      name: `Pair of ${PLURAL[g0.rank]}`,
      isRoyalFlush: false,
    };
  }
  return {
    category: HandCategory.HighCard,
    tiebreak: ranksDesc,
    name: `${rankLabel(ranksDesc[0] as number)} High`,
    isRoyalFlush: false,
  };
};

/**
 * Compares two row evaluations: > 0 if a is stronger, < 0 if b is, 0 if equal.
 * Tiebreaks are compared only over the cards both rows have, so a three-card front row that
 * is matched by the top cards of the middle row counts as a tie (which is legal, not a foul).
 */
export const compareRows = (a: RowEval, b: RowEval): number => {
  if (a.category !== b.category) return a.category - b.category;
  const n = Math.min(a.tiebreak.length, b.tiebreak.length);
  for (let i = 0; i < n; i++) {
    const diff = (a.tiebreak[i] as number) - (b.tiebreak[i] as number);
    if (diff !== 0) return diff;
  }
  return 0;
};
