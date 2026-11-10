import { chooseTurn, planToActions } from '../../src/ai';
import { viewFor } from '../../src/engine';
import { appReducer, type AppState } from '../../src/state/appReducer';

/** Plays the current hand to the end with the Easy AI on both seats, through the app reducer. */
export const playOut = (start: AppState, at = 1_700_000_000_000): AppState => {
  let app = start;
  for (let guard = 0; app.game.phase === 'placing' && guard < 100; guard++) {
    const turn = app.game.turn;
    if (!turn) break;
    const plan = chooseTurn(viewFor(app.game, turn.seat), {
      difficulty: 'easy',
      seed: `app-test#${turn.seat}#${turn.street}`,
    });
    for (const action of planToActions(turn.seat, plan)) {
      app = appReducer(app, { type: 'GAME', action, at });
    }
  }
  return app;
};

/** Deals and plays `hands` complete hands. */
export const playHands = (start: AppState, hands: number): AppState => {
  let app = start;
  for (let i = 0; i < hands; i++) app = playOut(appReducer(app, { type: 'DEAL' }), 1_700_000_000_000 + i);
  return app;
};

/** An in-memory stand-in for localStorage. */
export const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
};
