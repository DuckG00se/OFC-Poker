import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ROW_SIZE, type Card, type GameState, type RowName, type Turn } from '../engine';
import type { GameApi } from '../state/useGame';
import type { DropTarget } from './usePointerDrag';

export interface TurnInteraction {
  /** The human's turn in progress, or null. */
  turn: Turn | null;
  held: readonly Card[];
  selectedId: string | null;
  /** Cards placed this turn (still movable). */
  stagedIds: ReadonlySet<string>;
  stagedDiscards: readonly Card[];
  placesLeft: number;
  discardsLeft: number;
  /** Everything is staged: the turn can be confirmed. */
  complete: boolean;
  canUndo: boolean;
  /** A short message explaining why the last input did nothing. */
  notice: string | null;
  select: (cardId: string) => void;
  clearSelection: () => void;
  cycle: (direction: -1 | 1) => void;
  /** Places a card (the selected one by default) on a row. Returns whether it happened. */
  placeOn: (row: RowName, cardId?: string) => boolean;
  discard: (cardId?: string) => boolean;
  undo: (cardId: string) => void;
  undoLast: () => void;
  confirm: () => void;
  /** Handles a drag-and-drop release. */
  drop: (cardId: string, target: DropTarget) => boolean;
}

const NOTICE_MS = 2600;

/**
 * Everything about how the player stages a turn: selection, tap/drag/keyboard placement,
 * undo order and the little "why did nothing happen" notices. The engine stays the judge of
 * legality; this hook only checks first so it can explain a refusal.
 */
export const useTurnInteraction = (game: GameState, api: GameApi): TurnInteraction => {
  const turn = game.phase === 'placing' && game.turn?.seat === 'human' ? game.turn : null;
  const held = game.seats.human.held;
  const board = game.seats.human.board;
  const turnKey = turn ? `${game.setup?.seed}#${turn.street}` : null;

  const [selectedRaw, setSelectedRaw] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const order = useRef<{ key: string | null; ids: string[] }>({ key: turnKey, ids: [] });
  if (order.current.key !== turnKey) order.current = { key: turnKey, ids: [] };

  useEffect(() => {
    if (notice === null) return;
    const id = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(id);
  }, [notice]);
  useEffect(() => setNotice(null), [turnKey]);

  const stagedIds = useMemo(() => new Set(turn?.placed.map((p) => p.cardId)), [turn]);
  const stagedDiscards = useMemo(
    () => (turn ? turn.dealt.filter((c) => turn.discarded.includes(c.id)) : []),
    [turn],
  );
  const placesLeft = turn ? turn.need.place - turn.placed.length : 0;
  const discardsLeft = turn ? turn.need.discard - turn.discarded.length : 0;
  const complete = turn !== null && placesLeft === 0 && discardsLeft === 0;

  // With a single card left in hand there is nothing to choose: treat it as selected.
  const explicit = selectedRaw && held.some((c) => c.id === selectedRaw) ? selectedRaw : null;
  const selectedId = turn ? (explicit ?? (held.length === 1 ? (held[0]?.id ?? null) : null)) : null;

  const remember = (cardId: string): void => {
    order.current.ids = [...order.current.ids.filter((id) => id !== cardId), cardId];
  };
  const forget = (cardId: string): void => {
    order.current.ids = order.current.ids.filter((id) => id !== cardId);
  };

  const placeOn = useCallback(
    (row: RowName, cardId?: string): boolean => {
      if (!turn) return false;
      const id = cardId ?? selectedId;
      if (!id) {
        setNotice('Pick a card first.');
        return false;
      }
      const staged = turn.placed.find((p) => p.cardId === id);
      if (staged?.row === row) return false;
      if (board[row].length >= ROW_SIZE[row]) {
        setNotice('That row is full.');
        return false;
      }
      if (staged) {
        api.move(id, row);
      } else {
        if (!held.some((c) => c.id === id)) return false;
        if (placesLeft <= 0) {
          setNotice(
            turn.need.discard > 0
              ? 'You have placed your cards: discard the last one, or take a card back.'
              : 'You have placed your cards: confirm, or take a card back.',
          );
          return false;
        }
        api.place(id, row);
      }
      remember(id);
      setSelectedRaw(null);
      setNotice(null);
      return true;
    },
    [turn, selectedId, board, held, placesLeft, api],
  );

  const discard = useCallback(
    (cardId?: string): boolean => {
      if (!turn) return false;
      const id = cardId ?? selectedId;
      if (turn.need.discard === 0) return false;
      if (!id) {
        setNotice('Pick the card to discard first.');
        return false;
      }
      if (discardsLeft <= 0) {
        setNotice('You have already chosen your discard: tap it to take it back.');
        return false;
      }
      if (turn.placed.some((p) => p.cardId === id)) api.undo(id);
      else if (!held.some((c) => c.id === id)) return false;
      api.discard(id);
      remember(id);
      setSelectedRaw(null);
      setNotice(null);
      return true;
    },
    [turn, selectedId, discardsLeft, held, api],
  );

  const undo = useCallback(
    (cardId: string): void => {
      api.undo(cardId);
      forget(cardId);
      setNotice(null);
    },
    [api],
  );

  const undoLast = useCallback((): void => {
    // After a refresh the staging order is gone; fall back to the engine's own record.
    const last =
      order.current.ids[order.current.ids.length - 1] ??
      turn?.placed[turn.placed.length - 1]?.cardId ??
      turn?.discarded[turn.discarded.length - 1];
    if (last) undo(last);
  }, [undo, turn]);

  const select = useCallback(
    (cardId: string) => setSelectedRaw((cur) => (cur === cardId ? null : cardId)),
    [],
  );
  const clearSelection = useCallback(() => setSelectedRaw(null), []);

  const cycle = useCallback(
    (direction: -1 | 1): void => {
      if (held.length === 0) return;
      const index = held.findIndex((c) => c.id === selectedId);
      const next = held[(index + direction + held.length) % held.length] ?? held[0];
      if (next) setSelectedRaw(next.id);
    },
    [held, selectedId],
  );

  const confirm = useCallback((): void => {
    if (!turn) return;
    if (!complete) {
      setNotice(
        placesLeft > 0
          ? `Place ${placesLeft} more card${placesLeft === 1 ? '' : 's'} first.`
          : 'Choose your discard first.',
      );
      return;
    }
    api.confirm();
  }, [turn, complete, placesLeft, api]);

  const drop = useCallback(
    (cardId: string, target: DropTarget): boolean => {
      if (!turn) return false;
      if (target.kind === 'row') return placeOn(target.row, cardId);
      if (target.kind === 'discard') return discard(cardId);
      // Dropped back on the hand: take a staged card back.
      if (turn.placed.some((p) => p.cardId === cardId) || turn.discarded.includes(cardId)) {
        undo(cardId);
        return true;
      }
      return false;
    },
    [turn, placeOn, discard, undo],
  );

  return {
    turn,
    held,
    selectedId,
    stagedIds,
    stagedDiscards,
    placesLeft,
    discardsLeft,
    complete,
    canUndo: turn !== null && turn.placed.length + turn.discarded.length > 0,
    notice,
    select,
    clearSelection,
    cycle,
    placeOn,
    discard,
    undo,
    undoLast,
    confirm,
    drop,
  };
};
