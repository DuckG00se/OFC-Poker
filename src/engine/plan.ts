import { BOARD_SIZE, type DealStep, type Variant } from './types';

/**
 * The sequence of deals a seat receives in a hand.
 * - Classic: 5 cards, then eight single cards, all placed.
 * - Pineapple: 5 cards, then four deals of 3 where 2 are placed and 1 is discarded.
 * - Fantasyland: all cards at once (14-17); 13 are placed, the rest discarded.
 */
export const dealPlan = (variant: Variant, fantasylandCards: number): DealStep[] => {
  if (fantasylandCards > 0) return [{ deal: fantasylandCards, place: BOARD_SIZE }];
  if (variant === 'pineapple') {
    return [{ deal: 5, place: 5 }, ...Array.from({ length: 4 }, () => ({ deal: 3, place: 2 }))];
  }
  return [{ deal: 5, place: 5 }, ...Array.from({ length: 8 }, () => ({ deal: 1, place: 1 }))];
};
