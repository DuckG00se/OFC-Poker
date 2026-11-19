import { HandCategory, type FantasylandMode, type RowEval, type RowName } from './types';
import { evaluateRow } from './evaluate';
import { checkFoul, isBoardComplete } from './foul';
import {
  BACK_ROYALTIES,
  FANTASYLAND,
  FRONT_PAIR_MIN_RANK,
  MID_ROYALTIES,
  ROYAL_FLUSH_ROYALTY,
  frontPairRoyalty,
  frontTripsRoyalty,
  fantasylandCardsFor,
} from './rules';
import type { Board } from './types';

/** Royalty points a row is worth in the standard American table (before any foul check). */
export const rowRoyalty = (ev: RowEval, row: RowName): number => {
  if (row === 'front') {
    const rank = ev.tiebreak[0] ?? 0;
    if (ev.category === HandCategory.Trips) return frontTripsRoyalty(rank);
    if (ev.category === HandCategory.Pair && rank >= FRONT_PAIR_MIN_RANK) return frontPairRoyalty(rank);
    return 0;
  }
  if (ev.isRoyalFlush) return ROYAL_FLUSH_ROYALTY[row];
  const table = row === 'mid' ? MID_ROYALTIES : BACK_ROYALTIES;
  return table[ev.category] ?? 0;
};

/** Cards dealt for Fantasyland entry given the front row, or 0 if the front does not qualify. */
export const fantasylandEntryCards = (front: RowEval, mode: FantasylandMode): number => {
  const rank = front.tiebreak[0] ?? 0;
  if (front.category === HandCategory.Trips) return fantasylandCardsFor('trips', rank, mode);
  if (front.category === HandCategory.Pair) return fantasylandCardsFor('pair', rank, mode);
  return 0;
};

/** True if a (non-fouled) board keeps a player in Fantasyland: front trips, mid full house+, or back quads+. */
export const staysInFantasyland = (board: Board): boolean => {
  if (!isBoardComplete(board) || checkFoul(board)) return false;
  const front = evaluateRow(board.front, 'front');
  const mid = evaluateRow(board.mid, 'mid');
  const back = evaluateRow(board.back, 'back');
  return (
    front.category === HandCategory.Trips ||
    mid.category >= FANTASYLAND.stay.midAtLeast ||
    back.category >= FANTASYLAND.stay.backAtLeast
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
  return staysInFantasyland(board) ? Math.max(frontCount, FANTASYLAND.baseCards) : 0;
};
