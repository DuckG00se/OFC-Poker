import type { Difficulty, HandScore } from '../engine';

export interface Persona {
  name: string;
  title: string;
  /** One-line description shown when picking a difficulty. */
  blurb: string;
  lines: {
    start: readonly string[];
    win: readonly string[];
    lose: readonly string[];
    push: readonly string[];
    scoop: readonly string[];
    foul: readonly string[];
    opponentFoul: readonly string[];
    fantasyland: readonly string[];
  };
}

export const PERSONAS: Readonly<Record<Difficulty, Persona>> = {
  easy: {
    name: 'Lucky Lou',
    title: 'Friendly gambler',
    blurb: 'Plays on instinct, talks a lot, and makes the occasional blunder.',
    lines: {
      start: ["Let's have some fun!", 'Deal me in, friend.', 'Feeling lucky tonight.'],
      win: ['Ha! Told you I was lucky.', 'Beginner\'s luck? Nope, that was skill.', 'Good game, good game!'],
      lose: ['Ah, you got me!', 'Nice one. Drinks are on me.', 'I walked right into that.'],
      push: ["Dead even. Can't complain."],
      scoop: ['Scooped! Do I get a prize?', 'All three rows! Wow.'],
      foul: ["Oops. Wrong row, I think.", 'Did I just foul? Story of my life.', 'My cards had other plans.'],
      opponentFoul: ['Ooh, tough break.', "Careful with the rows, they'll get you."],
      fantasyland: ['Fantasyland! I love this part.'],
    },
  },
  medium: {
    name: 'Madame Vega',
    title: 'Steady pro',
    blurb: 'Counts what is left in the deck and plays the percentages.',
    lines: {
      start: ['Cards on the table.', 'Let us see what the deck gives us.', 'Take your time, dear.'],
      win: ['The numbers were on my side.', 'That is how it is done.', 'Respectable effort.'],
      lose: ['Well played.', 'You earned that one.', 'The deck owes me a favour now.'],
      push: ['A wash. Interesting.'],
      scoop: ['A clean sweep.', 'Three rows, no mercy.'],
      foul: ['A rare misstep.', 'The deck betrayed me.', 'I miscalculated. It happens.'],
      opponentFoul: ['Your rows were out of order, dear.', 'Overreach is expensive.'],
      fantasyland: ['Fantasyland. Now we are talking.'],
    },
  },
  hard: {
    name: 'The Professor',
    title: 'Relentless calculator',
    blurb: 'Simulates thousands of outcomes per move and hunts for Fantasyland.',
    lines: {
      start: ['I have already run the odds.', 'Proceed. The math is patient.', 'Variance favours the prepared.'],
      win: ['Expected value realised.', 'As the simulations predicted.', 'Correct play, correct result.'],
      lose: ['Variance. Nothing more.', 'A negative outcome from a positive-EV line.', 'Noted. I will adjust.'],
      push: ['Statistically unremarkable.'],
      scoop: ['A scoop. The model approves.', 'Complete domination, as projected.'],
      foul: ['That line carried a risk, and it came due.', 'A calculated gamble. Miscalculated.'],
      opponentFoul: ['An avoidable foul.', 'Your board violated the row order.'],
      fantasyland: ['Fantasyland. The long game pays.'],
    },
  },
};

export const personaFor = (difficulty: Difficulty): Persona => PERSONAS[difficulty];

const hash = (text: string): number => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};

const pick = (options: readonly string[], seed: string): string =>
  options[hash(seed) % options.length] ?? '';

/** A line about how the hand went, chosen deterministically from the seed (so replays match). */
export const quipForResult = (
  persona: Persona,
  result: HandScore,
  aiFantasylandNext: number,
  seed: string,
): string => {
  const ai = result.seats.ai;
  const human = result.seats.human;
  const points = result.points.ai;
  if (aiFantasylandNext > 0) return pick(persona.lines.fantasyland, seed);
  if (ai.fouled && !human.fouled) return pick(persona.lines.foul, seed);
  if (human.fouled && !ai.fouled) return pick(persona.lines.opponentFoul, seed);
  if (!ai.fouled && result.scoop < 0) return pick(persona.lines.scoop, seed);
  if (points > 0) return pick(persona.lines.win, seed);
  if (points < 0) return pick(persona.lines.lose, seed);
  return pick(persona.lines.push, seed);
};

export const quipForStart = (persona: Persona, seed: string): string =>
  pick(persona.lines.start, seed);
