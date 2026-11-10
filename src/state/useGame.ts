import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { chooseTurn, planToActions } from '../ai';
import {
  createRng,
  randomSeed,
  viewFor,
  type GameConfig,
  type GameState,
  type RowName,
  type Session,
} from '../engine';
import { appReducer, initialAppState, type AppState } from './appReducer';

/** Pause before the CPU starts a turn, and between each of its moves. */
const AI_THINK_MS = 700;
const AI_STEP_MS = 260;

export interface GameApi {
  game: GameState;
  session: Session;
  place: (cardId: string, row: RowName) => void;
  move: (cardId: string, row: RowName) => void;
  discard: (cardId: string) => void;
  undo: (cardId: string) => void;
  confirm: () => void;
  deal: () => void;
  setConfig: (patch: Partial<GameConfig>) => void;
  newSession: () => void;
}

/**
 * Connects the pure game state to React. The only timers in the app live here: the CPU's
 * "thinking" delay and the pacing of its moves. The CPU's plan is decided from the latest
 * state at the moment the timer fires, guarded by the turn it was scheduled for.
 */
export const useGame = (initial?: AppState): GameApi => {
  const [app, dispatch] = useReducer(appReducer, undefined, () => initial ?? initialAppState(randomSeed()));
  const { game, session } = app;

  const gameRef = useRef(game);
  gameRef.current = game;

  const turn = game.turn;
  const aiTurnKey =
    game.phase === 'placing' && turn?.seat === 'ai' ? `${game.setup?.seed}#${turn.street}` : null;

  useEffect(() => {
    if (aiTurnKey === null) return;
    let cancelled = false;
    const timers: number[] = [];

    timers.push(
      window.setTimeout(() => {
        const g = gameRef.current;
        const t = g.turn;
        if (!t || t.seat !== 'ai' || `${g.setup?.seed}#${t.street}` !== aiTurnKey) return;
        const rng = createRng(`${aiTurnKey}:ai`);
        const plan = chooseTurn(viewFor(g, 'ai'), rng);
        planToActions('ai', plan).forEach((action, i) => {
          timers.push(
            window.setTimeout(() => {
              if (!cancelled) dispatch({ type: 'GAME', action });
            }, i * AI_STEP_MS),
          );
        });
      }, AI_THINK_MS),
    );

    return () => {
      cancelled = true;
      timers.forEach(window.clearTimeout);
    };
  }, [aiTurnKey]);

  const place = useCallback(
    (cardId: string, row: RowName) =>
      dispatch({ type: 'GAME', action: { type: 'PLACE', seat: 'human', cardId, row } }),
    [],
  );
  const move = useCallback(
    (cardId: string, row: RowName) =>
      dispatch({ type: 'GAME', action: { type: 'MOVE', seat: 'human', cardId, row } }),
    [],
  );
  const discard = useCallback(
    (cardId: string) =>
      dispatch({ type: 'GAME', action: { type: 'DISCARD', seat: 'human', cardId } }),
    [],
  );
  const undo = useCallback(
    (cardId: string) => dispatch({ type: 'GAME', action: { type: 'UNDO', seat: 'human', cardId } }),
    [],
  );
  const confirm = useCallback(
    () => dispatch({ type: 'GAME', action: { type: 'CONFIRM', seat: 'human' } }),
    [],
  );
  const deal = useCallback(() => dispatch({ type: 'DEAL' }), []);
  const setConfig = useCallback(
    (patch: Partial<GameConfig>) => dispatch({ type: 'CONFIG', patch }),
    [],
  );
  const newSession = useCallback(() => dispatch({ type: 'NEW_SESSION', seed: randomSeed() }), []);

  return useMemo(
    () => ({ game, session, place, move, discard, undo, confirm, deal, setConfig, newSession }),
    [game, session, place, move, discard, undo, confirm, deal, setConfig, newSession],
  );
};
