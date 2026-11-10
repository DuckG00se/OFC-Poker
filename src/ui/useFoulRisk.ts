import { useEffect, useMemo, useRef, useState } from 'react';
import { AiClient } from '../ai';
import {
  foulStatus,
  isBoardComplete,
  viewFor,
  type DealStep,
  type FoulStatus,
  type GameState,
} from '../engine';

export interface FoulRisk {
  status: FoulStatus;
  /** Estimated chance of fouling (0-1), or null while it is being worked out / not available. */
  risk: number | null;
}

const SIMS = 160;
const DEBOUNCE_MS = 140;

/**
 * Foul warning for the player's board. "Certain" and "fouled" are proven instantly on the
 * main thread; the percentage comes from random playouts in a Web Worker (its own, so it
 * never competes with the CPU's thinking) and updates as cards are staged.
 */
export const useFoulRisk = (game: GameState, enabled: boolean): FoulRisk => {
  const view = useMemo(() => viewFor(game, 'human'), [game]);
  const board = view.myBoard;
  const inFantasyland = view.myFantasyland > 0;
  const active = enabled && game.phase === 'placing';

  const status = useMemo<FoulStatus>(
    () => (active || game.phase === 'scored' ? foulStatus(board, [...view.unseen, ...view.held]) : 'open'),
    [active, game.phase, board, view.unseen, view.held],
  );

  const key = useMemo(() => {
    const ids = (cards: readonly { id: string }[]): string => cards.map((c) => c.id).join(',');
    return `${ids(board.front)}|${ids(board.mid)}|${ids(board.back)}|${ids(view.held)}`;
  }, [board, view.held]);

  const [estimate, setEstimate] = useState<{ key: string; risk: number } | null>(null);
  const clientRef = useRef<AiClient | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(
    () => () => {
      clientRef.current?.dispose();
      clientRef.current = null;
    },
    [],
  );

  const simulate = active && status === 'open' && !inFantasyland && !isBoardComplete(board);
  const seed = game.setup?.seed ?? '';

  useEffect(() => {
    if (!simulate) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const v = viewRef.current;
      const turn = v.turn;
      const current: DealStep[] =
        turn && v.held.length > 0
          ? [{ deal: v.held.length, place: turn.need.place - turn.placed.length }]
          : [];
      clientRef.current ??= new AiClient();
      clientRef.current
        .foulRisk({
          board: v.myBoard,
          held: v.held,
          steps: [...current, ...v.myRemaining],
          unseen: v.unseen,
          sims: SIMS,
          seed: `${seed}:${key}`,
        })
        .then((result) => {
          if (!cancelled) setEstimate({ key, risk: result.risk });
        })
        .catch(() => {
          // Disposed or cancelled: nothing to show.
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [simulate, key, seed]);

  const risk =
    status === 'fouled' || status === 'certain'
      ? 1
      : status === 'safe'
        ? 0
        : simulate && estimate?.key === key
          ? estimate.risk
          : null;
  return { status, risk };
};
