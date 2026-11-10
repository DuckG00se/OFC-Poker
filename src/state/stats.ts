import type { Action, Difficulty, GameState, Variant } from '../engine';

/** Everything the player has done, across sessions. */
export interface LifetimeStats {
  handsPlayed: number;
  handsWon: number;
  handsLost: number;
  handsTied: number;
  /** Hands where the player's board fouled. */
  fouls: number;
  /** Hands where the player won all three rows without either board fouling. */
  scoops: number;
  /** Times the player earned a Fantasyland hand (entering or staying). */
  fantasylands: number;
  /** Royalty points collected. */
  royaltiesEarned: number;
  /** Net points over every hand. */
  netPoints: number;
  /** Largest single-hand win and loss, in points and in money. */
  biggestWinPoints: number;
  biggestWinMoney: number;
  biggestLossPoints: number;
  currentCleanStreak: number;
  bestCleanStreak: number;
  currentWinStreak: number;
  bestWinStreak: number;
}

export const EMPTY_STATS: LifetimeStats = {
  handsPlayed: 0,
  handsWon: 0,
  handsLost: 0,
  handsTied: 0,
  fouls: 0,
  scoops: 0,
  fantasylands: 0,
  royaltiesEarned: 0,
  netPoints: 0,
  biggestWinPoints: 0,
  biggestWinMoney: 0,
  biggestLossPoints: 0,
  currentCleanStreak: 0,
  bestCleanStreak: 0,
  currentWinStreak: 0,
  bestWinStreak: 0,
};

/** A finished hand, kept for the history list and for replay. */
export interface HandRecord {
  /** The hand's seed: unique, and enough (with the log) to replay it exactly. */
  id: string;
  handNo: number;
  /** When it was played (epoch milliseconds). */
  at: number;
  variant: Variant;
  difficulty: Difficulty;
  stake: number;
  /** Net points and money for the player. */
  points: number;
  payout: number;
  humanFouled: boolean;
  cpuFouled: boolean;
  /** +3 / -3 scoop bonus from the player's side (also set for fouls), else 0. */
  scoop: number;
  royalties: number;
  /** Fantasyland cards earned for the next hand (0 = none). */
  fantasylandNext: number;
  /** Played as a Fantasyland hand. */
  inFantasyland: boolean;
  /** Every action of the hand, in order. Replaying it reproduces the hand. */
  log: readonly Action[];
}

/** How many hands the history keeps. */
export const MAX_HISTORY = 50;

/** The record for a scored hand, or null if the game is not scored. */
export const recordHand = (game: GameState, handNo: number, at: number): HandRecord | null => {
  const { setup, result } = game;
  if (game.phase !== 'scored' || !setup || !result) return null;
  return {
    id: setup.seed,
    handNo,
    at,
    variant: setup.config.variant,
    difficulty: setup.config.difficulty,
    stake: setup.config.stake,
    points: result.points.human,
    payout: result.points.human * setup.config.stake,
    humanFouled: result.seats.human.fouled,
    cpuFouled: result.seats.ai.fouled,
    scoop: result.scoop,
    royalties: result.seats.human.royaltyTotal,
    fantasylandNext: game.fantasylandNext.human,
    inFantasyland: game.seats.human.fantasyland > 0,
    log: game.log,
  };
};

/** Lifetime stats after one more finished hand. */
export const addHandToStats = (stats: LifetimeStats, record: HandRecord): LifetimeStats => {
  const won = record.points > 0;
  const lost = record.points < 0;
  const clean = !record.humanFouled;
  const cleanStreak = clean ? stats.currentCleanStreak + 1 : 0;
  const winStreak = won ? stats.currentWinStreak + 1 : 0;
  const scooped = record.scoop > 0 && !record.cpuFouled && !record.humanFouled;
  return {
    handsPlayed: stats.handsPlayed + 1,
    handsWon: stats.handsWon + (won ? 1 : 0),
    handsLost: stats.handsLost + (lost ? 1 : 0),
    handsTied: stats.handsTied + (!won && !lost ? 1 : 0),
    fouls: stats.fouls + (record.humanFouled ? 1 : 0),
    scoops: stats.scoops + (scooped ? 1 : 0),
    fantasylands: stats.fantasylands + (record.fantasylandNext > 0 ? 1 : 0),
    royaltiesEarned: stats.royaltiesEarned + record.royalties,
    netPoints: stats.netPoints + record.points,
    biggestWinPoints: Math.max(stats.biggestWinPoints, record.points),
    biggestWinMoney: Math.max(stats.biggestWinMoney, record.payout),
    biggestLossPoints: Math.min(stats.biggestLossPoints, record.points),
    currentCleanStreak: cleanStreak,
    bestCleanStreak: Math.max(stats.bestCleanStreak, cleanStreak),
    currentWinStreak: winStreak,
    bestWinStreak: Math.max(stats.bestWinStreak, winStreak),
  };
};

/** A share of hands as a whole-number percentage (0 when no hands were played). */
export const rate = (count: number, hands: number): number =>
  hands > 0 ? Math.round((count / hands) * 100) : 0;
