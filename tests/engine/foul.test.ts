import { describe, expect, it } from 'vitest';
import { checkFoul, isBoardComplete } from '../../src/engine';
import { board } from './helpers';

describe('checkFoul', () => {
  it('accepts back > mid > front', () => {
    expect(checkFoul(board('2s 3h 7d', 'Ks Kh 9d 5c 2d', 'As Ah Ad 4c 4d'))).toBe(false);
  });

  it('fouls when the middle beats the back', () => {
    expect(checkFoul(board('2s 3h 7d', 'As Ah Ad 4c 4d', 'Ks Kh 9d 5c 2d'))).toBe(true);
  });

  it('fouls when a front pair is stronger than a middle high card', () => {
    expect(checkFoul(board('Qs Qh 7d', 'Kd Jh 9d 5c 2d', 'Ac Ah Ad 4c 4s'))).toBe(true);
  });

  it('fouls when front trips beat a middle pair', () => {
    expect(checkFoul(board('5s 5h 5d', 'Ks Kh 9d 3c 2d', 'As Ah Ad 4c 4h'))).toBe(true);
  });

  it('allows a middle row that matches the front in its top cards (tie is legal)', () => {
    // front A-K-Q high; mid A-K-Q-J-9 high; back two pair
    expect(checkFoul(board('Ah Kd Qc', 'As Kh Qd Jc 9s', '2s 2h 3d 3c 4s'))).toBe(false);
  });

  it('fouls when the middle pair has a weaker kicker than the front pair', () => {
    // front pair of nines with king kicker beats mid pair of nines with eight kicker
    expect(checkFoul(board('9h 9d Kc', '9s 9c 8h 5d 4s', 'Ah Ad 2d 2c 3s'))).toBe(true);
  });

  it('allows equal categories decided by rank between mid and back', () => {
    expect(checkFoul(board('2s 3h 7d', 'Ks Kh 9d 5c 2d', 'Ah Ad 9c 4d 3s'))).toBe(false);
  });

  it('fouls when the mid pair outranks the back pair', () => {
    expect(checkFoul(board('2s 3h 7d', 'As Ah 9d 5c 3d', 'Ks Kh 9c 8d 4s'))).toBe(true);
  });

  it('a middle straight beats a back trips (foul)', () => {
    expect(checkFoul(board('2s 3h 7d', '9s 8h 7c 6d 5c', 'Ks Kh Kd 4c 2c'))).toBe(true);
  });

  it('never reports an incomplete board as fouled', () => {
    expect(checkFoul({ front: [], mid: [], back: [] })).toBe(false);
    const partial = board('Qs Qh', '2s 3h', 'Ah');
    expect(isBoardComplete(partial)).toBe(false);
    expect(checkFoul(partial)).toBe(false);
  });
});
