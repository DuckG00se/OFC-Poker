import { HandCategory, type FantasylandMode, type RowEval, type RowName } from './types';
import { evaluateRow } from './evaluate';
import { checkFoul, isBoardComplete } from './foul';
import type { Board } from './types';

/** Middle row: trips 2, straight 4, flush 8, full house 12, quads 20, straight flush 30, royal 50. */
const MID_TABLE: Readonly<Partial<Record<HandCategory, number>>> = {
  [HandCategory.Trips]: 2,
  [HandCategory.Straight]: 4,
  [HandCategory.Flush]: 8,
  [HandCategory.FullHouse]: 12,
  [HandCategory.Quads]: 20,
  [HandCategory.StraightFlush]: 30,
};

/** Back row: straight 2, flush 4, full house 6, quads 10, straight flush 15, royal 25. */
const BACK_TABLE: Readonly<Partial<Record<HandCategory, number>>> = {
  [HandCategory.Straight]: 2,
  [HandCategory.Flush]: 4,
  [HandCategory.FullHouse]: 6,
  [HandCategory.Quads]: 10,
  [HandCategory.StraightFlush]: 15,
};

/** Royalty points a row is worth in the standard American table (before any foul check). */
export const rowRoyalty = (ev: RowEval, row: RowName): number => {
  if (row === 'front') {
    const rank = ev.tiebreak[0] ?? 0;
    if (ev.category === HandCategory.Trips) return 10 + (rank - 2); // 222 = 10 ... AAA = 22
    if (ev.category === HandCategory.Pair && rank >= 6) return rank - 5; // 66 = 1 ... AA = 9
    return 0;
  }
  if (ev.isRoyalFlush) return row === 'mid' ? 50 : 25;
  const table = row === 'mid' ? MID_TABLE : BACK_TABLE;
  return table[ev.category] ?? 0;
};

/** Cards dealt for Fantasyland entry given the front row, or 0 if the front does not qualify. */
export const fantasylandEntryCards = (front: RowEval, mode: FantasylandMode): number => {
  if (mode === 'off') return 0;
  const rank = front.tiebreak[0] ?? 0;
  const qualifies =
    front.category === HandCategory.Trips || (front.category === HandCategory.Pair && rank >= 12);
  if (!qualifies) return 0;
  if (mode === 'flat') return 14;
  if (front.category === HandCategory.Trips) return 17;
  return 14 + (rank - 12); // QQ 14, KK 15, AA 16
};

/** True if a (non-fouled) board keeps a player in Fantasyland: front trips, mid full house+, or back quads+. */
export const staysInFantasyland = (board: Board): boolean => {
  if (!isBoardComplete(board) || checkFoul(board)) return false;
  const front = evaluateRow(board.front, 'front');
  const mid = evaluateRow(board.mid, 'mid');
  const back = evaluateRow(board.back, 'back');
  return (
    front.category === HandCategory.Trips ||
    mid.category >= HandCategory.FullHouse ||
    back.category >= HandCategory.Quads
  );
};

/**
 * Fantasyland card count for the next hand, or 0 for none.
 * - Not currently in Fantasyland: enter with QQ+ in front.
 * - Currently in Fantasyland: stay with {@link staysInFantasyland}; in progressive mode the
 *   count follows the front hand again, falling back to 14 when staying through mid/back.
 */
export const nextFantasyland = (
  board: Board,
  currentlyIn: boolean,
  mode: FantasylandMode,
): number => {
  if (mode === 'off' || !isBoardComplete(board) || checkFoul(board)) return 0;
  const frontCount = fantasylandEntryCards(evaluateRow(board.front, 'front'), mode);
  if (!currentlyIn) return frontCount;
  return staysInFantasyland(board) ? Math.max(frontCount, 14) : 0;
};
