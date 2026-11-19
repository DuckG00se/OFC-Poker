import {
  BACK_ROYALTIES,
  FRONT_PAIR_MIN_RANK,
  HAND_NAMES,
  HandCategory,
  MID_ROYALTIES,
  ROW_SIZE,
  evaluateRow,
  rankLabel,
  rowRoyalty,
  type Card,
  type RowName,
} from '../../engine';

/** The weakest hand that pays anything on a row, in words ("a pair of 6s or better"). */
export const lowestPayingHand = (row: RowName): string => {
  if (row === 'front') return `a pair of ${rankLabel(FRONT_PAIR_MIN_RANK)}s`;
  const table = row === 'mid' ? MID_ROYALTIES : BACK_ROYALTIES;
  const lowest = Math.min(...Object.keys(table).map(Number)) as HandCategory;
  const name = HAND_NAMES[lowest].toLowerCase();
  // "three of a kind" reads fine alone; "straight" needs an article.
  return lowest === HandCategory.Trips ? name : `a ${name}`;
};

/**
 * The text shown when a player taps a row's label: what the row makes, and what it pays.
 * Royalties are only collected on a board that does not foul, which the text says.
 */
export const rowTip = (cards: readonly Card[], row: RowName): string => {
  if (cards.length === 0) return 'Empty so far. Place a card here.';
  const ev = evaluateRow(cards, row);
  const left = ROW_SIZE[row] - cards.length;
  const royalty = rowRoyalty(ev, row);
  const pays =
    royalty > 0
      ? `Royalty: +${royalty} points, if your board does not foul.`
      : `No royalty. This row pays from ${lowestPayingHand(row)} or better.`;
  return left > 0
    ? `${ev.name} so far, ${left} card${left === 1 ? '' : 's'} to go. ${pays}`
    : `${ev.name}. ${pays}`;
};
