import { seededDeck } from './deck';
import { emptyBoard } from './foul';
import { dealPlan } from './plan';
import { nextFantasyland } from './royalties';
import { scoreHand } from './scoring';
import {
  ROW_SIZE,
  otherSeat,
  type Action,
  type Board,
  type Card,
  type GameState,
  type HandSetup,
  type RowName,
  type Seat,
  type SeatState,
  type Turn,
} from './types';

const newSeat = (setup: HandSetup, seat: Seat): SeatState => ({
  board: emptyBoard(),
  held: [],
  discards: [],
  plan: dealPlan(setup.config.variant, setup.fantasyland[seat]),
  street: 0,
  fantasyland: setup.fantasyland[seat],
});

export const initialGameState = (): GameState => ({
  phase: 'idle',
  setup: null,
  deck: [],
  deckPos: 0,
  seats: {
    human: { board: emptyBoard(), held: [], discards: [], plan: [], street: 0, fantasyland: 0 },
    ai: { board: emptyBoard(), held: [], discards: [], plan: [], street: 0, fantasyland: 0 },
  },
  turn: null,
  result: null,
  fantasylandNext: { human: 0, ai: 0 },
  log: [],
});

const withSeat = (state: GameState, seat: Seat, patch: Partial<SeatState>): GameState => ({
  ...state,
  seats: { ...state.seats, [seat]: { ...state.seats[seat], ...patch } },
});

const addToRow = (board: Board, row: RowName, card: Card): Board => ({
  ...board,
  [row]: [...board[row], card],
});

const removeFromRow = (board: Board, row: RowName, cardId: string): Board => ({
  ...board,
  [row]: board[row].filter((c) => c.id !== cardId),
});

/** Which seat acts next and on which street, or null when every plan is complete. */
const nextToAct = (state: GameState): Seat | null => {
  const setup = state.setup;
  if (!setup) return null;
  const first = otherSeat(setup.button); // the seat after the button acts first
  const order: Seat[] = [first, setup.button];
  let best: Seat | null = null;
  for (const seat of order) {
    const s = state.seats[seat];
    if (s.street >= s.plan.length) continue;
    if (best === null || s.street < state.seats[best].street) best = seat;
  }
  return best;
};

/** Deals the next batch to whoever acts next, or scores the hand if nobody has cards left. */
const advance = (state: GameState): GameState => {
  const seat = nextToAct(state);
  const setup = state.setup;
  if (!setup) return state;

  if (seat === null) {
    const result = scoreHand({ human: state.seats.human.board, ai: state.seats.ai.board });
    const fantasylandNext = {
      human: nextFantasyland(
        state.seats.human.board,
        state.seats.human.fantasyland > 0,
        setup.config.fantasyland,
      ),
      ai: nextFantasyland(
        state.seats.ai.board,
        state.seats.ai.fantasyland > 0,
        setup.config.fantasyland,
      ),
    };
    return { ...state, phase: 'scored', turn: null, result, fantasylandNext };
  }

  const s = state.seats[seat];
  const step = s.plan[s.street];
  if (!step) return state;
  const dealt = state.deck.slice(state.deckPos, state.deckPos + step.deal);
  const turn: Turn = {
    seat,
    street: s.street,
    dealt,
    need: { place: step.place, discard: step.deal - step.place },
    placed: [],
    discarded: [],
  };
  return {
    ...withSeat(state, seat, { held: dealt }),
    deckPos: state.deckPos + step.deal,
    turn,
  };
};

const startHand = (setup: HandSetup): GameState => {
  const base: GameState = {
    ...initialGameState(),
    phase: 'placing',
    setup,
    deck: seededDeck(setup.seed),
    seats: { human: newSeat(setup, 'human'), ai: newSeat(setup, 'ai') },
  };
  return advance(base);
};

const placeCard = (state: GameState, seat: Seat, cardId: string, row: RowName): GameState | null => {
  const turn = state.turn;
  if (state.phase !== 'placing' || !turn || turn.seat !== seat) return null;
  if (turn.placed.length >= turn.need.place) return null;
  const card = state.seats[seat].held.find((c) => c.id === cardId);
  if (!card) return null;
  const board = state.seats[seat].board;
  if (board[row].length >= ROW_SIZE[row]) return null;
  return {
    ...withSeat(state, seat, {
      board: addToRow(board, row, card),
      held: state.seats[seat].held.filter((c) => c.id !== cardId),
    }),
    turn: { ...turn, placed: [...turn.placed, { cardId, row }] },
  };
};

/** Returns a staged card (placed or marked for discard) to the player's hand. */
const undoCard = (state: GameState, seat: Seat, cardId: string): GameState | null => {
  const turn = state.turn;
  if (state.phase !== 'placing' || !turn || turn.seat !== seat) return null;
  const card = turn.dealt.find((c) => c.id === cardId);
  if (!card) return null;
  const s = state.seats[seat];
  let board = s.board;
  let placed = turn.placed;
  let discarded = turn.discarded;

  const staged = placed.find((p) => p.cardId === cardId);
  if (staged) {
    board = removeFromRow(board, staged.row, cardId);
    placed = placed.filter((p) => p.cardId !== cardId);
  } else if (discarded.includes(cardId)) {
    discarded = discarded.filter((id) => id !== cardId);
  } else {
    return null;
  }

  const heldIds = new Set([...s.held.map((c) => c.id), cardId]);
  const held = turn.dealt.filter((c) => heldIds.has(c.id)); // keep deal order
  return { ...withSeat(state, seat, { board, held }), turn: { ...turn, placed, discarded } };
};

const discardCard = (state: GameState, seat: Seat, cardId: string): GameState | null => {
  const turn = state.turn;
  if (state.phase !== 'placing' || !turn || turn.seat !== seat) return null;
  if (turn.discarded.length >= turn.need.discard) return null;
  if (!state.seats[seat].held.some((c) => c.id === cardId)) return null;
  return {
    ...withSeat(state, seat, { held: state.seats[seat].held.filter((c) => c.id !== cardId) }),
    turn: { ...turn, discarded: [...turn.discarded, cardId] },
  };
};

const confirmTurn = (state: GameState, seat: Seat): GameState | null => {
  const turn = state.turn;
  if (state.phase !== 'placing' || !turn || turn.seat !== seat) return null;
  if (turn.placed.length !== turn.need.place || turn.discarded.length !== turn.need.discard) {
    return null;
  }
  const s = state.seats[seat];
  const discardedCards = turn.dealt.filter((c) => turn.discarded.includes(c.id));
  const settled = withSeat(state, seat, {
    held: [],
    discards: [...s.discards, ...discardedCards],
    street: s.street + 1,
  });
  return advance({ ...settled, turn: null });
};

const apply = (state: GameState, action: Action): GameState | null => {
  switch (action.type) {
    case 'START_HAND':
      return startHand(action.setup);
    case 'PLACE':
      return placeCard(state, action.seat, action.cardId, action.row);
    case 'MOVE': {
      const undone = undoCard(state, action.seat, action.cardId);
      return undone ? placeCard(undone, action.seat, action.cardId, action.row) : null;
    }
    case 'DISCARD':
      return discardCard(state, action.seat, action.cardId);
    case 'UNDO':
      return undoCard(state, action.seat, action.cardId);
    case 'CONFIRM':
      return confirmTurn(state, action.seat);
  }
};

/**
 * The pure game state machine. Illegal actions return the *same state object* untouched, so
 * duplicate or stale dispatches (double clicks, late timers) are harmless. Every applied
 * action is appended to `log`; the log plus a seed fully reproduces a hand.
 */
export const gameReducer = (state: GameState, action: Action): GameState => {
  const next = apply(state, action);
  if (next === null) return state;
  return { ...next, log: action.type === 'START_HAND' ? [action] : [...state.log, action] };
};

/** Re-runs an action log from scratch. */
export const replay = (log: readonly Action[]): GameState =>
  log.reduce(gameReducer, initialGameState());
