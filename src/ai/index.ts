import { heuristicTurn } from './heuristic';
import type { PlayerView } from '../engine';
import type { TurnPlan } from './types';

export { solveFantasyland } from './fantasyland';
export { heuristicTurn, scoreBoard } from './heuristic';
export { planToActions } from './plan';
export type { TurnPlan } from './types';

/** The AI entry point: decides a whole turn from what the seat is allowed to see. */
export const chooseTurn = (view: PlayerView, rng: () => number): TurnPlan =>
  heuristicTurn(view, rng);
