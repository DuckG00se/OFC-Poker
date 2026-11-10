import { chooseTurn, planToActions, type TurnPlan } from '../../src/ai';
import {
  DEFAULT_CONFIG,
  createRng,
  gameReducer,
  initialGameState,
  viewFor,
  type GameConfig,
  type GameState,
  type HandSetup,
  type Seat,
} from '../../src/engine';

export const setupFor = (
  seed: string,
  config: Partial<GameConfig> = {},
  fantasyland: { human: number; ai: number } = { human: 0, ai: 0 },
  button: Seat = 'ai',
): HandSetup => ({ seed, config: { ...DEFAULT_CONFIG, ...config }, button, fantasyland });

export const start = (setup: HandSetup): GameState =>
  gameReducer(initialGameState(), { type: 'START_HAND', setup });

export { planToActions };

export const playPlan = (state: GameState, seat: Seat, plan: TurnPlan): GameState =>
  planToActions(seat, plan).reduce(gameReducer, state);

/** Plays the current turn with the AI. */
export const playAiTurn = (state: GameState, rng: () => number): GameState => {
  const turn = state.turn;
  if (!turn) return state;
  return playPlan(state, turn.seat, chooseTurn(viewFor(state, turn.seat), rng));
};

/** Plays a whole hand with the AI on both seats. */
export const playHand = (setup: HandSetup, aiSeed = 'sim'): GameState => {
  const rng = createRng(aiSeed + setup.seed);
  let state = start(setup);
  for (let guard = 0; state.phase === 'placing' && guard < 100; guard++) {
    state = playAiTurn(state, rng);
  }
  return state;
};
