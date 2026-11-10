import { createRng, type Difficulty, type PlayerView } from '../engine';
import { explainPlan } from './explain';
import { solveFantasyland } from './fantasyland';
import { heuristicTurn } from './heuristic';
import { monteCarloTurn, type MonteCarloParams } from './montecarlo';
import type { TurnPlan } from './types';

/** Random jitter added to the heuristic's scores for the Easy level. */
export const EASY_NOISE = 1.4;

/*
 * Measured with scripts/bench-ai.ts (points per hand, +/- standard error, seats swapped):
 *   Classic:   Medium vs Easy +2.7 (0.35); Hard vs Medium +1.0 (0.42)
 *   Pineapple: Medium vs Easy +2.5 (0.73); Hard vs Easy +7.3 (0.93)
 * Medium is deliberately light: past ~40 simulations the heuristic playout, not the sample
 * size, limits strength in Classic, so extra sims only slow it down without adding a level.
 */
export const MEDIUM_PARAMS: MonteCarloParams = {
  shortlist: 3,
  fantasylandExtra: 0,
  sims: 12,
  fantasylandValue: 4,
  budgetMs: 1200,
};

export const HARD_PARAMS: MonteCarloParams = {
  shortlist: 8,
  fantasylandExtra: 3,
  sims: 240,
  fantasylandValue: 9,
  budgetMs: 3000,
};

export interface ChooseOptions {
  difficulty: Difficulty;
  /** Seeds the CPU's own randomness, so the same position always gets the same answer. */
  seed: string;
  /** Overrides the built-in simulation settings (used by tests and benchmarks). */
  params?: Partial<MonteCarloParams>;
}

/**
 * Decides a whole turn for a seat from what it is allowed to see.
 * Synchronous and pure; the app calls it from a Web Worker so the UI never freezes.
 */
export const chooseTurn = (view: PlayerView, options: ChooseOptions): TurnPlan => {
  const rng = createRng(options.seed);
  const turn = view.turn;
  if (!turn) return { placements: [], discards: [] };

  let plan: TurnPlan;
  if (turn.need.place >= 13) {
    plan = solveFantasyland(view.held);
  } else if (options.difficulty === 'easy') {
    plan = heuristicTurn(view, rng, EASY_NOISE);
  } else {
    const base = options.difficulty === 'hard' ? HARD_PARAMS : MEDIUM_PARAMS;
    const { placements, discards } = monteCarloTurn(view, rng, { ...base, ...options.params });
    plan = { placements, discards };
  }

  const reason = turn.need.place >= 13 ? plan.reason : explainPlan(view, plan);
  return reason ? { ...plan, reason } : { placements: plan.placements, discards: plan.discards };
};
