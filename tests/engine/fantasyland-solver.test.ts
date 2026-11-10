import { describe, expect, it } from 'vitest';
import { solveFantasyland } from '../../src/ai';
import { checkFoul, evaluateRow, rowRoyalty, seededDeck, type Board, type Card } from '../../src/engine';
import { cards } from './helpers';

const toBoard = (held: readonly Card[], plan: ReturnType<typeof solveFantasyland>): Board => {
  const byId = new Map(held.map((c) => [c.id, c]));
  const board: Record<'front' | 'mid' | 'back', Card[]> = { front: [], mid: [], back: [] };
  for (const p of plan.placements) {
    const card = byId.get(p.cardId);
    if (card) board[p.row].push(card);
  }
  return board;
};

describe('solveFantasyland', () => {
  it('uses 13 distinct cards, discards the rest, and never fouls (random 14-17 card hands)', () => {
    for (let i = 0; i < 40; i++) {
      const n = 14 + (i % 4);
      const held = seededDeck(`fl-solver-${i}`).slice(0, n);
      const plan = solveFantasyland(held);
      const placed = plan.placements.map((p) => p.cardId);
      expect(placed).toHaveLength(13);
      expect(new Set([...placed, ...plan.discards]).size).toBe(n);
      expect(plan.discards).toHaveLength(n - 13);
      const board = toBoard(held, plan);
      expect(board.front).toHaveLength(3);
      expect(board.mid).toHaveLength(5);
      expect(board.back).toHaveLength(5);
      expect(checkFoul(board)).toBe(false);
    }
  });

  it('takes the biggest royalties available: aces in front (9) beats a back full house (6)', () => {
    const held = cards('Ks Kh Kd 4c 4s As Ah 9d 8c 7s 5h 3d 2c 2d');
    const board = toBoard(held, solveFantasyland(held));
    expect(checkFoul(board)).toBe(false);
    expect(rowRoyalty(evaluateRow(board.front, 'front'), 'front')).toBe(9);
  });

  it('makes the full house when it is the best use of the cards', () => {
    const held = cards('Ks Kh Kd 4c 4s 9d 9h 8c 7s 5h 3d 2c 2d 6s');
    const board = toBoard(held, solveFantasyland(held));
    expect(checkFoul(board)).toBe(false);
    const total =
      rowRoyalty(evaluateRow(board.front, 'front'), 'front') +
      rowRoyalty(evaluateRow(board.mid, 'mid'), 'mid') +
      rowRoyalty(evaluateRow(board.back, 'back'), 'back');
    expect(total).toBeGreaterThanOrEqual(6);
    expect(evaluateRow(board.back, 'back').name).toMatch(/Full House/);
  });

  it('keeps quads in the back to stay in Fantasyland', () => {
    const held = cards('9s 9h 9d 9c Ks Qh Jd 8c 7s 5h 4d 3c 2d 6s');
    const plan = solveFantasyland(held);
    const board = toBoard(held, plan);
    expect(evaluateRow(board.back, 'back').name).toBe('Four Nines');
    expect(checkFoul(board)).toBe(false);
  });

  it('is fast enough for the largest (17 card) hand', () => {
    const held = seededDeck('timing').slice(0, 17);
    const t0 = performance.now();
    solveFantasyland(held);
    expect(performance.now() - t0).toBeLessThan(3000);
  });
});
