import { randomSeed } from './rng';
import {
  DEFAULT_CONFIG,
  otherSeat,
  type GameConfig,
  type GameState,
  type HandSetup,
  type Seat,
} from './types';

/** Match-level state that carries from hand to hand. */
export interface Session {
  sessionSeed: string;
  config: GameConfig;
  /** Number of the hand currently being (or about to be) played; starts at 1. */
  handNo: number;
  /** Dealer for the *next* hand to start. Flips every hand. */
  button: Seat;
  bankroll: number;
  /** Fantasyland card counts carried into the next hand. */
  fantasyland: Record<Seat, number>;
  /** Number of hands settled so far. */
  handsPlayed: number;
}

export const STARTING_BANKROLL = 1000;

export const createSession = (
  config: GameConfig = DEFAULT_CONFIG,
  sessionSeed: string = randomSeed(),
): Session => ({
  sessionSeed,
  config,
  handNo: 1,
  // The AI deals first, so the human acts first on the opening hand.
  button: 'ai',
  bankroll: STARTING_BANKROLL,
  fantasyland: { human: 0, ai: 0 },
  handsPlayed: 0,
});

export const handSeed = (sessionSeed: string, handNo: number): string => `${sessionSeed}:${handNo}`;

export const setupForSession = (session: Session): HandSetup => ({
  seed: handSeed(session.sessionSeed, session.handNo),
  config: session.config,
  button: session.button,
  fantasyland: session.fantasyland,
});

/** Applies a scored hand to the session: bankroll, Fantasyland carry-over, next dealer. */
export const settleHand = (session: Session, game: GameState): Session => {
  if (game.phase !== 'scored' || !game.result) return session;
  return {
    ...session,
    bankroll: session.bankroll + game.result.points.human * session.config.stake,
    fantasyland: game.fantasylandNext,
    button: otherSeat(session.button),
    handNo: session.handNo + 1,
    handsPlayed: session.handsPlayed + 1,
  };
};
