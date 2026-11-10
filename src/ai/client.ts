import type { Difficulty, PlayerView } from '../engine';
import { chooseTurn } from './choose';
import type { AiRequest, AiResponse } from './protocol';
import type { TurnPlan } from './types';

type Pending = {
  view: PlayerView;
  difficulty: Difficulty;
  seed: string;
  resolve: (plan: TurnPlan) => void;
  reject: (error: Error) => void;
};

/**
 * Asks a Web Worker for the CPU's move. If workers are unavailable (or crash), it computes the
 * move on the main thread instead, so the game always keeps working.
 */
export class AiClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private disposed = false;

  constructor() {
    if (typeof Worker === 'undefined') return;
    try {
      this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (event: MessageEvent<AiResponse>) => this.onMessage(event.data);
      this.worker.onerror = () => this.fallBackAll();
    } catch {
      this.worker = null;
    }
  }

  choose(view: PlayerView, difficulty: Difficulty, seed: string): Promise<TurnPlan> {
    return new Promise<TurnPlan>((resolve, reject) => {
      if (this.disposed) {
        reject(new Error('AI client disposed'));
        return;
      }
      const id = this.nextId++;
      const entry: Pending = { view, difficulty, seed, resolve, reject };
      if (!this.worker) {
        setTimeout(() => this.runHere(entry), 0);
        return;
      }
      this.pending.set(id, entry);
      const request: AiRequest = { id, view, difficulty, seed };
      this.worker.postMessage(request);
    });
  }

  /** Abandons any request in flight (a worker cannot be interrupted, so it is replaced). */
  cancelPending(): void {
    if (this.pending.size === 0 || !this.worker) return;
    this.worker.terminate();
    for (const entry of this.pending.values()) entry.reject(new Error('cancelled'));
    this.pending.clear();
    try {
      this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (event: MessageEvent<AiResponse>) => this.onMessage(event.data);
      this.worker.onerror = () => this.fallBackAll();
    } catch {
      this.worker = null;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.worker?.terminate();
    this.worker = null;
    for (const entry of this.pending.values()) entry.reject(new Error('AI client disposed'));
    this.pending.clear();
  }

  private onMessage(msg: AiResponse): void {
    const entry = this.pending.get(msg.id);
    if (!entry) return;
    this.pending.delete(msg.id);
    if (msg.ok) entry.resolve(msg.plan);
    else this.runHere(entry); // the worker threw; try once more on this thread
  }

  private fallBackAll(): void {
    this.worker?.terminate();
    this.worker = null;
    const entries = [...this.pending.values()];
    this.pending.clear();
    for (const entry of entries) this.runHere(entry);
  }

  private runHere(entry: Pending): void {
    try {
      entry.resolve(chooseTurn(entry.view, { difficulty: entry.difficulty, seed: entry.seed }));
    } catch (error) {
      entry.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
