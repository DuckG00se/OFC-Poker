import { useEffect, useRef } from 'react';
import { ROW_NAMES, type GameState, type HandScore } from '../engine';
import { sound, vibrate } from './sound';

/**
 * The score reveal, as numbered stages: rows are stages 1-3 (front, middle, back), then one
 * stage for bonuses and royalties (skipped when there are none, so there is no dead beat),
 * then the total.
 */
export interface RevealPlan {
  rows: 3;
  /** Stage at which scoop / foul / royalties appear, or null if there is nothing to show. */
  bonuses: number | null;
  /** The final stage. */
  total: number;
}

export const revealPlan = (result: HandScore | null): RevealPlan => {
  const hasBonuses =
    result !== null &&
    (result.scoop !== 0 ||
      result.seats.human.royaltyTotal > 0 ||
      result.seats.ai.royaltyTotal > 0);
  return hasBonuses ? { rows: 3, bonuses: 4, total: 5 } : { rows: 3, bonuses: null, total: 4 };
};

interface FeedbackOptions {
  sound: boolean;
  haptics: boolean;
  /** Current stage of the score reveal. */
  stage: number;
  plan: RevealPlan;
}

/**
 * Turns what happens in the game into sound and (on phones that support it) a light
 * vibration. It only listens: it compares the game state with what it has already reacted to,
 * so re-renders and resumed games never replay old sounds.
 */
export const useGameFeedback = (game: GameState, options: FeedbackOptions): void => {
  const seed = game.setup?.seed ?? '';
  const seenLog = useRef({ seed, count: game.log.length });
  const turnKey = game.turn ? `${seed}#${game.turn.seat}#${game.turn.street}` : null;
  const seenTurn = useRef<string | null>(turnKey);
  const seenStage = useRef({ seed, stage: options.stage });

  sound.enabled = options.sound;
  const buzz = (pattern: number | number[]): void => {
    if (options.haptics) vibrate(pattern);
  };

  // Placements, discards, undos and confirmations (both seats).
  useEffect(() => {
    if (seenLog.current.seed !== seed) seenLog.current = { seed, count: 0 };
    const fresh = game.log.slice(seenLog.current.count);
    seenLog.current.count = game.log.length;
    for (const action of fresh) {
      switch (action.type) {
        case 'PLACE':
        case 'MOVE':
          sound.play('place');
          if (action.seat === 'human') buzz(8);
          break;
        case 'DISCARD':
          sound.play('discard');
          if (action.seat === 'human') buzz(8);
          break;
        case 'UNDO':
          sound.play('undo');
          break;
        case 'CONFIRM':
          if (action.seat === 'human') {
            sound.play('confirm');
            buzz(14);
          }
          break;
        case 'START_HAND':
          break;
      }
    }
  });

  // Cards being dealt at the start of a turn.
  useEffect(() => {
    if (seenTurn.current === turnKey) return;
    seenTurn.current = turnKey;
    const turn = game.turn;
    if (!turn) return;
    const count = Math.min(turn.dealt.length, 6);
    for (let i = 0; i < count; i++) sound.play('deal', i * 0.07);
  });

  // The score reveal.
  useEffect(() => {
    const result = game.result;
    const prev = seenStage.current;
    seenStage.current = { seed, stage: options.stage };
    if (!result || game.phase !== 'scored' || prev.seed !== seed || options.stage <= prev.stage) return;

    const stage = options.stage;
    const plan = options.plan;
    if (stage >= plan.total) {
      const human = result.seats.human;
      const points = result.points.human;
      if (human.fouled) {
        sound.play('foul');
        buzz([60, 40, 60]);
      } else if (points > 0) {
        sound.play('win');
        buzz([15, 40, 25]);
      } else if (points < 0) {
        sound.play('lose');
      } else {
        sound.play('push');
      }
      if (game.fantasylandNext.human > 0) {
        sound.play('fantasyland', 0.55);
        buzz([20, 30, 20, 30, 40]);
      }
      return;
    }
    if (stage >= 1 && stage <= plan.rows) {
      const row = ROW_NAMES[stage - 1];
      const outcome = row ? result.rowResults[row] : 0;
      sound.play(outcome > 0 ? 'rowWin' : outcome < 0 ? 'rowLose' : 'rowTie');
    } else if (stage === plan.bonuses && result.scoop !== 0) {
      sound.play(result.scoop > 0 ? 'rowWin' : 'rowLose');
    }
  });
};
