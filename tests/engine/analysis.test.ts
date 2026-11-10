import { describe, expect, it } from 'vitest';
import { createDeck, foulStatus, parseCards, rowOuts, royaltyPreview, type Board } from '../../src/engine';
import { board } from './helpers';

const unseenFor = (b: Board, extraSeen = '') => {
  const seen = new Set([...b.front, ...b.mid, ...b.back, ...parseCards(extraSeen)].map((c) => c.id));
  return createDeck().filter((c) => !seen.has(c.id));
};

describe('rowOuts', () => {
  it('counts flush outs exactly, excluding dead cards', () => {
    const b = board('2c', '', 'As 9s 7s 4s');
    // 13 spades - 4 on board = 9 live
    expect(rowOuts(b, 'back', unseenFor(b))).toContainEqual({ label: 'Flush', outs: 9, needs: 1 });
    // two more spades are visible elsewhere (e.g. on the opponent's board)
    expect(rowOuts(b, 'back', unseenFor(b, 'Ks Qs'))).toContainEqual({ label: 'Flush', outs: 7, needs: 1 });
  });

  it('counts open-ended and gutshot straight outs', () => {
    const open = board('', '', '9s 8h 7d 6c');
    expect(rowOuts(open, 'back', unseenFor(open))).toContainEqual({ label: 'Straight', outs: 8, needs: 1 });
    const gut = board('', '', '9s 8h 6d 5c');
    expect(rowOuts(gut, 'back', unseenFor(gut))).toContainEqual({ label: 'Straight', outs: 4, needs: 1 });
  });

  it('lists the best improvements first (full house before trips)', () => {
    const b = board('', 'Ks Kh 4d 4c', '');
    const outs = rowOuts(b, 'mid', unseenFor(b));
    expect(outs[0]).toEqual({ label: 'Full house', outs: 4, needs: 1 });
  });

  it('flags Fantasyland outs on the front row when Fantasyland is on', () => {
    const b = board('Qs 7d', '', '');
    const on = rowOuts(b, 'front', unseenFor(b), 'progressive');
    expect(on[0]).toEqual({ label: 'Fantasyland', outs: 3, needs: 1 });
    const off = rowOuts(b, 'front', unseenFor(b), 'off');
    expect(off.some((o) => o.label === 'Fantasyland')).toBe(false);
    expect(off[0]).toEqual({ label: 'Pair', outs: 6, needs: 1 });
  });

  it('reports a two-card flush draw with the live cards of the suit', () => {
    const b = board('', 'Ah 9h 4h', '');
    expect(rowOuts(b, 'mid', unseenFor(b))).toEqual([{ label: 'Flush draw', outs: 10, needs: 2 }]);
  });

  it('returns nothing for full or empty rows', () => {
    const b = board('Qs Qh 2d', '', '');
    expect(rowOuts(b, 'front', unseenFor(b))).toEqual([]);
    expect(rowOuts(b, 'mid', unseenFor(b))).toEqual([]);
  });
});

describe('royaltyPreview', () => {
  it('counts made front pairs and trips immediately', () => {
    expect(royaltyPreview(board('Qs Qh', '', '')).front).toBe(7);
    expect(royaltyPreview(board('5s 5h', '', '')).front).toBe(0);
  });

  it('counts middle/back trips before the row is full, but a flush only when complete', () => {
    expect(royaltyPreview(board('', '7s 7h 7d', '')).mid).toBe(2);
    expect(royaltyPreview(board('', '', 'As 9s 7s 4s')).back).toBe(0);
    expect(royaltyPreview(board('', '', 'As 9s 7s 4s 2s')).back).toBe(4);
  });
});

describe('foulStatus', () => {
  it('is "open" for an empty or healthy board', () => {
    const b = board('2s', 'Ks Kh', 'As Ah Ad');
    expect(foulStatus(b, unseenFor(b))).toBe('open');
  });

  it('reports a finished board as safe or fouled', () => {
    expect(foulStatus(board('2s 3h 7d', 'Ks Kh 9d 5c 2d', 'As Ah Ad 4c 4d'), [])).toBe('safe');
    expect(foulStatus(board('Qs Qh 7d', 'Kd Jh 9d 5c 2d', 'Ac Ah Ad 4c 4s'), [])).toBe('fouled');
  });

  it('is certain when a partial front already beats a complete middle row', () => {
    const b = board('Qs Qh', 'Kd Jh 9d 5c 2d', 'Ac Ah');
    expect(foulStatus(b, unseenFor(b))).toBe('certain');
  });

  it('is certain when a partial middle already beats a complete back row', () => {
    const b = board('2s', 'As Ah', 'Kd Kh 9d 5c 2d');
    expect(foulStatus(b, unseenFor(b))).toBe('certain');
  });

  it('is certain when the middle cannot catch a finished front with the cards left', () => {
    // Front trips; the middle has one slot left. With both other kings dead it can make
    // two pair at best, which loses to trips.
    const b = board('5s 5h 5d', 'Ks Kh 9d 3c', 'As Ah Ad');
    expect(foulStatus(b, unseenFor(b, 'Kd Kc'))).toBe('certain');
    // With a king still live, trip kings would save it.
    expect(foulStatus(b, unseenFor(b))).toBe('open');
  });

  it('stays open when a live card can still save the board', () => {
    // Front pair of 9s; the middle needs to pair its king (or better) and kings are live.
    const b = board('9s 9h 2d', 'Ks Qh 7d 3c', 'As Ah Ad');
    expect(foulStatus(b, unseenFor(b))).toBe('open');
    // ...but if every saving card is dead it becomes certain.
    const dead = createDeck().filter((c) => c.rank === 2 && c.suit !== 'd');
    expect(foulStatus(b, dead)).toBe('certain');
  });

  it('counts cards still in hand as available', () => {
    const b = board('9s 9h 2d', 'Ks Qh 7d 3c', 'As Ah Ad');
    expect(foulStatus(b, parseCards('Kd'))).toBe('open');
  });
});
