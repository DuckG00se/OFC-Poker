import type { Placement } from '../engine';

/** A complete decision for one turn: where each kept card goes, and what to throw away. */
export interface TurnPlan {
  placements: Placement[];
  discards: string[];
  /** Optional short explanation, shown to the player when "AI commentary" is on. */
  reason?: string;
}
