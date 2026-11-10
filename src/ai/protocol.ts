import type { Difficulty, PlayerView } from '../engine';
import type { FoulRiskInput, FoulRiskResult } from './analysis';
import type { TurnPlan } from './types';

/** What the page can ask the worker to do. */
export type AiJob =
  | { kind: 'choose'; view: PlayerView; difficulty: Difficulty; seed: string }
  | { kind: 'foulRisk'; input: FoulRiskInput };

export type AiJobResult<J extends AiJob> = J extends { kind: 'choose' } ? TurnPlan : FoulRiskResult;

export interface AiRequest {
  id: number;
  job: AiJob;
}

export type AiResponse =
  | { id: number; ok: true; result: TurnPlan | FoulRiskResult }
  | { id: number; ok: false; error: string };
