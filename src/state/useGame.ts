import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AiClient, planToActions } from '../ai';
import {
  randomSeed,
  viewFor,
  type Difficulty,
  type GameConfig,
  type GameState,
  type RowName,
  type Session,
} from '../engine';
import { appReducer, initialAppState, type AppState } from './appReducer';
import type { HandRecord, LifetimeStats } from './stats';

/** Minimum "thinking" time before the CPU moves, so pacing feels natural at every level. */
const THINK_BASE_MS: Readonly<Record<Difficulty, number>> = { easy: 500, medium: 800, hard: 1100 };
/** Pause between the CPU's individual placements within one turn. */
const AI_STEP_MS = 260;

const jitter = (key: string): number => {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return (h >>> 0) % 350;
};

export interface AiNote {
  text: string;
  /** Hand the note belongs to, so a stale note never shows on the next hand. */
  handSeed: string;
}

export interface GameApi {
  /** The whole persistent state (for saving). */
  app: AppState;
  game: GameState;
  session: Session;
  stats: LifetimeStats;
  history: readonly HandRecord[];
  achievements: Readonly<Record<string, number>>;
  /** Achievements unlocked by the hand that was just scored. */
  unlocked: readonly string[];
  /** True while the CPU is choosing or making its move. */
  aiThinking: boolean;
  /** The CPU's explanation of its latest notable move, if it gave one. */
  aiNote: AiNote | null;
  place: (cardId: string, row: RowName) => void;
  move: (cardId: string, row: RowName) => void;
  discard: (cardId: string) => void;
  undo: (cardId: string) => void;
  confirm: () => void;
  deal: () => void;
  setConfig: (patch: Partial<GameConfig>) => void;
  newSession: () => void;
  /** Wipe everything: bankroll, stats, history and achievements. */
  resetAll: () => void;
}

/**
 * Connects the pure game state to React. The only timers in the app live here: the CPU's
 * "thinking" delay and the pacing of its moves. The CPU decides in a Web Worker, started the
 * moment its turn begins so thinking overlaps the pause, and everything it was asked is
 * guarded by the turn it was scheduled for.
 */
export const useGame = (initial?: AppState): GameApi => {
  const [app, dispatch] = useReducer(
    appReducer,
    undefined,
    () => initial ?? initialAppState(randomSeed()),
  );
  const { game, session } = app;
  const [aiNote, setAiNote] = useState<AiNote | null>(null);

  const gameRef = useRef(game);
  gameRef.current = game;
  const clientRef = useRef<AiClient | null>(null);

  useEffect(() => {
    clientRef.current = new AiClient();
    return () => {
      clientRef.current?.dispose();
      clientRef.current = null;
    };
  }, []);

  const turn = game.turn;
  const aiTurnKey =
    game.phase === 'placing' && turn?.seat === 'ai' ? `${game.setup?.seed}#${turn.street}` : null;

  useEffect(() => {
    if (aiTurnKey === null) return;
    const g = gameRef.current;
    const client = clientRef.current;
    const setup = g.setup;
    if (!client || !setup || g.turn?.seat !== 'ai') return;

    let cancelled = false;
    const timers: number[] = [];
    const difficulty = setup.config.difficulty;
    const wait = new Promise<void>((resolve) => {
      timers.push(
        window.setTimeout(resolve, THINK_BASE_MS[difficulty] + jitter(aiTurnKey)),
      );
    });

    Promise.all([client.choose(viewFor(g, 'ai'), difficulty, `${aiTurnKey}:ai`), wait])
      .then(([plan]) => {
        if (cancelled) return;
        setAiNote(plan.reason ? { text: plan.reason, handSeed: setup.seed } : null);
        planToActions('ai', plan).forEach((action, i) => {
          timers.push(
            window.setTimeout(() => {
              if (!cancelled) dispatch({ type: 'GAME', action, at: Date.now() });
            }, i * AI_STEP_MS),
          );
        });
      })
      .catch(() => {
        // Cancelled or the client was disposed: nothing to do.
      });

    return () => {
      cancelled = true;
      timers.forEach(window.clearTimeout);
      clientRef.current?.cancelPending();
    };
  }, [aiTurnKey]);

  const place = useCallback(
    (cardId: string, row: RowName) =>
      dispatch({ type: 'GAME', action: { type: 'PLACE', seat: 'human', cardId, row }, at: Date.now() }),
    [],
  );
  const move = useCallback(
    (cardId: string, row: RowName) =>
      dispatch({ type: 'GAME', action: { type: 'MOVE', seat: 'human', cardId, row }, at: Date.now() }),
    [],
  );
  const discard = useCallback(
    (cardId: string) =>
      dispatch({ type: 'GAME', action: { type: 'DISCARD', seat: 'human', cardId }, at: Date.now() }),
    [],
  );
  const undo = useCallback(
    (cardId: string) => dispatch({ type: 'GAME', action: { type: 'UNDO', seat: 'human', cardId }, at: Date.now() }),
    [],
  );
  const confirm = useCallback(
    () => dispatch({ type: 'GAME', action: { type: 'CONFIRM', seat: 'human' }, at: Date.now() }),
    [],
  );
  const deal = useCallback(() => {
    setAiNote(null);
    dispatch({ type: 'DEAL' });
  }, []);
  const setConfig = useCallback(
    (patch: Partial<GameConfig>) => dispatch({ type: 'CONFIG', patch }),
    [],
  );
  const newSession = useCallback(() => {
    setAiNote(null);
    dispatch({ type: 'NEW_SESSION', seed: randomSeed() });
  }, []);

  const resetAll = useCallback(() => {
    setAiNote(null);
    dispatch({ type: 'RESET_ALL', seed: randomSeed() });
  }, []);

  const aiThinking = aiTurnKey !== null;

  return useMemo(
    () => ({
      app,
      game,
      session,
      stats: app.stats,
      history: app.history,
      achievements: app.achievements,
      unlocked: app.unlocked,
      aiThinking,
      aiNote,
      place,
      move,
      discard,
      undo,
      confirm,
      deal,
      setConfig,
      newSession,
      resetAll,
    }),
    [app, game, session, aiThinking, aiNote, place, move, discard, undo, confirm, deal, setConfig, newSession, resetAll],
  );
};
