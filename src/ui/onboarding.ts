import {
  ROW_NAMES,
  compareRows,
  evaluateRow,
  rankLabel,
  type Board,
  type Card,
  type RowName,
} from '../engine';

/**
 * First-time guidance, as plain functions so it can be tested without a screen.
 *
 * - `unseen`: the player has not chosen yet (shows the welcome choice on first launch).
 * - `skipped`: they said "I know how to play", or skipped the tutorial.
 * - `completed`: they finished the guided hand.
 */
export type TutorialStatus = 'unseen' | 'completed' | 'skipped';

export interface OnboardingFlags {
  tutorialStatus: TutorialStatus;
  /** The one-time "here is why that was a foul" explainer has been shown. */
  foulExplained: boolean;
}

/** The welcome choice is only for people who have never played and never chose. */
export const shouldOfferWelcome = (
  flags: OnboardingFlags,
  handsPlayed: number,
  phase: 'idle' | 'placing' | 'scored',
): boolean => flags.tutorialStatus === 'unseen' && handsPlayed === 0 && phase === 'idle';

/** Back to a first launch: the welcome choice, the guided hand and the foul explainer all return. */
export const resetOnboarding = <T extends OnboardingFlags>(prefs: T): T => ({
  ...prefs,
  tutorialStatus: 'unseen',
  foulExplained: false,
});

const LABEL: Readonly<Record<RowName, string>> = { front: 'front', mid: 'middle', back: 'back' };

export interface OrderProblem {
  /** The row that should be weaker but is not. */
  upper: RowName;
  /** The row it must not beat. */
  lower: RowName;
  upperName: string;
  lowerName: string;
}

/**
 * Pairs of rows that are out of order right now (the upper row is stronger than the one
 * below it). Only rows with cards are compared, so on an unfinished board this means
 * "heading for a foul", and on a finished one it names exactly what broke the rule.
 */
export const orderProblems = (board: Board): OrderProblem[] => {
  const pairs: [RowName, RowName][] = [
    ['front', 'mid'],
    ['mid', 'back'],
  ];
  const found: OrderProblem[] = [];
  for (const [upper, lower] of pairs) {
    if (board[upper].length === 0 || board[lower].length === 0) continue;
    const up = evaluateRow(board[upper], upper);
    const low = evaluateRow(board[lower], lower);
    if (compareRows(up, low) > 0) {
      found.push({ upper, lower, upperName: up.name, lowerName: low.name });
    }
  }
  return found;
};

/** One sentence per problem, in plain words. */
export const describeProblem = (p: OrderProblem): string =>
  `Your ${LABEL[p.upper]} row (${p.upperName}) is stronger than your ${LABEL[p.lower]} row (${p.lowerName}).`;

/** The rows to highlight for a set of problems. */
export const problemRows = (problems: readonly OrderProblem[]): RowName[] =>
  ROW_NAMES.filter((row) => problems.some((p) => p.upper === row || p.lower === row));

/**
 * Advice for the five opening cards, based on the cards actually dealt: keep a pair
 * together, send the strongest cards to the back, and put small cards on the front.
 */
export const firstHandAdvice = (cards: readonly Card[]): string => {
  if (cards.length === 0) return 'Place your cards on the rows. Strong cards usually belong in the back.';
  const counts = new Map<number, number>();
  for (const c of cards) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
  const made = [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const top = made[0];
  if (top) {
    const [rank, n] = top;
    const what = n >= 3 ? 'three' : 'a pair of';
    return `You were dealt ${what} ${rankLabel(rank)}s. Keep them together, ideally in the back row.`;
  }
  const suits = new Map<string, number>();
  for (const c of cards) suits.set(c.suit, (suits.get(c.suit) ?? 0) + 1);
  const bestSuit = Math.max(...suits.values());
  if (bestSuit >= 3) {
    return `${bestSuit} of your cards share a suit. A flush is five of one suit, so try keeping them in the same row.`;
  }
  const highest = [...cards].sort((a, b) => b.rank - a.rank)[0];
  const name = highest ? rankLabel(highest.rank) : '';
  return `No pairs yet. Your highest card is the ${name}: strong cards go in the back, small cards on the front.`;
};
