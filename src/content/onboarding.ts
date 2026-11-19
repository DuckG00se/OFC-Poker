import { BOARD_SIZE, FOUL_PENALTY, ROW_SIZE, SCOOP_BONUS } from '../engine';

/**
 * Copy for first-time guidance: the welcome choice, the 60-second intro, the guided hand,
 * the foul warning and the first-foul explainer. Same rules as content/rules.ts: plain
 * English, short sentences, points not money, and numbers come from the engine.
 */

export const WELCOME = {
  title: 'Open Face Chinese Poker',
  tagline: 'Build three poker hands at once. Easy to learn, hard to master.',
  learn: 'New to OFC? Learn in 60 seconds',
  learnNote: 'A short visual intro, then a guided first hand.',
  know: 'I know how to play',
  knowNote: 'Jump straight in. You can open the rules any time with the ? button.',
} as const;

export interface IntroSlide {
  id: 'goal' | 'rule' | 'play' | 'score';
  title: string;
  body: readonly string[];
}

export const INTRO: readonly IntroSlide[] = [
  {
    id: 'goal',
    title: 'Build three poker hands',
    body: [
      `You get ${BOARD_SIZE} cards, one at a time, and arrange them into three rows: front (${ROW_SIZE.front} cards), middle (${ROW_SIZE.mid}) and back (${ROW_SIZE.back}).`,
      'Each row is a poker hand. Your opponent builds three too.',
    ],
  },
  {
    id: 'rule',
    title: 'Keep the rows in order',
    body: [
      'Your back row must be your strongest, and your front row your weakest.',
      'Break that order and your board is a foul, which loses the hand.',
    ],
  },
  {
    id: 'play',
    title: 'Place cards, then confirm',
    body: [
      'Tap a card, then tap the row you want. Or drag it there.',
      'You can change your mind until you press Confirm. Then the cards are locked.',
    ],
  },
  {
    id: 'score',
    title: 'Win rows, win points',
    body: [
      `Each row you win is +1 point. Win all three for a bonus of +${SCOOP_BONUS}.`,
      `Strong hands earn extra points called royalties. A foul costs ${FOUL_PENALTY} points.`,
    ],
  },
];

export const INTRO_UI = {
  next: 'Next',
  back: 'Back',
  skip: 'Skip intro',
  start: 'Play my first hand',
  progress: (n: number, total: number) => `${n} of ${total}`,
} as const;

/** The guided hand. `place` is combined with advice written from the cards actually dealt. */
/** "1 point", "2 points". */
export const pointsText = (n: number): string => `${n} point${Math.abs(n) === 1 ? '' : 's'}`;

export const TUTORIAL = {
  welcome: {
    title: 'Your first hand',
    body: 'Your board has three rows: front, middle and back. They are all highlighted now.',
  },
  rule: {
    title: 'The one rule',
    body: 'Back must be at least as strong as middle, and middle at least as strong as front. Break it and you foul.',
  },
  place: {
    title: 'Place your first cards',
    body: 'You start with 5 cards. Tap a card, then a row. Or drag it.',
  },
  arrange: {
    title: 'Nothing is final yet',
    body: 'Cards you place this turn have a gold edge. Tap one to take it back, or drag it to another row.',
  },
  confirm: {
    title: 'Lock it in',
    body: 'Happy with it? Press Confirm. After that, those cards stay put for the rest of the hand.',
  },
  cpu: (name: string) => ({
    title: `${name} plays too`,
    body: `${name} builds a board the same way, face up. Every card you can see is a card you cannot draw.`,
  }),
  draw: (pineapple: boolean) => ({
    title: 'One street at a time',
    body: pineapple
      ? 'From now on you get three cards each turn: place two and discard one.'
      : 'From now on you get one card each turn. Choose a row for it.',
  }),
  helpers: {
    title: 'Your helpers',
    body: 'Each row shows what it makes and which cards would improve it. The foul warning above your board estimates your risk. Tap a row name for details, or open Quick ref any time.',
  },
  scoring: {
    title: 'Scoring',
    body: 'Each row is compared with the same row across the table: +1 per row you win, +3 more for winning all three, plus royalties for strong hands.',
  },
  finished: (points: number, fouled: boolean) => ({
    title: 'You finished your first hand!',
    body: fouled
      ? 'That one was a foul, which happens to everyone at first. It is the best way to learn the rule. Try again, and build the back row first.'
      : points > 0
        ? `You scored +${pointsText(points)}. Nicely done.`
        : points < 0
          ? `You lost ${pointsText(Math.abs(points))} this time, which is normal for a first hand. The next one is easier.`
          : 'A tie: nobody scored. Well played.',
  }),
  skip: 'Skip tutorial',
  next: 'Next',
  done: 'Done',
  yourMove: 'Your move',
} as const;

/** Shown during the guided hand when the player's rows are heading out of order. */
export const FOUL_WARNING = {
  title: 'Careful: this could be a foul',
  certain: 'This board can no longer be saved, so it will foul.',
  likely: (percent: number) => `Based on what is left in the deck, about ${percent}% of the time a board like this ends up a foul.`,
  fix: 'Take a card back',
  hint: 'You can still change it: tap a gold-edged card to take it back.',
} as const;

/** Shown once, the first time the player's board fouls. */
export const FOUL_EXPLAINER = {
  title: 'That was a foul',
  lead: 'A foul means your rows were out of order, so you lose the hand.',
  rule: 'The rule: your back row must be the strongest, and your front row the weakest.',
  whatHappened: 'Here is what happened on your board:',
  cost: `A foul costs ${pointsText(FOUL_PENALTY)}, and you earn no royalties. Don't worry: everyone fouls while learning.`,
  tips: [
    'Build your back row first, with your strongest cards.',
    'Keep small cards on the front row.',
    'Watch the foul warning above your board. It tells you before it is too late.',
  ],
  tipsTitle: 'Next time',
  gotIt: 'Got it',
  seeRules: 'Read the rules',
} as const;
