import type { Difficulty, PlayerView } from '../engine';
import type { TurnPlan } from './types';

export interface AiRequest {
  id: number;
  view: PlayerView;
  difficulty: Difficulty;
  seed: string;
}

export type AiResponse =
  | { id: number; ok: true; plan: TurnPlan }
  | { id: number; ok: false; error: string };
