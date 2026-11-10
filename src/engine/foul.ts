import { evaluateRow, compareRows } from './evaluate';
import { BOARD_SIZE, ROW_NAMES, ROW_SIZE, type Board, type Card } from './types';

export const emptyBoard = (): Board => ({ front: [], mid: [], back: [] });

export const boardCards = (board: Board): Card[] => ROW_NAMES.flatMap((row) => board[row]);

export const boardCount = (board: Board): number =>
  board.front.length + board.mid.length + board.back.length;

export const isBoardComplete = (board: Board): boolean =>
  ROW_NAMES.every((row) => board[row].length === ROW_SIZE[row]) && boardCount(board) === BOARD_SIZE;

/**
 * A completed board fouls when the back row is weaker than the middle, or the middle is
 * weaker than the front. Equal rows are legal. Incomplete boards are never reported as fouled.
 */
export const checkFoul = (board: Board): boolean => {
  if (!isBoardComplete(board)) return false;
  const front = evaluateRow(board.front, 'front');
  const mid = evaluateRow(board.mid, 'mid');
  const back = evaluateRow(board.back, 'back');
  return compareRows(back, mid) < 0 || compareRows(mid, front) < 0;
};
