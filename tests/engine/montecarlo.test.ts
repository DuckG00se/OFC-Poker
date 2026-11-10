import { describe, expect, it } from 'vitest';
import {
  chooseTurn,
  completeBoardForTest,
  monteCarloTurn,
  HARD_PARAMS,
  MEDIUM_PARAMS,
} from '../../src/ai';
import {
  DEFAULT_CONFIG,
  applyPlacements,
  checkFoul,
  createDeck,
  createRng,
  isBoardComplete,
  parseCards,
  type Board,
  type PlayerView,
} from '../../src/engine';
import { board } from './helpers';

/** A hand-built view for the last Pineapple turn: two slots left, three cards held. */
const finalTurnView = (): PlayerView => {
  const mine = board('Js Jh 4d', 'Qs Qh 8d 3c', 'Ks Kh 9d 2c');
  const held = parseCards('Qd 7h 5s');
  const opp = board('9c 9d 2h', 'Ac Ad 6h 6c 3s', 'Th Td Tc 8s 8h');
  const seen = new Set(
    [...mine.front, ...mine.mid, ...mine.back, ...held, ...opp.front, ...opp.mid, ...opp.back].map(
      (c) => c.id,
    ),
  );
  return {
    seat: 'ai',
    config: { ...DEFAULT_CONFIG, variant: 'pineapple', difficulty: 'hard' },
    myBoard: mine,
    oppBoard: opp,
    oppBoardHidden: false,
    held,
    myDiscards: [],
    stagedDiscards: [],
    oppDiscardCount: 4,
    myRemaining: [],
    oppRemaining: [],
    turn: {
      seat: 'ai',
      street: 4,
      dealt: held,
      need: { place: 2, discard: 1 },
      placed: [],
      discarded: [],
    },
    myFantasyland: 0,
    oppFantasyland: 0,
    unseen: createDeck().filter((c) => !seen.has(c.id)),
  };
};

describe('monteCarloTurn', () => {
  it('avoids a foul when only some of the options are legal boards (exact final turn)', () => {
    const view = finalTurnView();
    for (const params of [MEDIUM_PARAMS, HARD_PARAMS]) {
      const result = monteCarloTurn(view, createRng('final'), params);
      const after: Board = applyPlacements(view.myBoard, view.held, result.placements);
      expect(isBoardComplete(after)).toBe(true);
      expect(checkFoul(after)).toBe(false);
      expect(result.discards).toHaveLength(1);
    }
  });

  it('does not simulate when the outcome is already exact', () => {
    const result = monteCarloTurn(finalTurnView(), createRng('exact'), HARD_PARAMS);
    expect(result.simulations).toBe(1);
  });

  it('stops early when its time budget runs out', () => {
    const s = parseCards('Qs Qh 7d 5c 2s');
    const ids = new Set(s.map((c) => c.id));
    const view: PlayerView = {
      ...finalTurnView(),
      config: { ...DEFAULT_CONFIG, variant: 'classic' },
      myBoard: { front: [], mid: [], back: [] },
      oppBoard: { front: [], mid: [], back: [] },
      held: s,
      oppDiscardCount: 0,
      myRemaining: Array.from({ length: 8 }, () => ({ deal: 1, place: 1 })),
      oppRemaining: [{ deal: 5, place: 5 }, ...Array.from({ length: 8 }, () => ({ deal: 1, place: 1 }))],
      turn: { seat: 'ai', street: 0, dealt: s, need: { place: 5, discard: 0 }, placed: [], discarded: [] },
      unseen: createDeck().filter((c) => !ids.has(c.id)),
    };
    const quick = monteCarloTurn(view, createRng('t'), { ...HARD_PARAMS, sims: 5000, budgetMs: 0 });
    expect(quick.simulations).toBeLessThan(200);
    expect(quick.placements).toHaveLength(5);
  });

  it('more simulations still return a legal, complete placement', () => {
    const view = finalTurnView();
    const plan = chooseTurn(view, { difficulty: 'hard', seed: 'h' });
    expect(plan.placements).toHaveLength(2);
    expect(plan.discards).toHaveLength(1);
  });
});

describe('simulated playouts', () => {
  it('always finish with a complete board', () => {
    const start: Board = { front: parseCards('Qs'), mid: parseCards('7d 5c'), back: parseCards('As Ah') };
    const used = new Set([...start.front, ...start.mid, ...start.back].map((c) => c.id));
    const draws = createDeck().filter((c) => !used.has(c.id)).slice(0, 8);
    const steps = Array.from({ length: 8 }, () => ({ deal: 1, place: 1 }));
    const done = completeBoardForTest(start, steps, draws, 0.25);
    expect(isBoardComplete(done)).toBe(true);
  });
});
