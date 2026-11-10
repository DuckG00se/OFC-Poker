import { describe, expect, it } from 'vitest';
import { scoreHand } from '../../src/engine';
import { revealPlan } from '../../src/ui/useGameFeedback';
import { board } from '../engine/helpers';

describe('revealPlan (score reveal stages)', () => {
  it('has a bonus stage when there is a scoop or any royalty', () => {
    const strong = board('Js Jh 4d', 'Ks Kh Kd 7c 2s', 'As Ah Ad 9c 9d');
    const weak = board('2c 3d 5h', '3h 6d 9s Tc Jc', '4s 4h 8d Qd Qc');
    expect(revealPlan(scoreHand({ human: strong, ai: weak }))).toEqual({ rows: 3, bonuses: 4, total: 5 });
  });

  it('skips the bonus stage when there is nothing to show (no dead beat)', () => {
    const left = board('Ah Kd 4c', 'As Kh Qd Jc 9s', '2s 2h 3d 3c 4s');
    const right = board('Ad Kc 4h', 'Ac Ks Qh Jd 9d', '2d 2c 3h 3s 4d');
    expect(revealPlan(scoreHand({ human: left, ai: right }))).toEqual({ rows: 3, bonuses: null, total: 4 });
  });

  it('shows the foul penalty as a bonus stage', () => {
    const fouled = board('Qs Qh 7d', 'Kc Th 6h 3s 5d', 'Ac 7h 7s 8c 8s');
    const weak = board('2c 3d 5h', '3h 6d 9s Tc Jc', '4s 4h 8d Qd Qc');
    expect(revealPlan(scoreHand({ human: fouled, ai: weak })).bonuses).toBe(4);
  });

  it('handles "no result yet"', () => {
    expect(revealPlan(null)).toEqual({ rows: 3, bonuses: null, total: 4 });
  });
});
