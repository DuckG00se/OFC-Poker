import { describe, expect, it } from 'vitest';
import { HandCategory, compareRows } from '../../src/engine';
import { ev } from './helpers';

describe('evaluateRow: every hand type (5-card rows)', () => {
  it.each([
    ['Ah Kh Qh Jh Th', HandCategory.StraightFlush, 'Royal Flush'],
    ['9s 8s 7s 6s 5s', HandCategory.StraightFlush, 'Straight Flush'],
    ['9s 9h 9d 9c 2s', HandCategory.Quads, 'Four Nines'],
    ['Ks Kh Kd 4c 4s', HandCategory.FullHouse, 'Full House, Kings full'],
    ['As 9s 7s 4s 2s', HandCategory.Flush, 'Flush, Ace high'],
    ['9s 8h 7d 6c 5s', HandCategory.Straight, 'Straight, Nine high'],
    ['7s 7h 7d Kc 2s', HandCategory.Trips, 'Three Sevens'],
    ['Js Jh 4d 4c As', HandCategory.TwoPair, 'Two Pair, Jacks and Fours'],
    ['Qs Qh 8d 4c 2s', HandCategory.Pair, 'Pair of Queens'],
    ['As Jh 8d 4c 2s', HandCategory.HighCard, 'A High'],
  ])('%s', (text, category, name) => {
    const e = ev(text);
    expect(e.category).toBe(category);
    expect(e.name).toBe(name);
  });

  it('only a royal straight flush is flagged royal', () => {
    expect(ev('Ah Kh Qh Jh Th').isRoyalFlush).toBe(true);
    expect(ev('Kh Qh Jh Th 9h').isRoyalFlush).toBe(false);
  });
});

describe('straights', () => {
  it('treats A-2-3-4-5 (wheel) as a straight', () => {
    const wheel = ev('As 2h 3d 4c 5s');
    expect(wheel.category).toBe(HandCategory.Straight);
    expect(wheel.tiebreak).toEqual([5]);
  });

  it('ranks the wheel below a 6-high straight and below broadway', () => {
    const wheel = ev('As 2h 3d 4c 5s');
    expect(compareRows(ev('2s 3h 4d 5c 6s'), wheel)).toBeGreaterThan(0);
    expect(compareRows(ev('As Kh Qd Jc Ts'), wheel)).toBeGreaterThan(0);
  });

  it('does not wrap around (Q-K-A-2-3 is not a straight)', () => {
    expect(ev('Qs Kh Ad 2c 3s').category).toBe(HandCategory.HighCard);
  });

  it('handles a steel wheel (5-high straight flush) and ranks it below a 6-high one', () => {
    const steel = ev('As 2s 3s 4s 5s');
    expect(steel.category).toBe(HandCategory.StraightFlush);
    expect(steel.isRoyalFlush).toBe(false);
    expect(compareRows(ev('2h 3h 4h 5h 6h'), steel)).toBeGreaterThan(0);
  });

  it('requires five distinct ranks (a pair is never a straight)', () => {
    expect(ev('5s 5h 4d 3c 2s').category).toBe(HandCategory.Pair);
  });
});

describe('kickers and tiebreaks', () => {
  it('pair: higher kicker wins, then second and third kickers', () => {
    expect(compareRows(ev('9s 9h Ad 4c 2s'), ev('9d 9c Kd Qc Js'))).toBeGreaterThan(0);
    expect(compareRows(ev('9s 9h Ad Kc 2s'), ev('9d 9c Ad Qc Js'))).toBeGreaterThan(0);
    expect(compareRows(ev('9s 9h Ad Kc 3s'), ev('9d 9c Ah Kd 2s'))).toBeGreaterThan(0);
  });

  it('pair rank beats kickers', () => {
    expect(compareRows(ev('3s 3h Ad Kc Qs'), ev('2d 2c Ah Kd Qh'))).toBeGreaterThan(0);
  });

  it('two pair: top pair, then lower pair, then kicker', () => {
    expect(compareRows(ev('Ks Kh 2d 2c 3s'), ev('Qd Qc Jd Jc As'))).toBeGreaterThan(0);
    expect(compareRows(ev('Ks Kh 5d 5c 3s'), ev('Kd Kc 4d 4c As'))).toBeGreaterThan(0);
    expect(compareRows(ev('Ks Kh 5d 5c Ts'), ev('Kd Kc 5h 5s 9d'))).toBeGreaterThan(0);
  });

  it('flush and high card compare card by card', () => {
    expect(compareRows(ev('As Ks 9s 4s 2s'), ev('Ah Kh 9h 4h 3h'))).toBeLessThan(0);
    expect(compareRows(ev('As Kh 9d 4c 3s'), ev('Ah Kd 9c 4s 2h'))).toBeGreaterThan(0);
  });

  it('quads: a higher quad rank wins regardless of kicker', () => {
    expect(compareRows(ev('3s 3h 3d 3c 2s'), ev('2s 2h 2d 2c As'))).toBeGreaterThan(0);
  });

  it('quads: the kicker decides identical quad ranks (as in a split-deck unit comparison)', () => {
    expect(compareRows(ev('3s 3h 3d 3c Ks'), ev('3s 3h 3d 3c Qs'))).toBeGreaterThan(0);
  });

  it('full house: trips rank beats pair rank', () => {
    expect(compareRows(ev('3s 3h 3d 2c 2s'), ev('2d 2h 2c As Ah'))).toBeGreaterThan(0);
    expect(compareRows(ev('3s 3h 3d Ac As'), ev('3s 3h 3d Kc Ks'))).toBeGreaterThan(0);
  });

  it('suits never break ties', () => {
    expect(compareRows(ev('As Kh 9d 4c 2s'), ev('Ah Kd 9c 4s 2h'))).toBe(0);
  });
});

describe('three-card front row', () => {
  it('only makes high card, pair and trips', () => {
    expect(ev('Ah Kh Qh', 'front').category).toBe(HandCategory.HighCard); // no flush
    expect(ev('5s 4h 3d', 'front').category).toBe(HandCategory.HighCard); // no straight
    expect(ev('Qs Qh 4d', 'front').category).toBe(HandCategory.Pair);
    expect(ev('7s 7h 7d', 'front').category).toBe(HandCategory.Trips);
  });

  it('compares a front pair with kickers', () => {
    expect(compareRows(ev('Qs Qh Ad', 'front'), ev('Qd Qc Kd', 'front'))).toBeGreaterThan(0);
  });

  it('five-card hand beats three-card hand by category', () => {
    // mid pair of deuces vs front high card
    expect(compareRows(ev('2s 2h 9d 5c 3s', 'mid'), ev('Ah Kd Qc', 'front'))).toBeGreaterThan(0);
    // front trips beats mid two pair
    expect(compareRows(ev('2s 2h 2d', 'front'), ev('As Ah Kd Kc 3s', 'mid'))).toBeGreaterThan(0);
  });

  it('a front matched by the top cards of the mid row is a tie, not a loss', () => {
    // front A-K-Q high card vs mid A-K-Q-4-2 high card
    expect(compareRows(ev('Ah Kd Qc', 'front'), ev('As Kh Qd 4c 2s', 'mid'))).toBe(0);
    // front pair of 9s with king kicker vs mid pair of 9s with K-5-4
    expect(compareRows(ev('9h 9d Kc', 'front'), ev('9s 9c Kh 5d 4s', 'mid'))).toBe(0);
  });

  it('a mid with a weaker kicker loses to the same-pair front', () => {
    expect(compareRows(ev('9h 9d Kc', 'front'), ev('9s 9c 8h 5d 4s', 'mid'))).toBeGreaterThan(0);
  });
});

describe('partial rows (for live helpers)', () => {
  it('evaluates what is there', () => {
    expect(ev('As Ah', 'mid').category).toBe(HandCategory.Pair);
    expect(ev('As Ah Ks Kh', 'mid').category).toBe(HandCategory.TwoPair);
    expect(ev('As', 'back').name).toBe('A High');
    expect(ev('', 'back').name).toBe('Empty');
  });

  it('four suited cards are not yet a flush', () => {
    expect(ev('As 9s 7s 4s', 'mid').category).toBe(HandCategory.HighCard);
  });
});
