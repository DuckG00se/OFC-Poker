import { describe, expect, it } from 'vitest';
import {
  PERSONAS,
  AiClient,
  chooseTurn,
  estimateFoulRisk,
  explainPlan,
  personaFor,
  quipForResult,
  quipForStart,
} from '../../src/ai';
import { scoreHand, viewFor, parseCards, DEFAULT_CONFIG, createDeck, type PlayerView } from '../../src/engine';
import { board } from './helpers';
import { setupFor, start } from './sim';

describe('personas', () => {
  it('each level has a distinct name and a full set of lines', () => {
    const names = Object.values(PERSONAS).map((p) => p.name);
    expect(new Set(names).size).toBe(3);
    for (const persona of Object.values(PERSONAS)) {
      for (const lines of Object.values(persona.lines)) expect(lines.length).toBeGreaterThan(0);
    }
  });

  it('quips are deterministic per seed', () => {
    const persona = personaFor('hard');
    expect(quipForStart(persona, 'abc')).toBe(quipForStart(persona, 'abc'));
  });

  it('reacts to what happened in the hand', () => {
    const persona = personaFor('medium');
    const strong = board('Js Jh 4d', 'Ks Kh Kd 7c 2s', 'As Ah Ad 9c 9d');
    const weak = board('2c 3d 5h', '3h 6d 9s Tc Jc', '4s 4h 8d Qd Qc');
    const aiWins = scoreHand({ human: weak, ai: strong });
    const aiLoses = scoreHand({ human: strong, ai: weak });
    expect(persona.lines.scoop).toContain(quipForResult(persona, aiWins, 0, 's1'));
    expect(persona.lines.scoop).not.toContain(quipForResult(persona, aiLoses, 0, 's1'));
    expect(persona.lines.fantasyland).toContain(quipForResult(persona, aiLoses, 14, 's1'));
    const fouled = board('Qs Qh 7d', 'Kc Th 6h 3s 5d', 'Ac 7h 7s 8c 8s');
    const aiFouls = scoreHand({ human: strong, ai: fouled });
    expect(persona.lines.foul).toContain(quipForResult(persona, aiFouls, 0, 's1'));
  });
});

describe('explainPlan', () => {
  const viewWith = (held: string, myBoard = { front: [], mid: [], back: [] } as PlayerView['myBoard']): PlayerView => {
    const cards = parseCards(held);
    const ids = new Set(cards.map((c) => c.id));
    return {
      seat: 'ai',
      config: { ...DEFAULT_CONFIG },
      myBoard,
      oppBoard: { front: [], mid: [], back: [] },
      oppBoardHidden: false,
      held: cards,
      myDiscards: [],
      stagedDiscards: [],
      oppDiscardCount: 0,
      myRemaining: [],
      oppRemaining: [],
      turn: {
        seat: 'ai',
        street: 1,
        dealt: cards,
        need: { place: cards.length, discard: 0 },
        placed: [],
        discarded: [],
      },
      myFantasyland: 0,
      oppFantasyland: 0,
      unseen: createDeck().filter((c) => !ids.has(c.id)),
    };
  };

  it('describes pairing up in the back row', () => {
    const view = viewWith('7h', { front: [], mid: [], back: parseCards('7s 2d') });
    expect(explainPlan(view, { placements: [{ cardId: '7h', row: 'back' }], discards: [] })).toBe(
      'Pairs the 7s in the back row.',
    );
  });

  it('describes a Fantasyland chase', () => {
    const view = viewWith('Qh', { front: parseCards('Qs 2d'), mid: [], back: [] });
    expect(explainPlan(view, { placements: [{ cardId: '12h', row: 'front' }], discards: [] })).toMatch(
      /Fantasyland/,
    );
  });

  it('says nothing when the move is unremarkable', () => {
    const view = viewWith('9h', { front: [], mid: parseCards('As 2d'), back: parseCards('Ks 4c') });
    expect(explainPlan(view, { placements: [{ cardId: '9h', row: 'mid' }], discards: [] })).toBeUndefined();
  });

  it('plans from a real game carry a reason only sometimes', () => {
    const s = start(setupFor('reasons'));
    const plan = chooseTurn(viewFor(s, 'human'), { difficulty: 'easy', seed: 'r' });
    expect(plan.reason === undefined || plan.reason.length > 0).toBe(true);
  });
});

describe('AiClient without Web Workers (e.g. tests, old browsers)', () => {
  it('falls back to computing on the main thread', async () => {
    const client = new AiClient();
    const s = start(setupFor('client'));
    const plan = await client.choose(viewFor(s, 'human'), 'medium', 'client-seed');
    expect(plan.placements).toHaveLength(5);
    client.dispose();
  });

  it('rejects after being disposed', async () => {
    const client = new AiClient();
    client.dispose();
    const s = start(setupFor('client2'));
    await expect(client.choose(viewFor(s, 'human'), 'easy', 'x')).rejects.toThrow();
  });
});

describe('foul risk estimate', () => {
  const unseenOf = (b: ReturnType<typeof board>) => {
    const seen = new Set([...b.front, ...b.mid, ...b.back].map((c) => c.id));
    return createDeck().filter((c) => !seen.has(c.id));
  };
  const single = (n: number) => Array.from({ length: n }, () => ({ deal: 1, place: 1 }));

  it('is high for a board heading for a foul and low for a healthy one', () => {
    const risky = board('As Ah', '7d 5c', '2s');
    const healthy = board('2s', '7d 5c', 'As Ah');
    const riskOf = (b: ReturnType<typeof board>) =>
      estimateFoulRisk({ board: b, held: [], steps: single(8), unseen: unseenOf(b), sims: 150, seed: 'r' }).risk;
    expect(riskOf(risky)).toBeGreaterThan(0.6);
    expect(riskOf(healthy)).toBeLessThan(0.35);
  });

  it('is exactly 0 or 1 when the board is already complete', () => {
    const fouled = board('Qs Qh 7d', 'Kc Th 6h 3s 5d', 'Ac 7h 7s 8c 8s');
    const legal = board('2c 3d 5h', '3h 6d 9s Tc Jc', '4s 4h 8d Qd Qc');
    const run = (b: ReturnType<typeof board>) =>
      estimateFoulRisk({ board: b, held: [], steps: [], unseen: unseenOf(b), sims: 10, seed: 'c' }).risk;
    expect(run(fouled)).toBe(1);
    expect(run(legal)).toBe(0);
  });

  it('uses the cards still in hand before drawing random ones', () => {
    // One slot left in the back row; the held card decides everything.
    const b = board('2c 3d 5h', 'Ks Kh 9s Tc Jc', 'As Ah 8d 4c');
    const saved = estimateFoulRisk({ board: b, held: parseCards('Ad'), steps: single(1), unseen: unseenOf(b), sims: 20, seed: 'h' });
    expect(saved.risk).toBe(0);
  });

  it('is available through the client', async () => {
    const client = new AiClient();
    const b = board('2s', '7d 5c', 'As Ah');
    const result = await client.foulRisk({ board: b, held: [], steps: single(8), unseen: unseenOf(b), sims: 30, seed: 'x' });
    expect(result.sims).toBe(30);
    expect(result.risk).toBeGreaterThanOrEqual(0);
    client.dispose();
  });
});
