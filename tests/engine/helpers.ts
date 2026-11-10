import { parseCards, type Board, type RowName } from '../../src/engine';
import { evaluateRow } from '../../src/engine/evaluate';

export const cards = parseCards;

export const board = (front: string, mid: string, back: string): Board => ({
  front: parseCards(front),
  mid: parseCards(mid),
  back: parseCards(back),
});

export const ev = (text: string, row: RowName = 'back') => evaluateRow(parseCards(text), row);
