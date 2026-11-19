import {
  HandCategory,
  checkFoul,
  evaluateRow,
  parseCards,
  scoreHand,
  type Board,
  type Card,
  type HandScore,
} from '../../engine';

const board = (front: string, mid: string, back: string): Board => ({
  front: parseCards(front),
  mid: parseCards(mid),
  back: parseCards(back),
});

/** Same ideas, one legal and one fouled, so the difference is visible. */
export const LEGAL_BOARD: Board = board('5s 2c 4d', 'Qs Qh 9d 7h 3c', 'Ah Ad Js Jc 8c');
export const FOULED_BOARD: Board = board('Qd Qc 4h', 'Kc 9s 7d 5h 2d', 'Ac Ah Ts 8d 3h');

export interface WorkedExample {
  you: Board;
  cpu: Board;
  /** Computed by the real scoring function, never typed in. */
  score: HandScore;
}

const YOU = board('8s 8h 3d', 'Kc Kd 9h 5s 2c', 'Ah As 9c 9d 4h');
const CPU = board('Jc 7d 2h', 'Qc Jd 8c 6d 3s', 'Tc Td Th 6c 4s');
export const WORKED: WorkedExample = { you: YOU, cpu: CPU, score: scoreHand({ human: YOU, ai: CPU }) };

export interface RankingExample {
  category: HandCategory;
  royal: boolean;
  cards: readonly Card[];
  /** A one-line description of the hand. */
  blurb: string;
}

const rank = (category: HandCategory, cards: string, blurb: string, royal = false): RankingExample => ({
  category,
  royal,
  cards: parseCards(cards),
  blurb,
});

/** Weakest to strongest. The test suite checks that each one really is what it claims. */
export const RANKING_EXAMPLES: readonly RankingExample[] = [
  rank(HandCategory.HighCard, 'Ah Kd 9c 5s 2d', 'No matches. The highest card counts.'),
  rank(HandCategory.Pair, 'Qh Qd 8c 5s 2d', 'Two cards of the same rank.'),
  rank(HandCategory.TwoPair, 'Jh Jd 6c 6s Ad', 'Two different pairs.'),
  rank(HandCategory.Trips, '8h 8d 8c Ks 3d', 'Three cards of the same rank.'),
  rank(HandCategory.Straight, '5h 6d 7c 8s 9d', 'Five cards in a row.'),
  rank(HandCategory.Flush, 'Ah 9h 7h 4h 2h', 'Five cards of one suit.'),
  rank(HandCategory.FullHouse, 'Kh Kd Kc 4s 4d', 'Three of a kind plus a pair.'),
  rank(HandCategory.Quads, '9h 9d 9c 9s Ad', 'Four cards of the same rank.'),
  rank(HandCategory.StraightFlush, '5s 6s 7s 8s 9s', 'Five in a row, all one suit.'),
  rank(HandCategory.StraightFlush, 'Ah Kh Qh Jh Th', 'The best hand: ace-high straight flush.', true),
];

/** Is the example really what it says it is? Used by the tests. */
export const exampleIsCorrect = (example: RankingExample): boolean => {
  const ev = evaluateRow(example.cards, 'back');
  return ev.category === example.category && ev.isRoyalFlush === example.royal;
};

export const fouledBoardFouls = (): boolean => checkFoul(FOULED_BOARD);
export const legalBoardIsLegal = (): boolean => !checkFoul(LEGAL_BOARD);
