import {
  BOARD_SIZE,
  FANTASYLAND,
  HAND_NAMES,
  ROW_SIZE,
  SCOOP_BONUS,
  FOUL_PENALTY,
  dealPlan,
  fantasylandCardsFor,
} from '../engine';

/**
 * Every word of the "How to play" screen, in one place so it is easy to edit or translate.
 * Numbers are never typed here: they come from the engine, so the text cannot drift from
 * what the game actually does. Style: plain English, short sentences, "points" not money.
 */

const classic = dealPlan('classic', 0);
const pineapple = dealPlan('pineapple', 0);
const first = classic[0]?.deal ?? 5;
const classicDraws = classic.length - 1;
const pineappleDraws = pineapple.length - 1;
const pineDeal = pineapple[1]?.deal ?? 3;
const pinePlace = pineapple[1]?.place ?? 2;

export const HOWTO_SECTIONS = [
  { id: 'goal', label: 'The goal' },
  { id: 'rule', label: 'The golden rule' },
  { id: 'dealing', label: 'How cards arrive' },
  { id: 'scoring', label: 'Scoring' },
  { id: 'royalties', label: 'Royalties' },
  { id: 'fantasyland', label: 'Fantasyland' },
  { id: 'rankings', label: 'Hand rankings' },
] as const;

export const COPY = {
  title: 'How to play',
  intro:
    'Open Face Chinese Poker (OFC) is a poker game where you build three hands at once. It takes about two minutes to learn.',

  goal: {
    title: 'The goal',
    lead: `You build three poker hands from ${BOARD_SIZE} cards. Each hand is a row on your board.`,
    rows: [
      { name: 'Front', note: `The top row. ${ROW_SIZE.front} cards.` },
      { name: 'Middle', note: `${ROW_SIZE.mid} cards.` },
      { name: 'Back', note: `The bottom row. ${ROW_SIZE.back} cards.` },
    ],
    versus:
      'Your opponent builds three hands too. Each of your rows is compared with their matching row.',
  },

  rule: {
    title: 'The golden rule',
    lead: 'Your back row must be stronger than your middle row, and your middle row stronger than your front row.',
    foulDefinition:
      'Break this order and your board is a foul. A foul loses the hand, so it is the one thing to avoid.',
    equalNote: 'Rows that are exactly equal are fine.',
    goodLabel: 'Legal board',
    goodNote: 'Back (two pair) beats middle (pair), which beats front (high card).',
    badLabel: 'Foul',
    badNote: 'The front row has a pair, but the middle row only has a king high. The front is stronger than the middle.',
    tip: 'Not sure which hand is stronger? See the rankings at the bottom of this page.',
  },

  dealing: {
    title: 'How cards arrive',
    lead: `You start with ${first} cards and place them all. After that you get cards one at a time.`,
    classic: `Classic: ${first} cards first, then ${classicDraws} single cards. Each one goes on a row.`,
    pineapple: `Pineapple: ${first} cards first, then ${pineappleDraws} times you get ${pineDeal} cards. Place ${pinePlace} and discard 1.`,
    lock: 'Cards you place stay movable until you press Confirm. After that they are locked for good.',
    turns: 'You and your opponent take turns. Every card you see on the table is a card you cannot draw.',
  },

  scoring: {
    title: 'Scoring',
    lead: 'Everything is counted in points.',
    rowLine: 'Each row you win is +1 point. A tied row scores nothing.',
    scoopLine: `Win all three rows and you get a scoop: a bonus of +${SCOOP_BONUS} points.`,
    foulLine: `A foul loses a scoop to your opponent: ${FOUL_PENALTY} points. It also cancels your own royalties.`,
    bothFoul: 'If both boards foul, nobody scores.',
    royaltyLine: 'Royalties (next section) are extra points for strong hands.',
    exampleTitle: 'A worked example',
    exampleIntro: 'Here is one hand, start to finish.',
    exampleRowWin: (row: string, yours: string, theirs: string) => `${row}: you win. ${yours} beats ${theirs}.`,
    exampleRowLoss: (row: string, yours: string, theirs: string) => `${row}: you lose. ${theirs} beats ${yours}.`,
    exampleRowTie: (row: string) => `${row}: tie.`,
    exampleTotal: (points: number) => `Total: ${points > 0 ? '+' : ''}${points} points.`,
  },

  royalties: {
    title: 'Royalties',
    lead: 'Royalties are bonus points for making a strong hand. You keep them as long as your board is legal.',
    frontNote: 'The front row only has three cards, so it only counts pairs and three of a kind. There are no straights or flushes up there.',
    middleNote: 'The middle row pays double, because strong hands are harder to build there.',
    frontPairs: 'Front row pairs',
    frontTrips: 'Front row three of a kind',
    colHand: 'Hand',
    colPoints: 'Points',
    colMiddle: 'Middle',
    colBack: 'Back',
    royalFlush: 'Royal flush',
  },

  fantasyland: {
    title: 'Fantasyland',
    lead: 'Fantasyland is a bonus hand you earn. It is a big advantage, so it is worth chasing.',
    howToEnter: `Finish a legal board with a pair of queens or better on the front row. Your next hand is a Fantasyland hand.`,
    whatHappens: `You get all your cards at once (${FANTASYLAND.baseCards} or more), set ${BOARD_SIZE} of them in private, and discard the rest. Your opponent cannot see your board until it is done.`,
    cardsTitle: 'Cards you receive (progressive mode)',
    flatNote: `In flat mode you always get ${FANTASYLAND.baseCards} cards. You can pick the mode in Settings, or turn Fantasyland off.`,
    howToStay: 'Stay in Fantasyland by making one of these on a legal board:',
    stayFront: 'Three of a kind on the front row',
    stayMid: (label: string) => `${label} or better on the middle row`,
    stayBack: (label: string) => `${label} or better on the back row`,
  },

  rankings: {
    title: 'Hand rankings',
    lead: 'From weakest to strongest. Suits never break ties: the higher cards win.',
    wheel: 'An ace can be low in a straight (A-2-3-4-5), which is the lowest straight.',
    frontNote: 'On the front row only the first three kinds apply: high card, pair, and three of a kind.',
  },
} as const;

/** Human label for a stay condition, e.g. "Full House". */
export const stayLabels = {
  mid: (category: keyof typeof HAND_NAMES) => HAND_NAMES[category],
  back: (category: keyof typeof HAND_NAMES) => HAND_NAMES[category],
};

/** Progressive-mode card counts for the table: queens, kings, aces, trips. */
export const progressiveRows = (): readonly { label: string; cards: number }[] => [
  { label: 'Pair of queens', cards: fantasylandCardsFor('pair', 12, 'progressive') },
  { label: 'Pair of kings', cards: fantasylandCardsFor('pair', 13, 'progressive') },
  { label: 'Pair of aces', cards: fantasylandCardsFor('pair', 14, 'progressive') },
  { label: 'Three of a kind', cards: fantasylandCardsFor('trips', 2, 'progressive') },
];
