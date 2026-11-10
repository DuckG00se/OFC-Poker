import {
  HAND_NAMES,
  HandCategory,
  applyPlacements,
  boardCount,
  evaluateRow,
  rankLabel,
  type Board,
  type Card,
  type PlayerView,
  type RowName,
  type Suit,
} from '../engine';
import type { TurnPlan } from './types';

const GLYPH: Readonly<Record<Suit, string>> = { h: '♥', d: '♦', c: '♣', s: '♠' };
const ROW_WORD: Readonly<Record<RowName, string>> = { front: 'front', mid: 'middle', back: 'back' };
const label = (card: Card): string => `${rankLabel(card.rank)}${GLYPH[card.suit]}`;

const suitedCount = (cards: readonly Card[]): number => {
  const counts = new Map<Suit, number>();
  for (const c of cards) counts.set(c.suit, (counts.get(c.suit) ?? 0) + 1);
  return Math.max(0, ...counts.values());
};

const fourToStraight = (cards: readonly Card[]): boolean => {
  const ranks = new Set(cards.map((c) => c.rank as number));
  if (ranks.has(14)) ranks.add(1);
  if (ranks.size < 4) return false;
  for (let low = 1; low <= 10; low++) {
    let hit = 0;
    for (let r = low; r < low + 5; r++) if (ranks.has(r)) hit++;
    if (hit >= 4) return true;
  }
  return false;
};

/**
 * A short, human explanation of a notable move, or undefined when nothing stands out (so the
 * CPU only comments on some of its moves). Purely descriptive: it looks at what the plan
 * changed on the board and does not claim to know the CPU's internal reasoning.
 */
export const explainPlan = (view: PlayerView, plan: TurnPlan): string | undefined => {
  const before: Board = view.myBoard;
  const after: Board = applyPlacements(before, view.held, plan.placements);
  const rows: RowName[] = ['back', 'mid', 'front'];

  // Fantasyland chase
  const frontBefore = evaluateRow(before.front, 'front');
  const frontAfter = evaluateRow(after.front, 'front');
  const fl = (ev: typeof frontAfter): boolean =>
    ev.category === HandCategory.Trips ||
    (ev.category === HandCategory.Pair && (ev.tiebreak[0] ?? 0) >= 12);
  if (view.config.fantasyland !== 'off' && fl(frontAfter) && !fl(frontBefore)) {
    return `Going for Fantasyland: ${frontAfter.name.toLowerCase()} up front.`;
  }

  // New made hands
  for (const row of rows) {
    const b = evaluateRow(before[row], row);
    const a = evaluateRow(after[row], row);
    if (a.category <= b.category || a.category < HandCategory.Pair) continue;
    if (row === 'front' && a.category === HandCategory.Pair && (a.tiebreak[0] ?? 0) < 6) continue;
    const r = rankLabel(a.tiebreak[0] ?? 0);
    if (a.category === HandCategory.Pair) return `Pairs the ${r}s in the ${ROW_WORD[row]} row.`;
    if (a.category === HandCategory.Trips) return `Makes three ${r}s in the ${ROW_WORD[row]} row.`;
    if (a.category === HandCategory.TwoPair) return `Two pair now in the ${ROW_WORD[row]} row.`;
    return `Makes a ${HAND_NAMES[a.category].toLowerCase()} in the ${ROW_WORD[row]} row.`;
  }

  // New draws
  for (const row of ['mid', 'back'] as const) {
    const was = before[row];
    const now = after[row];
    if (now.length === 4 && now.length > was.length) {
      if (suitedCount(now) === 4) return `Four to a flush in the ${ROW_WORD[row]} row.`;
      if (fourToStraight(now)) return `Four to a straight in the ${ROW_WORD[row]} row.`;
    }
  }

  // Throwing a card away (Pineapple)
  const discarded = view.held.find((c) => plan.discards.includes(c.id));
  if (discarded && boardCount(before) > 0) {
    return `Discards the ${label(discarded)}: it does not help any row.`;
  }

  // Playing it safe
  const frontPlacement = plan.placements.find((p) => p.row === 'front');
  const frontCard = frontPlacement && view.held.find((c) => c.id === frontPlacement.cardId);
  if (frontCard && frontCard.rank <= 8 && frontAfter.category === HandCategory.HighCard) {
    return `Parks the ${label(frontCard)} in front to keep the back row strong.`;
  }

  // Opening hand
  if (boardCount(before) === 0 && plan.placements.length === 5) {
    return 'Opening: the strongest cards go in back, the weakest in front.';
  }
  return undefined;
};
