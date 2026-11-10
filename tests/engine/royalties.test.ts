import { describe, expect, it } from 'vitest';
import {
  evaluateRow,
  fantasylandEntryCards,
  nextFantasyland,
  rowRoyalty,
  staysInFantasyland,
  type RowName,
} from '../../src/engine';
import { board, cards } from './helpers';

const royalty = (text: string, row: RowName): number =>
  rowRoyalty(evaluateRow(cards(text), row), row);

describe('front row royalties', () => {
  it.each([
    ['6s 6h 2d', 1], ['7s 7h 2d', 2], ['8s 8h 2d', 3], ['9s 9h 2d', 4], ['Ts Th 2d', 5],
    ['Js Jh 2d', 6], ['Qs Qh 2d', 7], ['Ks Kh 2d', 8], ['As Ah 2d', 9],
  ])('pair %s = %i', (text, points) => {
    expect(royalty(text, 'front')).toBe(points);
  });

  it('pairs below sixes and high cards pay nothing', () => {
    expect(royalty('5s 5h Ad', 'front')).toBe(0);
    expect(royalty('2s 2h Ad', 'front')).toBe(0);
    expect(royalty('As Kh Qd', 'front')).toBe(0);
  });

  it('trips pay 10 (deuces) up to 22 (aces)', () => {
    expect(royalty('2s 2h 2d', 'front')).toBe(10);
    expect(royalty('9s 9h 9d', 'front')).toBe(17);
    expect(royalty('As Ah Ad', 'front')).toBe(22);
  });
});

describe('middle row royalties (double the back)', () => {
  it.each([
    ['7s 7h 7d Kc 2s', 2],
    ['9s 8h 7d 6c 5s', 4],
    ['As 9s 7s 4s 2s', 8],
    ['Ks Kh Kd 4c 4s', 12],
    ['9s 9h 9d 9c 2s', 20],
    ['9s 8s 7s 6s 5s', 30],
    ['Ah Kh Qh Jh Th', 50],
    ['Ks Kh 9d 5c 2s', 0],
    ['Js Jh 4d 4c As', 0],
  ])('%s = %i', (text, points) => {
    expect(royalty(text, 'mid')).toBe(points);
  });
});

describe('back row royalties', () => {
  it.each([
    ['7s 7h 7d Kc 2s', 0],
    ['9s 8h 7d 6c 5s', 2],
    ['As 9s 7s 4s 2s', 4],
    ['Ks Kh Kd 4c 4s', 6],
    ['9s 9h 9d 9c 2s', 10],
    ['9s 8s 7s 6s 5s', 15],
    ['Ah Kh Qh Jh Th', 25],
  ])('%s = %i', (text, points) => {
    expect(royalty(text, 'back')).toBe(points);
  });

  it('wheel straight pays like any straight', () => {
    expect(royalty('As 2h 3d 4c 5s', 'back')).toBe(2);
    expect(royalty('As 2h 3d 4c 5s', 'mid')).toBe(4);
  });
});

describe('Fantasyland entry', () => {
  const front = (text: string) => evaluateRow(cards(text), 'front');

  it('requires QQ or better in front', () => {
    expect(fantasylandEntryCards(front('Js Jh 2d'), 'flat')).toBe(0);
    expect(fantasylandEntryCards(front('Qs Qh 2d'), 'flat')).toBe(14);
    expect(fantasylandEntryCards(front('Ks Kh 2d'), 'flat')).toBe(14);
    expect(fantasylandEntryCards(front('2s 2h 2d'), 'flat')).toBe(14);
    expect(fantasylandEntryCards(front('As Kh Qd'), 'flat')).toBe(0);
  });

  it('progressive mode scales 14 / 15 / 16 / 17', () => {
    expect(fantasylandEntryCards(front('Qs Qh 2d'), 'progressive')).toBe(14);
    expect(fantasylandEntryCards(front('Ks Kh 2d'), 'progressive')).toBe(15);
    expect(fantasylandEntryCards(front('As Ah 2d'), 'progressive')).toBe(16);
    expect(fantasylandEntryCards(front('2s 2h 2d'), 'progressive')).toBe(17);
  });

  it('is disabled when the mode is off', () => {
    expect(fantasylandEntryCards(front('As Ah 2d'), 'off')).toBe(0);
  });
});

describe('nextFantasyland', () => {
  const qqFront = board('Qs Qh 2d', 'Ks Kh 9d 5c 2c', 'As Ah Ad 4c 4d');
  const aaFront = board('As Ah 2d', 'Ks Kh Kd 5c 5d', '3s 3h 3d 3c 9s');

  it('grants entry for a legal QQ+ front', () => {
    expect(nextFantasyland(qqFront, false, 'flat')).toBe(14);
    expect(nextFantasyland(aaFront, false, 'progressive')).toBe(16);
  });

  it('denies entry when the board fouls, even with QQ in front', () => {
    const fouled = board('Qs Qh 2d', 'As Ah Ad 4c 4d', 'Ks Kh 9d 5c 2c');
    expect(nextFantasyland(fouled, false, 'flat')).toBe(0);
  });

  it('denies entry when the mode is off', () => {
    expect(nextFantasyland(qqFront, false, 'off')).toBe(0);
  });

  it('a player already in Fantasyland needs a stay condition, not just QQ', () => {
    expect(nextFantasyland(qqFront, true, 'flat')).toBe(0);
  });
});

describe('Fantasyland stay conditions', () => {
  it('front trips', () => {
    expect(staysInFantasyland(board('5s 5h 5d', 'Ks Kh 9d 3c 2d', 'As Ah Ad 4c 4h'))).toBe(false);
    expect(staysInFantasyland(board('2s 2h 2d', 'Ks Kh Kd 3c 4d', 'As Ah Ad 7c 7h'))).toBe(true);
  });

  it('mid full house or better', () => {
    expect(staysInFantasyland(board('2s 3h 7d', 'Ks Kh Kd 4c 4s', 'As Ah Ad 5c 5d'))).toBe(true);
  });

  it('back quads or better', () => {
    expect(staysInFantasyland(board('2s 3h 7d', 'Js Jh 9d 5c 2d', '9s 9h 9c 9d As'))).toBe(true);
  });

  it('back full house alone is not enough', () => {
    expect(staysInFantasyland(board('2s 3h 7d', 'Js Jh 9d 5c 2d', 'As Ah Ad 5h 5s'))).toBe(false);
  });

  it('a fouled board never stays', () => {
    expect(staysInFantasyland(board('2s 2h 2d', 'As Ah Ad 4c 4d', 'Ks Kh 9d 5c 3c'))).toBe(false);
  });

  it('progressive stay uses the front hand, falling back to 14', () => {
    const tripsFront = board('2s 2h 2d', 'Ks Kh Kd 3c 4d', 'As Ah Ad 7c 7h');
    expect(nextFantasyland(tripsFront, true, 'progressive')).toBe(17);
    expect(nextFantasyland(tripsFront, true, 'flat')).toBe(14);
    const midBoat = board('2s 3h 7d', 'Ks Kh Kd 4c 4s', 'As Ah Ad 5c 5d');
    expect(nextFantasyland(midBoat, true, 'progressive')).toBe(14);
  });
});
