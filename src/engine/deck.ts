import { createRng } from './rng';
import type { Card, Rank, Suit } from './types';

export const SUITS: readonly Suit[] = ['h', 'd', 'c', 's'];
export const RANKS: readonly Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export const cardId = (rank: Rank, suit: Suit): string => `${rank}${suit}`;

export const makeCard = (rank: Rank, suit: Suit): Card => ({ id: cardId(rank, suit), rank, suit });

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push(makeCard(rank, suit));
  return deck;
};

/** Fisher-Yates shuffle driven by any [0,1) generator. Returns a new array. */
export const shuffleWith = <T>(items: readonly T[], rng: () => number): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i] as T;
    out[i] = out[j] as T;
    out[j] = a;
  }
  return out;
};

/** The shuffled deck for a given seed: same seed, same deck, always. */
export const seededDeck = (seed: string): Card[] => shuffleWith(createDeck(), createRng(seed));

const RANK_LABELS: Readonly<Record<number, string>> = { 10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
export const rankLabel = (rank: number): string => RANK_LABELS[rank] ?? String(rank);

/** Parses "As", "Td", "9h" style notation. Handy for tests and debugging. */
export const parseCard = (text: string): Card => {
  const rankChar = text.slice(0, -1).toUpperCase();
  const suit = text.slice(-1).toLowerCase() as Suit;
  const names: Record<string, Rank> = { T: 10, J: 11, Q: 12, K: 13, A: 14 };
  const rank = names[rankChar] ?? (Number(rankChar) as Rank);
  if (!SUITS.includes(suit) || !RANKS.includes(rank)) throw new Error(`Bad card: ${text}`);
  return makeCard(rank, suit);
};

export const parseCards = (text: string): Card[] =>
  text.trim().split(/\s+/).filter(Boolean).map(parseCard);
