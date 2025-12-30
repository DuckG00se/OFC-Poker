import { Suit, Rank } from './types';

export const SUITS: Suit[] = ['h', 'd', 'c', 's'];
export const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export const RANK_NAMES: Record<number, string> = {
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

export const HAND_NAMES = [
  "High Card", "Pair", "Two Pair", "Trips", "Straight", 
  "Flush", "Full House", "Quads", "Straight Flush", "Royal Flush"
];

// Board capacities
export const ROW_SIZE = {
  front: 3,
  mid: 5,
  back: 5
};
