import type { Action, Seat } from '../engine';
import type { TurnPlan } from './types';

/** Expands a turn plan into the engine actions that carry it out, ending with CONFIRM. */
export const planToActions = (seat: Seat, plan: TurnPlan): Action[] => [
  ...plan.placements.map((p): Action => ({ type: 'PLACE', seat, cardId: p.cardId, row: p.row })),
  ...plan.discards.map((cardId): Action => ({ type: 'DISCARD', seat, cardId })),
  { type: 'CONFIRM', seat },
];
