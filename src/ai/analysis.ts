import { checkFoul, createRng, type Board, type Card, type DealStep } from '../engine';
import { FRONT_MADE_HAND_WEIGHT } from './heuristic';
import { completeBoard } from './montecarlo';

export interface FoulRiskInput {
  /** The player's board, including anything staged this turn. */
  board: Board;
  /** Cards still in hand this turn (known), placed before any random draws. */
  held: readonly Card[];
  /** What is left of the current turn (if anything), followed by the turns to come. */
  steps: readonly DealStep[];
  /** Cards the player cannot see; future draws are sampled from these. */
  unseen: readonly Card[];
  sims: number;
  seed: string;
}

export interface FoulRiskResult {
  /** Estimated chance (0-1) that the finished board fouls with sensible play from here. */
  risk: number;
  sims: number;
}

/**
 * Estimates how likely a board is to end up fouled. It plays the rest of the hand many times
 * with random future cards and the same cautious heuristic the CPU's playouts use, and counts
 * the fouls. A helper for the player, not a guarantee: a strong player will foul less often
 * than this suggests, a reckless one more.
 */
export const estimateFoulRisk = (input: FoulRiskInput): FoulRiskResult => {
  const rng = createRng(input.seed);
  const pool = [...input.unseen];
  const total = input.steps.reduce((n, s) => n + s.deal, 0);
  const random = Math.max(0, Math.min(total - input.held.length, pool.length));
  let fouls = 0;
  for (let sim = 0; sim < input.sims; sim++) {
    for (let i = 0; i < random; i++) {
      const j = i + Math.floor(rng() * (pool.length - i));
      const t = pool[i] as Card;
      pool[i] = pool[j] as Card;
      pool[j] = t;
    }
    const draws = [...input.held, ...pool.slice(0, random)];
    if (checkFoul(completeBoard(input.board, input.steps, draws, FRONT_MADE_HAND_WEIGHT))) fouls++;
  }
  return { risk: input.sims > 0 ? fouls / input.sims : 0, sims: input.sims };
};
