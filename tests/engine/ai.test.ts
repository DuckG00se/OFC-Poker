import { describe, expect, it } from 'vitest';
import { chooseTurn } from '../../src/ai';
import { createRng, legalTurnOptions, viewFor } from '../../src/engine';
import { playHand, playPlan, setupFor, start } from './sim';

describe('heuristic AI', () => {
  it('fouls far less often than random placement (random fouls ~70%)', () => {
    let hands = 0;
    let fouls = 0;
    for (let i = 0; i < 80; i++) {
      for (const variant of ['classic', 'pineapple'] as const) {
        const s = playHand(setupFor(`ai-quality-${i}`, { variant }));
        for (const seat of ['human', 'ai'] as const) {
          hands++;
          if (s.result?.seats[seat].fouled) fouls++;
        }
      }
    }
    expect(fouls / hands).toBeLessThan(0.4);
  });

  it('only ever proposes legal plays', () => {
    const rng = createRng('legal-plans');
    for (const variant of ['classic', 'pineapple'] as const) {
      let s = start(setupFor('legal-ai', { variant }));
      while (s.phase === 'placing' && s.turn) {
        const view = viewFor(s, s.turn.seat);
        const plan = chooseTurn(view, rng);
        const options = legalTurnOptions(view.myBoard, view.held, s.turn.need);
        const key = (p: { cardId: string; row: string }[], d: string[]) =>
          JSON.stringify([[...p].sort((a, b) => a.cardId.localeCompare(b.cardId)), [...d].sort()]);
        const keys = new Set(options.map((o) => key(o.placements, o.discards)));
        expect(keys.has(key(plan.placements, plan.discards))).toBe(true);
        s = playPlan(s, s.turn.seat, plan);
      }
    }
  });

  it('only sees what its seat may see (no opponent hand, no deck)', () => {
    const s = start(setupFor('view'));
    const view = viewFor(s, 'ai');
    expect(view.held).toHaveLength(0); // it is not the AI's turn, so it holds nothing
    const humanHeld = new Set(s.seats.human.held.map((c) => c.id));
    // The human's dealt-but-unplaced cards are still "unseen" from the AI's point of view.
    expect(view.unseen.filter((c) => humanHeld.has(c.id))).toHaveLength(5);
    expect(view.unseen).toHaveLength(52);
  });
});
