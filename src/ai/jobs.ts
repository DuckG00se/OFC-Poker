import { estimateFoulRisk, type FoulRiskResult } from './analysis';
import { chooseTurn } from './choose';
import type { AiJob } from './protocol';
import type { TurnPlan } from './types';

/** Runs a job synchronously. Shared by the worker and the main-thread fallback. */
export const runJob = (job: AiJob): TurnPlan | FoulRiskResult =>
  job.kind === 'choose'
    ? chooseTurn(job.view, { difficulty: job.difficulty, seed: job.seed })
    : estimateFoulRisk(job.input);
