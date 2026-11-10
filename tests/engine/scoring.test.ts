import { describe, expect, it } from 'vitest';
import { scoreHand } from '../../src/engine';
import { board } from './helpers';

// All boards below are legal and use disjoint cards.
const strong = board('Js Jh 4d', 'Ks Kh Kd 7c 2s', 'As Ah Ad 9c 9d'); // JJ (6), KKK (2), AAA99 (6)
const weak = board('2c 3d 5h', '3h 6d 9s Tc Jc', '4s 4h 8d Qd Qc'); // high card, high card, two pair
const fouledA = board('Qs Qh 7d', 'Kc Th 6h 3s 5d', 'Ac 7h 7s 8c 8s'); // front pair beats mid
const fouledB = board('Kd Ks 2h', 'Qd 9c 8d 4c 3c', 'Jd Jc Js 9d 2d'); // front pair beats mid

describe('scoreHand', () => {
  it('scores a scoop: 3 rows + 3 scoop bonus + royalties', () => {
    const score = scoreHand({ human: strong, ai: weak });
    expect(score.rowResults).toEqual({ front: 1, mid: 1, back: 1 });
    expect(score.scoop).toBe(3);
    expect(score.seats.human.royalties).toEqual({ front: 6, mid: 2, back: 6 });
    expect(score.seats.ai.royaltyTotal).toBe(0);
    expect(score.points.human).toBe(3 + 3 + 14);
    expect(score.points.ai).toBe(-20);
  });

  it('is zero-sum and symmetric', () => {
    const a = scoreHand({ human: strong, ai: weak });
    const b = scoreHand({ human: weak, ai: strong });
    expect(a.points.human).toBe(-b.points.human);
    expect(a.points.human + a.points.ai).toBe(0);
  });

  it('a split pays +1 per row won, -1 per row lost, no scoop, and nets royalties', () => {
    const human = board('Qs Qh 2d', 'Ks Kh 9d 5c 3s', 'Ac Ad 8h 8c 4h'); // QQ (7), pair K, A-A-8-8
    const ai = board('Jc Jd 3c', 'Qd Qc 4d 6c 7s', 'Tc Td Th 9h 9s'); // JJ (6), pair Q, T-T-T-9-9 (6)
    const score = scoreHand({ human, ai });
    expect(score.seats.human.fouled).toBe(false);
    expect(score.seats.ai.fouled).toBe(false);
    expect(score.rowResults).toEqual({ front: 1, mid: 1, back: -1 });
    expect(score.scoop).toBe(0);
    expect(score.seats.human.royaltyTotal).toBe(7);
    expect(score.seats.ai.royaltyTotal).toBe(12);
    expect(score.points.human).toBe(1 + 7 - 12);
  });

  it('counts a tied row as nothing', () => {
    const left = board('Ah Kd 4c', 'As Kh Qd Jc 9s', '2s 2h 3d 3c 4s');
    const right = board('Ad Kc 4h', 'Ac Ks Qh Jd 9d', '2d 2c 3h 3s 4d');
    const score = scoreHand({ human: left, ai: right });
    expect(score.rowResults).toEqual({ front: 0, mid: 0, back: 0 });
    expect(score.points).toEqual({ human: 0, ai: 0 });
  });

  it('a foul pays the opponent a full scoop (6); the fouler earns no royalties', () => {
    const score = scoreHand({ human: fouledA, ai: weak });
    expect(score.seats.human.fouled).toBe(true);
    expect(score.seats.human.royaltyTotal).toBe(0);
    expect(score.seats.ai.fouled).toBe(false);
    expect(score.rowResults).toEqual({ front: -1, mid: -1, back: -1 });
    expect(score.scoop).toBe(-3);
    expect(score.points).toEqual({ human: -6, ai: 6 });
  });

  it("the non-fouler's royalties are still collected", () => {
    const score = scoreHand({ human: fouledA, ai: strong });
    expect(score.points.human).toBe(-(6 + 14));
    const mirrored = scoreHand({ human: strong, ai: fouledA });
    expect(mirrored.points.human).toBe(6 + 14);
  });

  it('both players fouling is a wash', () => {
    const score = scoreHand({ human: fouledA, ai: fouledB });
    expect(score.points).toEqual({ human: 0, ai: 0 });
    expect(score.scoop).toBe(0);
    expect(score.rowResults).toEqual({ front: 0, mid: 0, back: 0 });
  });

  it('royalties offset each other when both players earn some', () => {
    const human = board('7s 7h 2d', 'Ks Kh 9d 5c 3d', 'As 9s 6s 4s 2s'); // 77 (2), pair K, flush (4)
    const ai = board('8c 8d 3c', 'Qs Qh Qd 6c 4c', 'Ac Ad Ah Kc Kd'); // 88 (3), trips (2), full house (6)
    const score = scoreHand({ human, ai });
    expect(score.seats.human.royaltyTotal).toBe(2 + 4);
    expect(score.seats.ai.royaltyTotal).toBe(3 + 2 + 6);
    expect(score.rowResults).toEqual({ front: -1, mid: -1, back: -1 });
    expect(score.points.human).toBe(-3 - 3 + (6 - 11));
  });
});
