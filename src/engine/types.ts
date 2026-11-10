export type Suit = 'h' | 'd' | 'c' | 's';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  /** Unique id, e.g. "14s" for the ace of spades. */
  readonly id: string;
  readonly suit: Suit;
  readonly rank: Rank;
}

export type RowName = 'front' | 'mid' | 'back';
export const ROW_NAMES: readonly RowName[] = ['front', 'mid', 'back'];
export const ROW_SIZE: Readonly<Record<RowName, number>> = { front: 3, mid: 5, back: 5 };
export const BOARD_SIZE = 13;

/** Cards currently on a row. Slot order carries no meaning in OFC. */
export type Board = Record<RowName, readonly Card[]>;

export type Seat = 'human' | 'ai';
export const SEATS: readonly Seat[] = ['human', 'ai'];
export const otherSeat = (seat: Seat): Seat => (seat === 'human' ? 'ai' : 'human');

export type Variant = 'classic' | 'pineapple';
/** off = no Fantasyland; flat = always 14 cards; progressive = 14/15/16/17 by front hand. */
export type FantasylandMode = 'off' | 'flat' | 'progressive';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameConfig {
  variant: Variant;
  fantasyland: FantasylandMode;
  /** How strong the CPU opponent plays. */
  difficulty: Difficulty;
  /** Value of one point. Payout = points * stake. */
  stake: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  variant: 'classic',
  fantasyland: 'progressive',
  difficulty: 'medium',
  stake: 5,
};

export enum HandCategory {
  HighCard = 0,
  Pair = 1,
  TwoPair = 2,
  Trips = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  Quads = 7,
  StraightFlush = 8,
}

export interface RowEval {
  category: HandCategory;
  /** Ranks used to break ties within a category, most significant first. */
  tiebreak: readonly number[];
  /** Human-readable name, e.g. "Pair of Aces" or "Royal Flush". */
  name: string;
  isRoyalFlush: boolean;
}

export interface Placement {
  cardId: string;
  row: RowName;
}

export type Phase = 'idle' | 'placing' | 'scored';

/** Everything needed to deal (and replay) one hand. */
export interface HandSetup {
  seed: string;
  config: GameConfig;
  /** The dealer. The other seat acts first on each street. */
  button: Seat;
  /** Fantasyland card count per seat; 0 means not in Fantasyland. */
  fantasyland: Readonly<Record<Seat, number>>;
}

/** How many cards are dealt on a turn and how many must be placed. */
export interface DealStep {
  deal: number;
  place: number;
}

export interface SeatState {
  board: Board;
  /** Cards dealt this turn that are not yet placed or marked as discards. */
  held: readonly Card[];
  /** Confirmed discards (only ever visible to their owner). */
  discards: readonly Card[];
  /** Deal steps for this hand. */
  plan: readonly DealStep[];
  /** Number of confirmed turns so far; also the index of the next plan step. */
  street: number;
  /** Fantasyland card count this hand; 0 when playing normally. */
  fantasyland: number;
}

export interface Turn {
  seat: Seat;
  street: number;
  dealt: readonly Card[];
  need: { place: number; discard: number };
  /** Staged placements; they can be moved or undone until confirmed. */
  placed: readonly Placement[];
  /** Cards staged to be discarded. */
  discarded: readonly string[];
}

export interface SeatScore {
  fouled: boolean;
  evals: Record<RowName, RowEval>;
  royalties: Record<RowName, number>;
  royaltyTotal: number;
}

export interface HandScore {
  seats: Record<Seat, SeatScore>;
  /** Row outcome from the human's perspective: 1 win, -1 loss, 0 tie. */
  rowResults: Record<RowName, -1 | 0 | 1>;
  /** Scoop bonus from the human's perspective (+3, -3 or 0). */
  scoop: number;
  /** Points won (positive) or lost per seat. Zero-sum. */
  points: Record<Seat, number>;
}

export type Action =
  | { type: 'START_HAND'; setup: HandSetup }
  | { type: 'PLACE'; seat: Seat; cardId: string; row: RowName }
  | { type: 'MOVE'; seat: Seat; cardId: string; row: RowName }
  | { type: 'DISCARD'; seat: Seat; cardId: string }
  | { type: 'UNDO'; seat: Seat; cardId: string }
  | { type: 'CONFIRM'; seat: Seat };

export interface GameState {
  phase: Phase;
  setup: HandSetup | null;
  deck: readonly Card[];
  deckPos: number;
  seats: Record<Seat, SeatState>;
  turn: Turn | null;
  result: HandScore | null;
  /** Fantasyland card counts for the next hand (0 = none), set when scored. */
  fantasylandNext: Record<Seat, number>;
  /** Every action that was applied, in order. Replaying it reproduces the hand. */
  log: readonly Action[];
}
