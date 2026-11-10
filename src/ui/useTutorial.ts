import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState, Variant } from '../engine';

/** The part of the table a tutorial step is talking about. */
export type CoachTarget = 'hand' | 'board' | 'confirm' | 'cpu' | 'score' | null;

export interface CoachStep {
  id: string;
  title: string;
  body: string;
  target: CoachTarget;
  /** Where the coach panel sits so that it does not cover its target. */
  place: 'top' | 'bottom';
  /** The player moves on with a button. Otherwise the step advances when they do the thing. */
  manual: boolean;
}

const steps = (variant: Variant, cpuName: string): readonly (CoachStep | null)[] => [
  {
    id: 'welcome',
    title: 'Welcome to Open Face Chinese Poker',
    body: 'You get 13 cards and build three poker rows with them: Front (3 cards), Middle (5) and Back (5).',
    target: 'board',
    place: 'top',
    manual: true,
  },
  {
    id: 'rule',
    title: 'The one rule',
    body: 'Your back row must be at least as strong as your middle, and your middle at least as strong as your front. Break that and the board fouls: you lose the hand outright.',
    target: 'board',
    place: 'top',
    manual: true,
  },
  {
    id: 'place',
    title: 'Place a card',
    body: 'Your first five cards are in the middle. Tap a card, then tap a row. Or drag it. Strong cards usually belong in the back.',
    target: 'hand',
    place: 'top',
    manual: false,
  },
  {
    id: 'arrange',
    title: 'Nothing is final yet',
    body: 'Cards you place this turn have a gold edge: tap one to take it back, or drag it to another row. Place the rest of your cards.',
    target: 'board',
    place: 'top',
    manual: false,
  },
  {
    id: 'confirm',
    title: 'Lock it in',
    body: 'Happy with it? Press Confirm. After that, those cards stay where they are for the rest of the hand.',
    target: 'confirm',
    place: 'top',
    manual: false,
  },
  {
    id: 'cpu',
    title: `${cpuName} plays too`,
    body: `${cpuName} builds a board the same way, face up. Every card you can see is one that can no longer come to you.`,
    target: 'cpu',
    place: 'bottom',
    manual: true,
  },
  {
    id: 'draw',
    title: 'One street at a time',
    body:
      variant === 'pineapple'
        ? 'From now on you get three cards each turn: place two of them and discard one.'
        : 'From now on you get one card each turn, and choose a row for it.',
    target: 'hand',
    place: 'top',
    manual: true,
  },
  {
    id: 'helpers',
    title: 'Your helpers',
    body: 'Beside each row you see what it makes and the live cards that would improve it. The chip above your board estimates your risk of fouling. You can switch these off in Settings.',
    target: 'board',
    place: 'top',
    manual: true,
  },
  null, // play on undisturbed until the hand is scored
  {
    id: 'scoring',
    title: 'Scoring',
    body: 'Each row is compared with the same row across the table: +1 for a row you win, +3 more for winning all three, plus royalties for strong hands. The full table is under Menu, Rules.',
    target: 'score',
    place: 'top',
    manual: true,
  },
];

const PLACE = 2;
const ARRANGE = 3;
const CONFIRM = 4;
const CPU = 5;
const WAIT = 8;
const SCORING = 9;

interface TutorialInput {
  game: GameState;
  cpuName: string;
  /** Cards the player has staged this turn. */
  stagedCount: number;
  /** The player's turn is fully staged. */
  turnComplete: boolean;
  /** The score reveal has finished. */
  scoreShown: boolean;
  /** Called when the tutorial is finished or skipped. */
  onDone: () => void;
}

export interface Tutorial {
  step: CoachStep | null;
  /** 1-based position among the visible steps, for "3 of 9". */
  position: number;
  total: number;
  isLast: boolean;
  next: () => void;
  skip: () => void;
  /** Ask for the tutorial to run on the next hand that is dealt. */
  request: () => void;
  requested: boolean;
}

/**
 * The guided first hand. It never blocks play: steps that teach an action wait for the
 * player to do it and then move on by themselves, and it catches up if the player runs ahead.
 */
export const useTutorial = ({
  game,
  cpuName,
  stagedCount,
  turnComplete,
  scoreShown,
  onDone,
}: TutorialInput): Tutorial => {
  const [index, setIndex] = useState<number | null>(null);
  const [requested, setRequested] = useState(false);
  const seed = game.setup?.seed ?? null;
  const startedFor = useRef<string | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const variant = game.setup?.config.variant ?? 'classic';
  const all = steps(variant, cpuName);
  const humanStreet = game.seats.human.street;
  const scored = game.phase === 'scored';

  const finish = useCallback(() => {
    setIndex(null);
    onDoneRef.current();
  }, []);

  // Start when a requested tutorial meets a freshly dealt hand.
  useEffect(() => {
    if (!requested || game.phase !== 'placing' || seed === null) return;
    if (game.log.length > 1) return; // only at the very start of a hand
    startedFor.current = seed;
    setRequested(false);
    setIndex(0);
  }, [requested, game.phase, game.log.length, seed]);

  // Move on when the player does what the step asked, and catch up if they run ahead.
  useEffect(() => {
    if (index === null) return;
    if (seed !== startedFor.current) {
      finish(); // the tutorial's hand is over and another has begun
      return;
    }
    if (scored) {
      if (index < SCORING && scoreShown) setIndex(SCORING);
      return;
    }
    if (index === PLACE && (stagedCount >= 1 || humanStreet >= 1)) setIndex(ARRANGE);
    else if (index === ARRANGE && (turnComplete || humanStreet >= 1)) setIndex(CONFIRM);
    else if (index === CONFIRM && humanStreet >= 1) setIndex(CPU);
  }, [index, seed, scored, scoreShown, stagedCount, turnComplete, humanStreet, finish]);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i === null) return null;
      if (i >= SCORING) {
        onDoneRef.current();
        return null;
      }
      return i + 1;
    });
  }, []);

  const visible = all.filter((s): s is CoachStep => s !== null);
  const step = index === null ? null : (all[index] ?? null);
  return {
    step: index === WAIT ? null : step,
    position: step ? visible.indexOf(step) + 1 : 0,
    total: visible.length,
    isLast: index === SCORING,
    next,
    skip: finish,
    request: useCallback(() => setRequested(true), []),
    requested,
  };
};
