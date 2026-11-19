import { HandCategory, type FantasylandMode } from './types';

/**
 * The numbers that define the game's scoring and Fantasyland rules, in one place. The
 * scoring code is built on these and so is the "How to play" screen, which means the screen
 * cannot say something the game does not do.
 */

/** Points a hand pays on a row (before any foul check), by hand type. */
export type RoyaltyTable = Readonly<Partial<Record<HandCategory, number>>>;

/** Front row: a pair of 6s is the lowest that pays, then one more point per rank up to aces. */
export const FRONT_PAIR_MIN_RANK = 6;
export const frontPairRoyalty = (rank: number): number => rank - (FRONT_PAIR_MIN_RANK - 1);

/** Front row trips: 222 pays 10, and each higher rank pays one more, up to AAA. */
export const FRONT_TRIPS_BASE = 10;
export const frontTripsRoyalty = (rank: number): number => FRONT_TRIPS_BASE + (rank - 2);

export const MID_ROYALTIES: RoyaltyTable = {
  [HandCategory.Trips]: 2,
  [HandCategory.Straight]: 4,
  [HandCategory.Flush]: 8,
  [HandCategory.FullHouse]: 12,
  [HandCategory.Quads]: 20,
  [HandCategory.StraightFlush]: 30,
};

export const BACK_ROYALTIES: RoyaltyTable = {
  [HandCategory.Straight]: 2,
  [HandCategory.Flush]: 4,
  [HandCategory.FullHouse]: 6,
  [HandCategory.Quads]: 10,
  [HandCategory.StraightFlush]: 15,
};

/** A royal flush is a straight flush that pays extra on the middle and back rows. */
export const ROYAL_FLUSH_ROYALTY = { mid: 50, back: 25 } as const;

export const FANTASYLAND = {
  /** Lowest front-row pair that earns Fantasyland (12 = queens). */
  minPairRank: 12,
  /** Cards dealt in flat mode, and for the lowest qualifying hand in progressive mode. */
  baseCards: 14,
  /** Progressive mode: one more card for each rank above queens, and trips get the most. */
  tripsCards: 17,
  /** Staying in: front trips, or a middle row at least this good, or a back row at least this good. */
  stay: {
    frontTrips: true,
    midAtLeast: HandCategory.FullHouse,
    backAtLeast: HandCategory.Quads,
  },
} as const;

/** Cards dealt for a front-row pair (by its rank) or trips in the given mode; 0 if it does not qualify. */
export const fantasylandCardsFor = (
  kind: 'pair' | 'trips',
  rank: number,
  mode: FantasylandMode,
): number => {
  if (mode === 'off') return 0;
  if (kind === 'pair' && rank < FANTASYLAND.minPairRank) return 0;
  if (mode === 'flat') return FANTASYLAND.baseCards;
  if (kind === 'trips') return FANTASYLAND.tripsCards;
  return FANTASYLAND.baseCards + (rank - FANTASYLAND.minPairRank);
};
