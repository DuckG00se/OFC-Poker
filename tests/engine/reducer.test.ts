import { describe, expect, it } from 'vitest';
import {
  boardCards,
  boardCount,
  gameReducer,
  isBoardComplete,
  replay,
  seededDeck,
  viewFor,
  type Action,
  type GameState,
} from '../../src/engine';
import { planToActions, playHand, setupFor, start } from './sim';

const seeds = Array.from({ length: 40 }, (_, i) => `seed-${i}`);

const allCardIds = (s: GameState): string[] => [
  ...boardCards(s.seats.human.board),
  ...boardCards(s.seats.ai.board),
  ...s.seats.human.discards,
  ...s.seats.ai.discards,
].map((c) => c.id);

describe('seeded RNG', () => {
  it('the same seed always yields the same deck; different seeds differ', () => {
    expect(seededDeck('abc').map((c) => c.id)).toEqual(seededDeck('abc').map((c) => c.id));
    expect(seededDeck('abc').map((c) => c.id)).not.toEqual(seededDeck('abd').map((c) => c.id));
  });

  it('a shuffled deck is a permutation of all 52 cards', () => {
    const ids = seededDeck('x').map((c) => c.id);
    expect(new Set(ids).size).toBe(52);
  });
});

describe('dealing flow (classic)', () => {
  it('deals 5 to the seat after the button, and nothing to the other seat yet', () => {
    const s = start(setupFor('t1', {}, { human: 0, ai: 0 }, 'ai'));
    expect(s.phase).toBe('placing');
    expect(s.turn?.seat).toBe('human');
    expect(s.turn?.need).toEqual({ place: 5, discard: 0 });
    expect(s.seats.human.held).toHaveLength(5);
    expect(s.seats.ai.held).toHaveLength(0);
    expect(s.deckPos).toBe(5);
  });

  it('flips who acts first with the button', () => {
    const s = start(setupFor('t1', {}, { human: 0, ai: 0 }, 'human'));
    expect(s.turn?.seat).toBe('ai');
  });

  it('alternates turns each street and deals single cards after the opening five', () => {
    let s = start(setupFor('t2'));
    const order: string[] = [];
    const sizes: number[] = [];
    const rng = () => 0.5;
    for (let guard = 0; s.phase === 'placing' && guard < 40; guard++) {
      const turn = s.turn;
      if (!turn) break;
      order.push(turn.seat);
      sizes.push(turn.dealt.length);
      // place each card on the first row that has room
      const board = s.seats[turn.seat].board;
      const space = { front: 3 - board.front.length, mid: 5 - board.mid.length, back: 5 - board.back.length };
      for (const card of turn.dealt) {
        const row = space.back > 0 ? 'back' : space.mid > 0 ? 'mid' : 'front';
        space[row]--;
        s = gameReducer(s, { type: 'PLACE', seat: turn.seat, cardId: card.id, row });
      }
      s = gameReducer(s, { type: 'CONFIRM', seat: turn.seat });
      void rng;
    }
    expect(order).toEqual(Array.from({ length: 9 }, () => ['human', 'ai']).flat());
    expect(sizes).toEqual([5, 5, ...Array.from({ length: 16 }, () => 1)]);
    expect(s.phase).toBe('scored');
    expect(s.deckPos).toBe(26);
  });
});

describe('full hands played by the AI', () => {
  it.each(['classic', 'pineapple'] as const)('%s: never duplicates a card and always completes', (variant) => {
    for (const seed of seeds) {
      const s = playHand(setupFor(seed, { variant }));
      expect(s.phase).toBe('scored');
      expect(isBoardComplete(s.seats.human.board)).toBe(true);
      expect(isBoardComplete(s.seats.ai.board)).toBe(true);
      const ids = allCardIds(s);
      expect(new Set(ids).size).toBe(ids.length);
      // dealt cards = board + discards, and equals the deck position
      expect(ids.length).toBe(s.deckPos);
      expect(s.result?.points.human).toBe(-(s.result?.points.ai ?? 0) || 0);
    }
  });

  it('pineapple deals 5 + 4x3 per player and discards 4 cards each', () => {
    const s = playHand(setupFor('pine', { variant: 'pineapple' }));
    expect(s.seats.human.discards).toHaveLength(4);
    expect(s.seats.ai.discards).toHaveLength(4);
    expect(s.deckPos).toBe(34);
    expect(boardCount(s.seats.human.board)).toBe(13);
  });

  it('is deterministic: same seed and same decisions give the same outcome', () => {
    const a = playHand(setupFor('det-1'));
    const b = playHand(setupFor('det-1'));
    expect(a.result).toEqual(b.result);
    expect(a.log).toEqual(b.log);
  });

  it('replaying the action log reproduces the final state exactly', () => {
    for (const variant of ['classic', 'pineapple'] as const) {
      const played = playHand(setupFor('replay-me', { variant }));
      expect(replay(played.log)).toEqual(played);
    }
  });
});

describe('legality: bad actions are ignored and return the same state object', () => {
  const base = start(setupFor('legal'));
  const turn = base.turn;
  if (!turn) throw new Error('no turn');
  const [c0] = turn.dealt;
  if (!c0) throw new Error('no card');

  it('wrong seat', () => {
    expect(gameReducer(base, { type: 'PLACE', seat: 'ai', cardId: c0.id, row: 'back' })).toBe(base);
  });

  it('card not in hand', () => {
    const outside = base.deck[30];
    if (!outside) throw new Error('deck too short');
    expect(gameReducer(base, { type: 'PLACE', seat: 'human', cardId: outside.id, row: 'back' })).toBe(base);
  });

  it('confirm before everything is placed', () => {
    expect(gameReducer(base, { type: 'CONFIRM', seat: 'human' })).toBe(base);
  });

  it('discarding in classic', () => {
    expect(gameReducer(base, { type: 'DISCARD', seat: 'human', cardId: c0.id })).toBe(base);
  });

  it('placing in a full row', () => {
    let s = base;
    for (const card of turn.dealt.slice(0, 3)) {
      s = gameReducer(s, { type: 'PLACE', seat: 'human', cardId: card.id, row: 'front' });
    }
    const fourth = turn.dealt[3];
    if (!fourth) throw new Error('no 4th');
    expect(gameReducer(s, { type: 'PLACE', seat: 'human', cardId: fourth.id, row: 'front' })).toBe(s);
  });

  it('placing the same card twice', () => {
    const once = gameReducer(base, { type: 'PLACE', seat: 'human', cardId: c0.id, row: 'back' });
    expect(gameReducer(once, { type: 'PLACE', seat: 'human', cardId: c0.id, row: 'mid' })).toBe(once);
  });

  it('a duplicate CONFIRM (double click) does not deal twice', () => {
    let s = base;
    for (const card of turn.dealt) {
      s = gameReducer(s, { type: 'PLACE', seat: 'human', cardId: card.id, row: card === turn.dealt[0] ? 'front' : 'back' });
    }
    // 5 cards: 1 front + 4 back
    const confirmed = gameReducer(s, { type: 'CONFIRM', seat: 'human' });
    expect(confirmed.turn?.seat).toBe('ai');
    const pos = confirmed.deckPos;
    expect(gameReducer(confirmed, { type: 'CONFIRM', seat: 'human' })).toBe(confirmed);
    expect(confirmed.deckPos).toBe(pos);
  });

  it('actions before a hand starts or after it is scored are ignored', () => {
    const idle = gameReducer(start(setupFor('x')), { type: 'START_HAND', setup: setupFor('x') });
    expect(idle.phase).toBe('placing');
    const done = playHand(setupFor('legal-done'));
    const noop = gameReducer(done, { type: 'CONFIRM', seat: 'human' });
    expect(noop).toBe(done);
  });
});

describe('staged placement: undo and move before confirming', () => {
  it('UNDO returns the card to the hand in deal order', () => {
    const s0 = start(setupFor('undo'));
    const dealt = s0.turn?.dealt ?? [];
    const [a, b, c] = dealt;
    if (!a || !b || !c) throw new Error('short deal');
    let s = gameReducer(s0, { type: 'PLACE', seat: 'human', cardId: b.id, row: 'back' });
    s = gameReducer(s, { type: 'PLACE', seat: 'human', cardId: a.id, row: 'mid' });
    s = gameReducer(s, { type: 'UNDO', seat: 'human', cardId: b.id });
    expect(s.seats.human.board.back).toHaveLength(0);
    expect(s.seats.human.held.map((x) => x.id)).toEqual(dealt.filter((x) => x.id !== a.id).map((x) => x.id));
    expect(s.turn?.placed).toEqual([{ cardId: a.id, row: 'mid' }]);
  });

  it('MOVE re-places a staged card on another row', () => {
    const s0 = start(setupFor('move'));
    const a = s0.turn?.dealt[0];
    if (!a) throw new Error('no card');
    let s = gameReducer(s0, { type: 'PLACE', seat: 'human', cardId: a.id, row: 'back' });
    s = gameReducer(s, { type: 'MOVE', seat: 'human', cardId: a.id, row: 'front' });
    expect(s.seats.human.board.back).toHaveLength(0);
    expect(s.seats.human.board.front.map((x) => x.id)).toEqual([a.id]);
  });

  it('MOVE into a full row is rejected and leaves the card where it was', () => {
    const s0 = start(setupFor('move-full'));
    const dealt = s0.turn?.dealt ?? [];
    let s = s0;
    for (const card of dealt.slice(0, 3)) {
      s = gameReducer(s, { type: 'PLACE', seat: 'human', cardId: card.id, row: 'front' });
    }
    const fourth = dealt[3];
    if (!fourth) throw new Error('no 4th');
    s = gameReducer(s, { type: 'PLACE', seat: 'human', cardId: fourth.id, row: 'back' });
    expect(gameReducer(s, { type: 'MOVE', seat: 'human', cardId: fourth.id, row: 'front' })).toBe(s);
  });

  it('confirmed cards can no longer be undone', () => {
    const s0 = start(setupFor('locked'));
    const plan = s0.turn?.dealt ?? [];
    let s = s0;
    for (const card of plan) {
      s = gameReducer(s, { type: 'PLACE', seat: 'human', cardId: card.id, row: card === plan[0] ? 'front' : 'back' });
    }
    s = gameReducer(s, { type: 'CONFIRM', seat: 'human' });
    const first = plan[0];
    if (!first) throw new Error('no card');
    expect(gameReducer(s, { type: 'UNDO', seat: 'human', cardId: first.id })).toBe(s);
  });
});

describe('Pineapple turns', () => {
  it('requires placing 2 and discarding 1; confirm only works when both are done', () => {
    let s = start(setupFor('pine-turn', { variant: 'pineapple' }, undefined, 'ai'));
    // opening 5 cards (human), then AI, then human gets 3
    for (let i = 0; i < 2; i++) {
      const t = s.turn;
      if (!t) throw new Error('no turn');
      const plan = [
        ...t.dealt.map((c, idx) => ({ type: 'PLACE', seat: t.seat, cardId: c.id, row: idx === 0 ? 'front' : idx < 3 ? 'mid' : 'back' }) as Action),
        { type: 'CONFIRM', seat: t.seat } as Action,
      ];
      s = plan.reduce(gameReducer, s);
    }
    const t = s.turn;
    expect(t?.seat).toBe('human');
    expect(t?.need).toEqual({ place: 2, discard: 1 });
    const [a, b, c] = t?.dealt ?? [];
    if (!a || !b || !c) throw new Error('short');
    s = gameReducer(s, { type: 'PLACE', seat: 'human', cardId: a.id, row: 'back' });
    s = gameReducer(s, { type: 'PLACE', seat: 'human', cardId: b.id, row: 'back' });
    expect(gameReducer(s, { type: 'PLACE', seat: 'human', cardId: c.id, row: 'mid' })).toBe(s); // no third placement
    expect(gameReducer(s, { type: 'CONFIRM', seat: 'human' })).toBe(s); // discard still missing
    s = gameReducer(s, { type: 'DISCARD', seat: 'human', cardId: c.id });
    const done = gameReducer(s, { type: 'CONFIRM', seat: 'human' });
    expect(done.seats.human.discards.map((x) => x.id)).toEqual([c.id]);
    expect(done.turn?.seat).toBe('ai');
  });

  it('an undone discard returns to the hand', () => {
    let s = start(setupFor('pine-undo', { variant: 'pineapple' }, undefined, 'ai'));
    for (let i = 0; i < 2; i++) {
      const t = s.turn;
      if (!t) throw new Error('no turn');
      s = [
        ...t.dealt.map((c, idx) => ({ type: 'PLACE', seat: t.seat, cardId: c.id, row: idx === 0 ? 'front' : idx < 3 ? 'mid' : 'back' }) as Action),
        { type: 'CONFIRM', seat: t.seat } as Action,
      ].reduce(gameReducer, s);
    }
    const c = s.turn?.dealt[2];
    if (!c) throw new Error('no card');
    s = gameReducer(s, { type: 'DISCARD', seat: 'human', cardId: c.id });
    expect(s.seats.human.held.map((x) => x.id)).not.toContain(c.id);
    s = gameReducer(s, { type: 'UNDO', seat: 'human', cardId: c.id });
    expect(s.seats.human.held.map((x) => x.id)).toContain(c.id);
    expect(s.turn?.discarded).toEqual([]);
  });
});

describe('Fantasyland hands', () => {
  it('deals the whole hand at once and lets the opponent play normally afterwards', () => {
    let s = start(setupFor('fl', {}, { human: 14, ai: 0 }, 'ai'));
    expect(s.turn?.seat).toBe('human');
    expect(s.turn?.dealt).toHaveLength(14);
    expect(s.turn?.need).toEqual({ place: 13, discard: 1 });
    expect(s.seats.human.fantasyland).toBe(14);
    const dealt = s.turn?.dealt ?? [];
    const rows = ['front', 'front', 'front', 'mid', 'mid', 'mid', 'mid', 'mid', 'back', 'back', 'back', 'back', 'back'] as const;
    dealt.slice(0, 13).forEach((c, i) => {
      s = gameReducer(s, { type: 'PLACE', seat: 'human', cardId: c.id, row: rows[i] ?? 'back' });
    });
    const last = dealt[13];
    if (!last) throw new Error('no 14th');
    s = gameReducer(s, { type: 'DISCARD', seat: 'human', cardId: last.id });
    s = gameReducer(s, { type: 'CONFIRM', seat: 'human' });
    expect(s.turn?.seat).toBe('ai');
    expect(s.seats.human.plan).toHaveLength(1);
  });

  it('hides a Fantasyland board from the opponent until the hand is scored', () => {
    const s = playHand(setupFor('fl-hide', {}, { human: 14, ai: 0 }, 'ai'));
    expect(s.phase).toBe('scored');
    // mid-hand: replay the first confirmed human turn and inspect the AI's view
    let mid = start(setupFor('fl-hide', {}, { human: 14, ai: 0 }, 'ai'));
    const t = mid.turn;
    if (!t) throw new Error('no turn');
    const first = t.dealt[0];
    if (!first) throw new Error('no card');
    mid = gameReducer(mid, { type: 'PLACE', seat: 'human', cardId: first.id, row: 'back' });
    const aiView = viewFor(mid, 'ai');
    expect(aiView.oppBoardHidden).toBe(true);
    expect(boardCards(aiView.oppBoard)).toHaveLength(0);
    expect(viewFor(mid, 'human').oppBoardHidden).toBe(false);
  });

  it('both players can be in Fantasyland at once', () => {
    const s = playHand(setupFor('fl-both', {}, { human: 14, ai: 15 }, 'ai'));
    expect(s.phase).toBe('scored');
    expect(s.seats.human.discards).toHaveLength(1);
    expect(s.seats.ai.discards).toHaveLength(2);
    expect(isBoardComplete(s.seats.human.board)).toBe(true);
    expect(isBoardComplete(s.seats.ai.board)).toBe(true);
    const ids = allCardIds(s);
    expect(new Set(ids).size).toBe(ids.length);
    expect(s.deckPos).toBe(29);
  });

  it('records the next Fantasyland counts when scored', () => {
    let found = false;
    for (let i = 0; i < 400 && !found; i++) {
      const s = playHand(setupFor(`fl-carry-${i}`, { fantasyland: 'progressive' }));
      const { human, ai } = s.fantasylandNext;
      if (human > 0 || ai > 0) found = true;
      expect([0, 14, 15, 16, 17]).toContain(human);
      expect([0, 14, 15, 16, 17]).toContain(ai);
    }
    expect(found).toBe(true);
  });

  it('never grants Fantasyland when the mode is off', () => {
    for (let i = 0; i < 100; i++) {
      const s = playHand(setupFor(`fl-off-${i}`, { fantasyland: 'off' }));
      expect(s.fantasylandNext).toEqual({ human: 0, ai: 0 });
    }
  });
});

describe('action helper sanity', () => {
  it('planToActions ends each turn with CONFIRM', () => {
    const actions = planToActions('human', { placements: [{ cardId: '2h', row: 'front' }], discards: ['3h'] });
    expect(actions.map((a) => a.type)).toEqual(['PLACE', 'DISCARD', 'CONFIRM']);
  });
});
