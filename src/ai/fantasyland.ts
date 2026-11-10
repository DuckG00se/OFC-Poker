import {
  HandCategory,
  compareRows,
  evaluateRow,
  rowRoyalty,
  type Card,
  type RowEval,
} from '../engine';
import type { TurnPlan } from './types';

interface Candidate {
  mask: number;
  indexes: number[];
  ev: RowEval;
  obj: number;
}

const STAY_BONUS = 60; // worth about 6 points: the value of another Fantasyland hand

const combinations = (n: number, k: number): number[][] => {
  const out: number[][] = [];
  const cur: number[] = [];
  const rec = (start: number): void => {
    if (cur.length === k) {
      out.push([...cur]);
      return;
    }
    for (let i = start; i < n; i++) {
      cur.push(i);
      rec(i + 1);
      cur.pop();
    }
  };
  rec(0);
  return out;
};

const maskOf = (indexes: number[]): number => indexes.reduce((m, i) => m | (1 << i), 0);

/** Row objective in tenths of a point: royalties dominate, hand strength breaks ties. */
const rowObjective = (ev: RowEval, row: 'front' | 'mid' | 'back'): number =>
  rowRoyalty(ev, row) * 10 + ev.category * 3 + ((ev.tiebreak[0] ?? 0) / 14) * 2;

/**
 * Sets a Fantasyland hand (14-17 cards: place 13, discard the rest). Searches the strongest
 * back and middle candidates and, for each non-fouling pair, the best disjoint front rows.
 * Maximises royalties, with a bonus for hands that keep the player in Fantasyland.
 */
export const solveFantasyland = (held: readonly Card[]): TurnPlan => {
  const n = held.length;
  const pick = (indexes: number[]): Card[] => indexes.map((i) => held[i] as Card);

  const fives = combinations(n, 5).map((indexes) => {
    const ev = evaluateRow(pick(indexes), 'back');
    return { mask: maskOf(indexes), indexes, ev };
  });
  const toList = (row: 'mid' | 'back', limit: number): Candidate[] =>
    fives
      .map((f) => ({ ...f, obj: rowObjective(f.ev, row) }))
      .sort((a, b) => b.obj - a.obj)
      .slice(0, limit);
  const backs = toList('back', 700);
  const mids = toList('mid', 700);

  const threes: Candidate[] = combinations(n, 3)
    .map((indexes) => {
      const ev = evaluateRow(pick(indexes), 'front');
      return { mask: maskOf(indexes), indexes, ev, obj: rowObjective(ev, 'front') };
    })
    .sort((a, b) => b.obj - a.obj);
  const bestFront = threes[0]?.obj ?? 0;

  const stays = (b: Candidate, m: Candidate, f: Candidate): boolean =>
    f.ev.category === HandCategory.Trips ||
    m.ev.category >= HandCategory.FullHouse ||
    b.ev.category >= HandCategory.Quads;

  let best: { total: number; b: Candidate; m: Candidate; f: Candidate } | null = null;

  for (const b of backs) {
    for (const m of mids) {
      if (best && b.obj + m.obj + bestFront + STAY_BONUS <= best.total) break; // mids are sorted
      if (b.mask & m.mask) continue;
      if (compareRows(b.ev, m.ev) < 0) continue;
      const used = b.mask | m.mask;
      let tried = 0;
      for (const f of threes) {
        if (f.mask & used) continue;
        if (compareRows(m.ev, f.ev) < 0) continue;
        const total = b.obj + m.obj + f.obj + (stays(b, m, f) ? STAY_BONUS : 0);
        if (!best || total > best.total) best = { total, b, m, f };
        if (++tried >= 8) break;
      }
    }
  }

  if (!best) return greedyFantasyland(held);
  const { b, m, f } = best;
  const used = new Set([...b.indexes, ...m.indexes, ...f.indexes]);
  return {
    placements: [
      ...f.indexes.map((i) => ({ cardId: (held[i] as Card).id, row: 'front' as const })),
      ...m.indexes.map((i) => ({ cardId: (held[i] as Card).id, row: 'mid' as const })),
      ...b.indexes.map((i) => ({ cardId: (held[i] as Card).id, row: 'back' as const })),
    ],
    discards: held.filter((_, i) => !used.has(i)).map((c) => c.id),
    reason: 'Fantasyland: set for maximum royalties',
  };
};

/** Fallback if the search finds no legal arrangement: highest cards back, lowest front. */
const greedyFantasyland = (held: readonly Card[]): TurnPlan => {
  const sorted = [...held].sort((a, b) => b.rank - a.rank);
  const kept = sorted.slice(0, 13);
  return {
    placements: [
      ...kept.slice(10).map((c) => ({ cardId: c.id, row: 'front' as const })),
      ...kept.slice(5, 10).map((c) => ({ cardId: c.id, row: 'mid' as const })),
      ...kept.slice(0, 5).map((c) => ({ cardId: c.id, row: 'back' as const })),
    ],
    discards: sorted.slice(13).map((c) => c.id),
  };
};
