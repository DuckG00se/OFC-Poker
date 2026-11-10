import { chooseTurn, planToActions, type TurnPlan } from '../../src/ai';
import {
  DEFAULT_CONFIG,
  type Difficulty,
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

/** Plays the current turn with the AI (Easy by default: fast, and good enough for flow tests). */
export const playAiTurn = (
  state: GameState,
  seed: string,
  difficulty: Difficulty = 'easy',
): GameState => {
  const turn = state.turn;
  if (!turn) return state;
  const plan = chooseTurn(viewFor(state, turn.seat), {
    difficulty,
    seed: `${seed}#${turn.seat}#${turn.street}`,
  });
  return playPlan(state, turn.seat, plan);
};

/** Plays a whole hand with the AI on both seats. */
export const playHand = (
  setup: HandSetup,
  aiSeed = 'sim',
  difficulty: Difficulty = 'easy',
): GameState => {
  let state = start(setup);
  for (let guard = 0; state.phase === 'placing' && guard < 100; guard++) {
    state = playAiTurn(state, aiSeed + setup.seed, difficulty);
  }
  return state;
};
