import { evaluateRow, compareRows } from './evaluate';
import { checkFoul } from './foul';
import { rowRoyalty } from './royalties';
import {
  ROW_NAMES,
  type Board,
  type HandScore,
  type RowName,
  type Seat,
  type SeatScore,
} from './types';

export const SCOOP_BONUS = 3;
export const FOUL_PENALTY = 6; // a scoop: 3 rows + 3 bonus

const scoreSeat = (board: Board): SeatScore => {
  const fouled = checkFoul(board);
  const evals = {
    front: evaluateRow(board.front, 'front'),
    mid: evaluateRow(board.mid, 'mid'),
    back: evaluateRow(board.back, 'back'),
  };
  const royalties = { front: 0, mid: 0, back: 0 };
  if (!fouled) {
    for (const row of ROW_NAMES) royalties[row] = rowRoyalty(evals[row], row);
  }
  return {
    fouled,
    evals,
    royalties,
    royaltyTotal: royalties.front + royalties.mid + royalties.back,
  };
};

/**
 * Scores a completed heads-up hand.
 * - +1 per row won (ties pay nothing), +3 for winning all three rows (scoop).
 * - A fouled board pays the opponent a full scoop (6) and earns no royalties of its own.
 * - If both players foul the hand is a wash. The non-fouler still collects their royalties.
 */
export const scoreHand = (boards: Record<Seat, Board>): HandScore => {
  const human = scoreSeat(boards.human);
  const ai = scoreSeat(boards.ai);

  const rowResults: Record<RowName, -1 | 0 | 1> = { front: 0, mid: 0, back: 0 };
  let scoop = 0;
  let humanPoints = 0;

  if (human.fouled && ai.fouled) {
    // Nothing changes hands.
  } else if (human.fouled || ai.fouled) {
    const winnerIsHuman = ai.fouled;
    const sign = winnerIsHuman ? 1 : -1;
    for (const row of ROW_NAMES) rowResults[row] = sign;
    scoop = sign * SCOOP_BONUS;
    humanPoints = sign * FOUL_PENALTY + (winnerIsHuman ? human.royaltyTotal : -ai.royaltyTotal);
  } else {
    let net = 0;
    for (const row of ROW_NAMES) {
      const diff = compareRows(human.evals[row], ai.evals[row]);
      const result = diff > 0 ? 1 : diff < 0 ? -1 : 0;
      rowResults[row] = result;
      net += result;
    }
    if (net === 3) scoop = SCOOP_BONUS;
    else if (net === -3) scoop = -SCOOP_BONUS;
    humanPoints = net + scoop + human.royaltyTotal - ai.royaltyTotal;
  }

  return {
    seats: { human, ai },
    rowResults,
    scoop,
    points: { human: humanPoints, ai: humanPoints === 0 ? 0 : -humanPoints },
  };
};
