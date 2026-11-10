import { describe, expect, it } from 'vitest';
import { chooseTurn, heuristicTurn } from '../../src/ai';
import { createRng, legalTurnOptions, viewFor, type Difficulty } from '../../src/engine';
import { playHand, playPlan, setupFor, start } from './sim';

const key = (p: { cardId: string; row: string }[], d: string[]) =>
  JSON.stringify([[...p].sort((a, b) => a.cardId.localeCompare(b.cardId)), [...d].sort()]);

const foulRate = (difficulty: Difficulty, hands: number, variant: 'classic' | 'pineapple'): number => {
  let fouls = 0;
  let total = 0;
  for (let i = 0; i < hands; i++) {
    const s = playHand(setupFor(`foul-${difficulty}-${i}`, { variant }), 'q', difficulty);
    for (const seat of ['human', 'ai'] as const) {
      total++;
      if (s.result?.seats[seat].fouled) fouls++;
    }
  }
  return fouls / total;
};

describe('AI quality', () => {
  it('the plain heuristic fouls far less often than random placement (random fouls ~70%)', () => {
    let fouls = 0;
    let total = 0;
    for (let i = 0; i < 60; i++) {
      for (const variant of ['classic', 'pineapple'] as const) {
        let s = start(setupFor(`h-${i}`, { variant }));
        while (s.phase === 'placing' && s.turn) {
          const rng = createRng(`h-${i}-${s.turn.street}`);
          s = playPlan(s, s.turn.seat, heuristicTurn(viewFor(s, s.turn.seat), rng, 0));
        }
        for (const seat of ['human', 'ai'] as const) {
          total++;
          if (s.result?.seats[seat].fouled) fouls++;
        }
      }
    }
    expect(fouls / total).toBeLessThan(0.4);
  });

  it('Medium (Monte Carlo) fouls clearly less than Easy', () => {
    const easy = foulRate('easy', 25, 'classic');
    const medium = foulRate('medium', 25, 'classic');
    expect(medium).toBeLessThan(easy);
    expect(medium).toBeLessThan(0.3);
  });
});

describe('AI legality', () => {
  it.each(['easy', 'medium', 'hard'] as const)('%s only ever proposes legal plays', (difficulty) => {
    for (const variant of ['classic', 'pineapple'] as const) {
      let s = start(setupFor(`legal-${difficulty}`, { variant }));
      let guard = 0;
      while (s.phase === 'placing' && s.turn && guard++ < 60) {
        const view = viewFor(s, s.turn.seat);
        const plan = chooseTurn(view, {
          difficulty,
          seed: `legal#${s.turn.street}`,
          params: { sims: 6, budgetMs: 200 },
        });
        const options = legalTurnOptions(view.myBoard, view.held, s.turn.need);
        const keys = new Set(options.map((o) => key(o.placements, o.discards)));
        expect(keys.has(key(plan.placements, plan.discards))).toBe(true);
        s = playPlan(s, s.turn.seat, plan);
      }
      expect(s.phase).toBe('scored');
    }
  });

  it('is deterministic: the same position and seed give the same plan', () => {
    const s = start(setupFor('det-ai'));
    const view = viewFor(s, 'human');
    const a = chooseTurn(view, { difficulty: 'medium', seed: 'same' });
    const b = chooseTurn(view, { difficulty: 'medium', seed: 'same' });
    expect(a).toEqual(b);
  });
});

describe('what the AI can see', () => {
  it('sees only its own seat: no opponent hand, no deck order', () => {
    const s = start(setupFor('view'));
    const view = viewFor(s, 'ai');
    expect(view.held).toHaveLength(0); // not the AI's turn
    const humanHeld = new Set(s.seats.human.held.map((c) => c.id));
    // The human's dealt-but-unplaced cards still count as unseen from the AI's point of view.
    expect(view.unseen.filter((c) => humanHeld.has(c.id))).toHaveLength(5);
    expect(view.unseen).toHaveLength(52);
  });

  it('treats its own cards and the opponent\'s visible board as dead, but not their hidden hand', () => {
    let s = start(setupFor('dead', {}, undefined, 'human')); // AI acts first
    const aiTurn = s.turn;
    if (!aiTurn) throw new Error('no turn');
    const view = viewFor(s, 'ai');
    const unseenIds = new Set(view.unseen.map((c) => c.id));
    for (const c of view.held) expect(unseenIds.has(c.id)).toBe(false);
    expect(view.unseen).toHaveLength(47);
    s = playPlan(s, 'ai', chooseTurn(view, { difficulty: 'easy', seed: 'x' }));
    const humanView = viewFor(s, 'human');
    // The human now sees the AI's 5 placed cards plus their own 5 held cards.
    expect(humanView.unseen).toHaveLength(52 - 5 - 5);
  });

  it('Pineapple discards are dead cards to their owner, and unknown to the opponent', () => {
    let s = start(setupFor('pine-dead', { variant: 'pineapple' }, undefined, 'ai'));
    for (let i = 0; i < 2; i++) {
      const t = s.turn;
      if (!t) throw new Error('no turn');
      s = playPlan(s, t.seat, chooseTurn(viewFor(s, t.seat), { difficulty: 'easy', seed: `p${i}` }));
    }
    const t = s.turn;
    if (!t) throw new Error('no turn');
    s = playPlan(s, t.seat, chooseTurn(viewFor(s, t.seat), { difficulty: 'easy', seed: 'p3' }));
    const thrown = s.seats[t.seat].discards[0];
    if (!thrown) throw new Error('no discard');
    const mine = viewFor(s, t.seat);
    expect(mine.unseen.some((c) => c.id === thrown.id)).toBe(false);
    const theirs = viewFor(s, t.seat === 'human' ? 'ai' : 'human');
    expect(theirs.unseen.some((c) => c.id === thrown.id)).toBe(true);
    expect(theirs.oppDiscardCount).toBe(1);
  });

  it('reports how many deals each seat still has to come', () => {
    const s = start(setupFor('remaining', { variant: 'pineapple' }, undefined, 'ai'));
    const view = viewFor(s, 'human');
    expect(view.myRemaining).toHaveLength(4); // 5 + 4x3, minus the one being played
    expect(view.oppRemaining).toHaveLength(5); // the AI has not played yet
  });
});
