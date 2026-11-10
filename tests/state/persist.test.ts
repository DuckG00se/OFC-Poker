import { describe, expect, it } from 'vitest';
import { chooseTurn, planToActions } from '../../src/ai';
import { viewFor, replay } from '../../src/engine';
import { appReducer, initialAppState, type AppState } from '../../src/state/appReducer';
import {
  HISTORY_KEY,
  STATE_KEY,
  createSaveWriter,
  loadSave,
  stripPartialCpuTurn,
} from '../../src/state/persist';
import { DEFAULT_PREFS } from '../../src/ui/prefs';
import { memoryStorage, playHands, playOut } from './helpers';

const roundTrip = (app: AppState, prefs = DEFAULT_PREFS) => {
  const storage = memoryStorage();
  createSaveWriter(storage).save(app, prefs);
  return { storage, loaded: loadSave(storage, 'fallback-seed') };
};

describe('save and load', () => {
  it('first launch: nothing stored gives a fresh game', () => {
    const loaded = loadSave(memoryStorage(), 'seed-1');
    expect(loaded.fresh).toBe(true);
    expect(loaded.app.game.phase).toBe('idle');
    expect(loaded.app.session.sessionSeed).toBe('seed-1');
    expect(loaded.prefs).toEqual(DEFAULT_PREFS);
  });

  it('works without any storage at all', () => {
    expect(loadSave(null, 's').fresh).toBe(true);
    expect(() => createSaveWriter(null).save(initialAppState('s'), DEFAULT_PREFS)).not.toThrow();
  });

  it('restores a hand in progress exactly, including cards staged but not confirmed', () => {
    let app = appReducer(initialAppState('mid'), { type: 'DEAL' });
    const [a, b] = app.game.turn?.dealt ?? [];
    if (!a || !b) throw new Error('no cards');
    app = appReducer(app, { type: 'GAME', action: { type: 'PLACE', seat: 'human', cardId: a.id, row: 'back' } });
    app = appReducer(app, { type: 'GAME', action: { type: 'PLACE', seat: 'human', cardId: b.id, row: 'front' } });
    const { loaded } = roundTrip(app);
    expect(loaded.fresh).toBe(false);
    expect(loaded.app.game).toEqual(app.game);
    expect(loaded.app.game.turn?.placed).toHaveLength(2);
    expect(loaded.app.session).toEqual(app.session);
  });

  it('restores bankroll, stats, history and achievements after finished hands', () => {
    const app = playHands(initialAppState('done'), 3);
    const { loaded } = roundTrip(app);
    expect(loaded.app.session.bankroll).toBe(app.session.bankroll);
    expect(loaded.app.stats).toEqual(app.stats);
    expect(loaded.app.achievements).toEqual(app.achievements);
    expect(loaded.app.history).toEqual(app.history);
    // The scored hand is shown again, and is NOT settled a second time.
    expect(loaded.app.game.phase).toBe('scored');
    expect(loaded.app.game.result).toEqual(app.game.result);
    expect(loaded.app.unlocked).toEqual([]);
    const dealt = appReducer(loaded.app, { type: 'DEAL' });
    expect(dealt.session.bankroll).toBe(app.session.bankroll);
    expect(dealt.game.setup?.seed).toBe(`done:4`);
  });

  it('restores preferences, and fills in anything missing with the default', () => {
    const prefs = { ...DEFAULT_PREFS, sound: false, fourColorDeck: true, motion: 'fast' as const, tutorialSeen: true };
    const { storage, loaded } = roundTrip(initialAppState('p'), prefs);
    expect(loaded.prefs).toEqual(prefs);
    const raw = JSON.parse(storage.data.get(STATE_KEY) ?? '{}') as { prefs: Record<string, unknown> };
    delete raw.prefs.helpers;
    raw.prefs.motion = 'warp-speed';
    storage.setItem(STATE_KEY, JSON.stringify(raw));
    const patched = loadSave(storage, 'x').prefs;
    expect(patched.helpers).toEqual(DEFAULT_PREFS.helpers);
    expect(patched.motion).toBe(DEFAULT_PREFS.motion);
    expect(patched.sound).toBe(false);
  });

  it('only rewrites the history when it changes', () => {
    const storage = memoryStorage();
    const writer = createSaveWriter(storage);
    let app = playHands(initialAppState('h'), 1);
    writer.save(app, DEFAULT_PREFS);
    storage.data.set(HISTORY_KEY, 'sentinel');
    app = appReducer(app, { type: 'DEAL' });
    writer.save(app, DEFAULT_PREFS);
    expect(storage.data.get(HISTORY_KEY)).toBe('sentinel'); // untouched: history did not change
    app = playOut(app);
    writer.save(app, DEFAULT_PREFS);
    expect(storage.data.get(HISTORY_KEY)).not.toBe('sentinel');
  });

  it('clear() removes the save', () => {
    const storage = memoryStorage();
    const writer = createSaveWriter(storage);
    writer.save(playHands(initialAppState('c'), 1), DEFAULT_PREFS);
    writer.clear();
    expect(storage.data.size).toBe(0);
  });
});

describe('bad saves never break the game', () => {
  const saved = () => {
    const app = playHands(initialAppState('bad'), 2);
    const mid = appReducer(app, { type: 'DEAL' });
    const storage = memoryStorage();
    createSaveWriter(storage).save(mid, DEFAULT_PREFS);
    return { storage, mid };
  };
  const edit = (storage: ReturnType<typeof memoryStorage>, fn: (raw: Record<string, unknown>) => void) => {
    const raw = JSON.parse(storage.data.get(STATE_KEY) ?? '{}') as Record<string, unknown>;
    fn(raw);
    storage.setItem(STATE_KEY, JSON.stringify(raw));
  };

  it('garbage JSON gives a fresh game', () => {
    const storage = memoryStorage();
    storage.setItem(STATE_KEY, '{"version":1,"session":');
    expect(loadSave(storage, 's').fresh).toBe(true);
  });

  it('an unknown version gives a fresh game', () => {
    const { storage } = saved();
    edit(storage, (raw) => (raw.version = 99));
    expect(loadSave(storage, 's').fresh).toBe(true);
  });

  it('an action log that was tampered with drops the hand but keeps the record', () => {
    const { storage, mid } = saved();
    edit(storage, (raw) => {
      // Claim a card that is not in the hand was placed.
      (raw.log as unknown[]).push({ type: 'PLACE', seat: 'human', cardId: '99x', row: 'back' });
    });
    const loaded = loadSave(storage, 's');
    expect(loaded.app.game.phase).toBe('idle');
    expect(loaded.app.stats).toEqual(mid.stats);
    expect(loaded.app.session.bankroll).toBe(mid.session.bankroll);
  });

  it('a malformed action drops the hand', () => {
    const { storage } = saved();
    edit(storage, (raw) => (raw.log as unknown[]).push({ type: 'TELEPORT' }));
    expect(loadSave(storage, 's').app.game.phase).toBe('idle');
  });

  it('a hand from a different session is not adopted', () => {
    const { storage } = saved();
    edit(storage, (raw) => ((raw.session as Record<string, unknown>).sessionSeed = 'someone-else'));
    expect(loadSave(storage, 's').app.game.phase).toBe('idle');
  });

  it('an invalid session starts a new one but keeps stats, history and preferences', () => {
    const { storage, mid } = saved();
    edit(storage, (raw) => ((raw.session as Record<string, unknown>).bankroll = 'lots'));
    const loaded = loadSave(storage, 'new-seed');
    expect(loaded.app.session.sessionSeed).toBe('new-seed');
    expect(loaded.app.stats).toEqual(mid.stats);
    expect(loaded.app.history).toHaveLength(2);
  });

  it('nonsense stats fall back to zero, field by field', () => {
    const { storage, mid } = saved();
    edit(storage, (raw) => ((raw.stats as Record<string, unknown>).fouls = 'many'));
    const stats = loadSave(storage, 's').app.stats;
    expect(stats.fouls).toBe(0);
    expect(stats.handsPlayed).toBe(mid.stats.handsPlayed);
  });

  it('unknown achievement ids are ignored', () => {
    const { storage } = saved();
    edit(storage, (raw) => ((raw.achievements as Record<string, unknown>)['made-up'] = 1));
    expect(loadSave(storage, 's').app.achievements['made-up']).toBeUndefined();
  });

  it('broken history entries are skipped, good ones kept', () => {
    const { storage } = saved();
    const history = JSON.parse(storage.data.get(HISTORY_KEY) ?? '[]') as unknown[];
    storage.setItem(HISTORY_KEY, JSON.stringify([{ nope: true }, ...history, 42]));
    expect(loadSave(storage, 's').app.history).toHaveLength(2);
  });
});

describe('resuming while the CPU was mid-turn', () => {
  it('drops the unfinished part of the CPU turn so it can decide again', () => {
    // Human acts first; play their turn, then let the CPU place two of its five cards.
    let app = appReducer(initialAppState('cpu-mid'), { type: 'DEAL' });
    const humanTurn = app.game.turn;
    if (!humanTurn) throw new Error('no turn');
    const plan = chooseTurn(viewFor(app.game, 'human'), { difficulty: 'easy', seed: 'h' });
    for (const action of planToActions('human', plan)) app = appReducer(app, { type: 'GAME', action });
    expect(app.game.turn?.seat).toBe('ai');
    const cpuPlan = planToActions('ai', chooseTurn(viewFor(app.game, 'ai'), { difficulty: 'easy', seed: 'c' }));
    for (const action of cpuPlan.slice(0, 2)) app = appReducer(app, { type: 'GAME', action });
    expect(app.game.turn?.placed).toHaveLength(2);

    const { loaded } = roundTrip(app);
    const turn = loaded.app.game.turn;
    expect(turn?.seat).toBe('ai');
    expect(turn?.placed).toHaveLength(0);
    expect(loaded.app.game.seats.ai.held).toHaveLength(5);
    // The human's confirmed cards are untouched.
    expect(loaded.app.game.seats.human.board).toEqual(app.game.seats.human.board);
    // And the CPU can now play the turn normally.
    const again = chooseTurn(viewFor(loaded.app.game, 'ai'), { difficulty: 'easy', seed: 'c' });
    expect(again.placements).toHaveLength(5);
  });

  it('leaves a human turn in progress alone', () => {
    let app = appReducer(initialAppState('human-mid'), { type: 'DEAL' });
    const card = app.game.turn?.dealt[0];
    if (!card) throw new Error('no card');
    app = appReducer(app, { type: 'GAME', action: { type: 'PLACE', seat: 'human', cardId: card.id, row: 'mid' } });
    expect(stripPartialCpuTurn(app.game.log)).toEqual(app.game.log);
    expect(replay(stripPartialCpuTurn(app.game.log))).toEqual(app.game);
  });
});
