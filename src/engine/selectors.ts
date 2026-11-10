import { createDeck } from './deck';
import { boardCards, emptyBoard } from './foul';
import {
  ROW_NAMES,
  ROW_SIZE,
  otherSeat,
  type Board,
  type Card,
  type DealStep,
  type GameConfig,
  type GameState,
  type Placement,
  type RowName,
  type Seat,
  type Turn,
} from './types';

/**
 * Everything one seat is allowed to know. Notably absent: the deck order, the opponent's hand
 * and discards, and the opponent's board while they are in Fantasyland and have not finished.
 */
export interface PlayerView {
  seat: Seat;
  config: GameConfig;
  myBoard: Board;
  oppBoard: Board;
  /** True if the opponent's board is still hidden from this seat. */
  oppBoardHidden: boolean;
  /** Cards in hand this turn that are still to be placed or discarded. */
  held: readonly Card[];
  /** This seat's own confirmed discards. */
  myDiscards: readonly Card[];
  /** Cards staged for discard this turn. */
  stagedDiscards: readonly Card[];
  oppDiscardCount: number;
  /** Deals still to come for this seat after the current turn (empty when done). */
  myRemaining: readonly DealStep[];
  /** Deals the opponent still has to make; their board is incomplete until they are done. */
  oppRemaining: readonly DealStep[];
  turn: Turn | null;
  myFantasyland: number;
  oppFantasyland: number;
  /** Cards this seat cannot see anywhere: the pool unknown cards are drawn from. */
  unseen: readonly Card[];
}

export const viewFor = (state: GameState, seat: Seat): PlayerView => {
  const opp = otherSeat(seat);
  const mine = state.seats[seat];
  const theirs = state.seats[opp];
  const setup = state.setup;
  const oppHidden = state.phase === 'placing' && theirs.fantasyland > 0;
  const turn = state.turn;
  const stagedIds = turn && turn.seat === seat ? turn.discarded : [];
  const stagedDiscards = turn ? turn.dealt.filter((c) => stagedIds.includes(c.id)) : [];

  const seen = new Set<string>();
  for (const c of boardCards(mine.board)) seen.add(c.id);
  for (const c of mine.held) seen.add(c.id);
  for (const c of mine.discards) seen.add(c.id);
  for (const c of stagedDiscards) seen.add(c.id);
  if (!oppHidden) for (const c of boardCards(theirs.board)) seen.add(c.id);

  return {
    seat,
    config: setup?.config ?? {
      variant: 'classic',
      fantasyland: 'off',
      difficulty: 'medium',
      stake: 1,
    },
    myBoard: mine.board,
    oppBoard: oppHidden ? emptyBoard() : theirs.board,
    oppBoardHidden: oppHidden,
    held: mine.held,
    myDiscards: mine.discards,
    stagedDiscards,
    oppDiscardCount: theirs.discards.length,
    myRemaining: mine.plan.slice(mine.street + (turn && turn.seat === seat ? 1 : 0)),
    oppRemaining: theirs.plan.slice(theirs.street + (turn && turn.seat === opp ? 1 : 0)),
    turn: turn && turn.seat === seat ? turn : null,
    myFantasyland: mine.fantasyland,
    oppFantasyland: theirs.fantasyland,
    unseen: createDeck().filter((c) => !seen.has(c.id)),
  };
};

export interface TurnOption {
  placements: Placement[];
  discards: string[];
}

/**
 * Every legal way to finish the current turn: which held cards go to which rows, and which
 * are discarded. Used by the AI. Fantasyland turns (13+ cards) are too large to enumerate;
 * use a dedicated solver there.
 */
export const legalTurnOptions = (
  board: Board,
  held: readonly Card[],
  need: { place: number; discard: number },
): TurnOption[] => {
  const options: TurnOption[] = [];
  const space: Record<RowName, number> = {
    front: ROW_SIZE.front - board.front.length,
    mid: ROW_SIZE.mid - board.mid.length,
    back: ROW_SIZE.back - board.back.length,
  };

  const choose = (indexes: number[], size: number, start: number, out: number[][]): void => {
    if (indexes.length === size) {
      out.push([...indexes]);
      return;
    }
    for (let i = start; i < held.length; i++) {
      indexes.push(i);
      choose(indexes, size, i + 1, out);
      indexes.pop();
    }
  };
  const keepSets: number[][] = [];
  choose([], need.place, 0, keepSets);

  for (const keep of keepSets) {
    const discards = held.filter((_, i) => !keep.includes(i)).map((c) => c.id);
    const kept = keep.map((i) => held[i] as Card);
    const assign = (i: number, left: Record<RowName, number>, acc: Placement[]): void => {
      if (i === kept.length) {
        options.push({ placements: [...acc], discards });
        return;
      }
      for (const row of ROW_NAMES) {
        if (left[row] === 0) continue;
        acc.push({ cardId: (kept[i] as Card).id, row });
        assign(i + 1, { ...left, [row]: left[row] - 1 }, acc);
        acc.pop();
      }
    };
    assign(0, space, []);
  }
  return options;
};

/** The board that results from carrying out a set of placements with the cards in hand. */
export const applyPlacements = (
  board: Board,
  held: readonly Card[],
  placements: readonly Placement[],
): Board => {
  const next: Record<RowName, Card[]> = {
    front: [...board.front],
    mid: [...board.mid],
    back: [...board.back],
  };
  for (const p of placements) {
    const card = held.find((c) => c.id === p.cardId);
    if (card) next[p.row].push(card);
  }
  return next;
};
