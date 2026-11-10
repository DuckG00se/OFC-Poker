import { useCallback, useEffect, useRef, useState } from 'react';

export interface ScoreReveal {
  /** 0 = nothing revealed yet ... `steps` = everything shown. */
  stage: number;
  done: boolean;
  /** Jump straight to the end. */
  skip: () => void;
}

/**
 * Steps through the scoring sequence one stage at a time. `handKey` identifies the scored
 * hand (null while no hand is scored). A hand that is already scored when the screen first
 * appears (a resumed game) is shown complete, without replaying the sequence. With
 * `stepMs` of 0 (reduced motion) everything appears at once.
 */
export const useScoreReveal = (handKey: string | null, steps: number, stepMs: number): ScoreReveal => {
  const [revealed, setRevealed] = useState<{ key: string; stage: number } | null>(() =>
    handKey !== null ? { key: handKey, stage: steps } : null,
  );
  const finished = useRef<string | null>(handKey);

  useEffect(() => {
    if (handKey === null || finished.current === handKey) return;
    if (stepMs <= 0) {
      finished.current = handKey;
      setRevealed({ key: handKey, stage: steps });
      return;
    }
    let stage = 0;
    setRevealed({ key: handKey, stage: 0 });
    const id = window.setInterval(() => {
      if (finished.current === handKey) {
        window.clearInterval(id);
        return;
      }
      stage++;
      setRevealed({ key: handKey, stage });
      if (stage >= steps) {
        finished.current = handKey;
        window.clearInterval(id);
      }
    }, stepMs);
    return () => window.clearInterval(id);
  }, [handKey, steps, stepMs]);

  const skip = useCallback(() => {
    if (handKey === null) return;
    finished.current = handKey;
    setRevealed({ key: handKey, stage: steps });
  }, [handKey, steps]);

  const stage = handKey !== null && revealed?.key === handKey ? revealed.stage : 0;
  return { stage, done: handKey !== null && stage >= steps, skip };
};

/** Animates a number towards `target` (ease-out). With `ms` of 0 it just returns the target. */
export const useCountUp = (target: number, ms: number): number => {
  const [value, setValue] = useState(target);
  const shown = useRef(target);

  useEffect(() => {
    if (ms <= 0 || shown.current === target) {
      shown.current = target;
      setValue(target);
      return;
    }
    const from = shown.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - (1 - t) ** 3;
      const current = Math.round(from + (target - from) * eased);
      shown.current = current;
      setValue(current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return value;
};
