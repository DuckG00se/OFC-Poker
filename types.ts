export type Suit = 'h' | 'd' | 'c' | 's';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

export interface PlayerBoard {
  front: (Card | null)[];
  mid: (Card | null)[];
  back: (Card | null)[];
}

export interface PlayerState {
  hand: Card[]; // Cards currently held waiting to be placed
  board: PlayerBoard;
  fouled: boolean;
  scores: {
    front: number;
    mid: number;
    back: number;
    scoop: number;
    total: number;
  };
}

export type Phase = 'START' | 'BETTING' | 'INITIAL_DEAL' | 'PLACEMENT' | 'DRAWING' | 'SCORING' | 'GAME_OVER';

export enum HandRank {
  HighCard = 0,
  Pair = 1,
  TwoPair = 2,
  Trips = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  Quads = 7,
  StraightFlush = 8,
  RoyalFlush = 9,
}

export interface HandEvaluation {
  rank: HandRank;
  value: number; // Numeric score for tie-breaking
  name: string;
}