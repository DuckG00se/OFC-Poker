import { describe, expect, it } from 'vitest';
import { chooseTurn, planToActions } from '../../src/ai';
import { viewFor, STARTING_BANKROLL } from '../../src/engine';
import { appReducer, initialAppState, type AppState } from '../../src/state/appReducer';

/** Plays the current hand to the end with the AI on both seats, through the app reducer. */
const playOut = (start: AppState): AppState => {
  let app = start;
  for (let guard = 0; app.game.phase === 'placing' && guard < 100; guard++) {
    const turn = app.game.turn;
    if (!turn) break;
    const plan = chooseTurn(viewFor(app.game, turn.seat), {
      difficulty: 'easy',
      seed: `app-test#${turn.seat}#${turn.street}`,
    });
    for (const action of planToActions(turn.seat, plan)) {
      app = appReducer(app, { type: 'GAME', action });
    }
  }
  return app;
};

describe('appReducer', () => {
  it('starts idle with the starting bankroll', () => {
    const app = initialAppState('s');
    expect(app.game.phase).toBe('idle');
    expect(app.session.bankroll).toBe(STARTING_BANKROLL);
  });

  it('DEAL starts a hand; dealing again mid-hand does nothing', () => {
    const dealt = appReducer(initialAppState('s'), { type: 'DEAL' });
    expect(dealt.game.phase).toBe('placing');
    expect(appReducer(dealt, { type: 'DEAL' })).toBe(dealt);
  });

  it('settles the bankroll exactly once per hand: points x stake', () => {
    const app = playOut(appReducer(initialAppState('settle'), { type: 'DEAL' }));
    expect(app.game.phase).toBe('scored');
    const points = app.game.result?.points.human ?? NaN;
    expect(app.session.bankroll).toBe(STARTING_BANKROLL + points * app.session.config.stake);
    expect(app.session.handsPlayed).toBe(1);
    expect(app.session.handNo).toBe(2);
    // Stray actions after scoring (late timers, double clicks) must not settle again.
    const stray = appReducer(app, { type: 'GAME', action: { type: 'CONFIRM', seat: 'human' } });
    expect(stray).toBe(app);
    expect(stray.session.bankroll).toBe(app.session.bankroll);
  });

  it('flips the dealer each hand and uses a fresh seed', () => {
    const first = playOut(appReducer(initialAppState('flip'), { type: 'DEAL' }));
    const second = appReducer(first, { type: 'DEAL' });
    expect(second.game.setup?.button).not.toBe(first.game.setup?.button);
    expect(second.game.setup?.seed).not.toBe(first.game.setup?.seed);
    expect(second.game.deck.map((c) => c.id)).not.toEqual(first.game.deck.map((c) => c.id));
  });

  it('bankroll after many hands equals the sum of every hand result x stake', () => {
    let app = initialAppState('many');
    let expected = STARTING_BANKROLL;
    for (let i = 0; i < 25; i++) {
      app = playOut(appReducer(app, { type: 'DEAL' }));
      expected += (app.game.result?.points.human ?? 0) * app.session.config.stake;
    }
    expect(app.session.bankroll).toBe(expected);
    expect(app.session.handsPlayed).toBe(25);
  });

  it('CONFIG changes are ignored mid-hand and apply between hands', () => {
    const dealt = appReducer(initialAppState('cfg'), { type: 'DEAL' });
    expect(appReducer(dealt, { type: 'CONFIG', patch: { stake: 50 } })).toBe(dealt);
    const done = playOut(dealt);
    const changed = appReducer(done, { type: 'CONFIG', patch: { stake: 50, variant: 'pineapple' } });
    expect(changed.session.config).toMatchObject({ stake: 50, variant: 'pineapple' });
    const next = appReducer(changed, { type: 'DEAL' });
    expect(next.game.seats.human.plan).toHaveLength(5); // Pineapple: 5 + 4 deals
  });

  it('turning Fantasyland off clears any carried Fantasyland', () => {
    const base = initialAppState('fl-off');
    const withFl: AppState = {
      ...base,
      session: { ...base.session, fantasyland: { human: 14, ai: 0 } },
    };
    const off = appReducer(withFl, { type: 'CONFIG', patch: { fantasyland: 'off' } });
    expect(off.session.fantasyland).toEqual({ human: 0, ai: 0 });
  });

  it('NEW_SESSION resets the bankroll and keeps the settings', () => {
    const app = playOut(appReducer(initialAppState('n1'), { type: 'DEAL' }));
    const configured = appReducer(app, { type: 'CONFIG', patch: { stake: 25 } });
    const fresh = appReducer(configured, { type: 'NEW_SESSION', seed: 'n2' });
    expect(fresh.session.bankroll).toBe(STARTING_BANKROLL);
    expect(fresh.session.config.stake).toBe(25);
    expect(fresh.game.phase).toBe('idle');
  });
});
