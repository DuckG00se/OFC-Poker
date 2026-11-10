import type { Difficulty, PlayerView } from '../engine';
import type { FoulRiskInput, FoulRiskResult } from './analysis';
import { runJob } from './jobs';
import type { AiJob, AiRequest, AiResponse } from './protocol';
import type { TurnPlan } from './types';

type Pending = {
  job: AiJob;
  resolve: (result: TurnPlan | FoulRiskResult) => void;
  reject: (error: Error) => void;
};

/**
 * Sends work to a Web Worker. If workers are unavailable (or crash), the same code runs on
 * the main thread instead, so the game always keeps working.
 */
export class AiClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private disposed = false;

  constructor() {
    this.worker = this.spawn();
  }

  /** Asks for the CPU's move. */
  choose(view: PlayerView, difficulty: Difficulty, seed: string): Promise<TurnPlan> {
    return this.run({ kind: 'choose', view, difficulty, seed }) as Promise<TurnPlan>;
  }

  /** Asks for the player's estimated foul risk. */
  foulRisk(input: FoulRiskInput): Promise<FoulRiskResult> {
    return this.run({ kind: 'foulRisk', input }) as Promise<FoulRiskResult>;
  }

  /** Abandons any request in flight (a worker cannot be interrupted, so it is replaced). */
  cancelPending(): void {
    if (this.pending.size === 0) return;
    for (const entry of this.pending.values()) entry.reject(new Error('cancelled'));
    this.pending.clear();
    if (this.worker) {
      this.worker.terminate();
      this.worker = this.spawn();
    }
  }

  dispose(): void {
    this.disposed = true;
    this.worker?.terminate();
    this.worker = null;
    for (const entry of this.pending.values()) entry.reject(new Error('AI client disposed'));
    this.pending.clear();
  }

  private spawn(): Worker | null {
    if (typeof Worker === 'undefined') return null;
    try {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (event: MessageEvent<AiResponse>) => this.onMessage(event.data);
      worker.onerror = () => this.fallBackAll();
      return worker;
    } catch {
      return null;
    }
  }

  private run(job: AiJob): Promise<TurnPlan | FoulRiskResult> {
    return new Promise((resolve, reject) => {
      if (this.disposed) {
        reject(new Error('AI client disposed'));
        return;
      }
      const id = this.nextId++;
      const entry: Pending = { job, resolve, reject };
      this.pending.set(id, entry);
      if (!this.worker) {
        setTimeout(() => this.runHere(id), 0);
        return;
      }
      const request: AiRequest = { id, job };
      this.worker.postMessage(request);
    });
  }

  private onMessage(msg: AiResponse): void {
    const entry = this.pending.get(msg.id);
    if (!entry) return;
    if (msg.ok) {
      this.pending.delete(msg.id);
      entry.resolve(msg.result);
    } else {
      this.runHere(msg.id); // the worker threw; try once more on this thread
    }
  }

  private fallBackAll(): void {
    this.worker?.terminate();
    this.worker = null;
    for (const id of [...this.pending.keys()]) this.runHere(id);
  }

  private runHere(id: number): void {
    const entry = this.pending.get(id);
    if (!entry) return; // cancelled in the meantime
    this.pending.delete(id);
    try {
      entry.resolve(runJob(entry.job));
    } catch (error) {
      entry.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
