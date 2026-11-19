import { useCallback, useEffect, useRef, useState } from 'react';
import { TUTORIAL } from '../content/onboarding';
import type { Card, GameState, HandScore } from '../engine';
import { firstHandAdvice } from './onboarding';

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
  /** The last step celebrates the finished hand. */
  celebrate?: boolean;
}

const PLACE = 2;
const ARRANGE = 3;
const CONFIRM = 4;
const CPU = 5;
const WAIT = 8;
const SCORING = 9;

interface BuildInput {
  pineapple: boolean;
  cpuName: string;
  /** The five opening cards, captured when the tutorial began. */
  opening: readonly Card[];
  result: HandScore | null;
}

/** The steps of the guided hand, in order. `null` is a stretch of free play with no note. */
const buildSteps = ({ pineapple, cpuName, opening, result }: BuildInput): readonly (CoachStep | null)[] => {
  const fouled = result?.seats.human.fouled ?? false;
  const points = result?.points.human ?? 0;
  const finished = TUTORIAL.finished(points, fouled);
  return [
    { id: 'welcome', ...TUTORIAL.welcome, target: 'board', place: 'top', manual: true },
    { id: 'rule', ...TUTORIAL.rule, target: 'board', place: 'top', manual: true },
    {
      id: 'place',
      title: TUTORIAL.place.title,
      body: `${TUTORIAL.place.body} ${firstHandAdvice(opening)}`,
      target: 'hand',
      place: 'top',
      manual: false,
    },
    { id: 'arrange', ...TUTORIAL.arrange, target: 'board', place: 'top', manual: false },
    { id: 'confirm', ...TUTORIAL.confirm, target: 'confirm', place: 'top', manual: false },
    { id: 'cpu', ...TUTORIAL.cpu(cpuName), target: 'cpu', place: 'bottom', manual: true },
    { id: 'draw', ...TUTORIAL.draw(pineapple), target: 'hand', place: 'top', manual: true },
    { id: 'helpers', ...TUTORIAL.helpers, target: 'board', place: 'top', manual: true },
    null, // play on undisturbed until the hand is scored
    {
      id: 'scoring',
      title: finished.title,
      body: `${finished.body} ${TUTORIAL.scoring.body}`,
      target: 'score',
      place: 'top',
      manual: true,
      celebrate: true,
    },
  ];
};

export type TutorialOutcome = 'completed' | 'skipped';

interface TutorialInput {
  game: GameState;
  cpuName: string;
  /** Cards the player has staged this turn. */
  stagedCount: number;
  /** The player's turn is fully staged. */
  turnComplete: boolean;
  /** The score reveal has finished. */
  scoreShown: boolean;
  /** Called when the tutorial is finished (completed) or dismissed (skipped). */
  onDone: (outcome: TutorialOutcome) => void;
}

export interface Tutorial {
  /** A tutorial is running (even during the stretch of free play with no note). */
  active: boolean;
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
  const opening = useRef<readonly Card[]>([]);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const humanStreet = game.seats.human.street;
  const scored = game.phase === 'scored';

  const finish = useCallback((outcome: TutorialOutcome) => {
    setIndex(null);
    onDoneRef.current(outcome);
  }, []);

  // Start when a requested tutorial meets a freshly dealt hand.
  useEffect(() => {
    if (!requested || game.phase !== 'placing' || seed === null) return;
    if (game.log.length > 1) return; // only at the very start of a hand
    startedFor.current = seed;
    opening.current = game.turn?.dealt ?? [];
    setRequested(false);
    setIndex(0);
  }, [requested, game.phase, game.log.length, game.turn, seed]);

  // Move on when the player does what the step asked, and catch up if they run ahead.
  useEffect(() => {
    if (index === null) return;
    if (seed !== startedFor.current) {
      finish('completed'); // the tutorial's hand is over and another has begun
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
    if (index === null) return;
    if (index >= SCORING) finish('completed');
    else setIndex(index + 1);
  }, [index, finish]);

  const all = buildSteps({
    pineapple: game.setup?.config.variant === 'pineapple',
    cpuName,
    opening: opening.current,
    result: game.result,
  });
  const visible = all.filter((s): s is CoachStep => s !== null);
  const step = index === null ? null : (all[index] ?? null);
  return {
    active: index !== null,
    step: index === WAIT ? null : step,
    position: step ? visible.indexOf(step) + 1 : 0,
    total: visible.length,
    isLast: index === SCORING,
    next,
    skip: useCallback(() => finish('skipped'), [finish]),
    request: useCallback(() => setRequested(true), []),
    requested,
  };
};
