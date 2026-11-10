import { HandCategory, ROW_NAMES, STARTING_BANKROLL, type HandScore } from '../engine';
import type { HandRecord, LifetimeStats } from './stats';

/** What an achievement check can look at: the hand just finished and the totals after it. */
export interface AchievementContext {
  record: HandRecord;
  result: HandScore;
  /** Lifetime stats including this hand. */
  stats: LifetimeStats;
  /** Bankroll after this hand. */
  bankroll: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  earned: (ctx: AchievementContext) => boolean;
}

/** Best hand category the player made on a legal (non-fouled) board. */
const bestCategory = (ctx: AchievementContext): HandCategory => {
  const seat = ctx.result.seats.human;
  if (seat.fouled) return HandCategory.HighCard;
  return Math.max(...ROW_NAMES.filter((r) => r !== 'front').map((r) => seat.evals[r].category));
};

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'first-hand',
    title: 'At the table',
    description: 'Finish your first hand.',
    earned: () => true,
  },
  {
    id: 'first-win',
    title: 'First blood',
    description: 'Win a hand.',
    earned: (c) => c.record.points > 0,
  },
  {
    id: 'first-scoop',
    title: 'Clean sweep',
    description: 'Scoop: win all three rows.',
    earned: (c) => c.record.scoop > 0 && !c.record.cpuFouled,
  },
  {
    id: 'first-fantasyland',
    title: 'Welcome to Fantasyland',
    description: 'Earn a Fantasyland hand with QQ or better in front.',
    earned: (c) => c.record.fantasylandNext > 0 && !c.record.inFantasyland,
  },
  {
    id: 'stay-fantasyland',
    title: 'Permanent resident',
    description: 'Stay in Fantasyland for another hand.',
    earned: (c) => c.record.fantasylandNext > 0 && c.record.inFantasyland,
  },
  {
    id: 'clean-10',
    title: 'Steady hands',
    description: 'Play 10 hands in a row without fouling.',
    earned: (c) => c.stats.currentCleanStreak >= 10,
  },
  {
    id: 'win-streak-5',
    title: 'On a heater',
    description: 'Win 5 hands in a row.',
    earned: (c) => c.stats.currentWinStreak >= 5,
  },
  {
    id: 'royalty-10',
    title: 'Royal treatment',
    description: 'Collect 10 or more royalty points in one hand.',
    earned: (c) => c.record.royalties >= 10,
  },
  {
    id: 'royalty-25',
    title: 'Crown jewels',
    description: 'Collect 25 or more royalty points in one hand.',
    earned: (c) => c.record.royalties >= 25,
  },
  {
    id: 'big-win-20',
    title: 'High roller',
    description: 'Win 20 or more points in one hand.',
    earned: (c) => c.record.points >= 20,
  },
  {
    id: 'front-trips',
    title: 'Top heavy',
    description: 'Make three of a kind in the front row without fouling.',
    earned: (c) =>
      !c.result.seats.human.fouled && c.result.seats.human.evals.front.category === HandCategory.Trips,
  },
  {
    id: 'full-house',
    title: 'Full boat',
    description: 'Make a full house on a legal board.',
    earned: (c) => bestCategory(c) >= HandCategory.FullHouse,
  },
  {
    id: 'quads',
    title: 'Four of a kind',
    description: 'Make quads on a legal board.',
    earned: (c) => bestCategory(c) >= HandCategory.Quads,
  },
  {
    id: 'straight-flush',
    title: 'Straight flush',
    description: 'Make a straight flush on a legal board.',
    earned: (c) => bestCategory(c) >= HandCategory.StraightFlush,
  },
  {
    id: 'beat-hard',
    title: 'School the Professor',
    description: 'Win a hand against the Hard opponent.',
    earned: (c) => c.record.difficulty === 'hard' && c.record.points > 0,
  },
  {
    id: 'pineapple-win',
    title: 'Sweet and sharp',
    description: 'Win a Pineapple hand.',
    earned: (c) => c.record.variant === 'pineapple' && c.record.points > 0,
  },
  {
    id: 'hands-50',
    title: 'Regular',
    description: 'Play 50 hands.',
    earned: (c) => c.stats.handsPlayed >= 50,
  },
  {
    id: 'bankroll-double',
    title: 'Doubled up',
    description: `Grow your bankroll to $${(STARTING_BANKROLL * 2).toLocaleString()}.`,
    earned: (c) => c.bankroll >= STARTING_BANKROLL * 2,
  },
];

/** Ids of achievements this hand unlocked that were not unlocked before. */
export const newlyEarned = (
  already: Readonly<Record<string, number>>,
  ctx: AchievementContext,
): string[] =>
  ACHIEVEMENTS.filter((a) => already[a.id] === undefined && a.earned(ctx)).map((a) => a.id);

export const achievementById = (id: string): Achievement | undefined =>
  ACHIEVEMENTS.find((a) => a.id === id);
