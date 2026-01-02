import { Card, Suit, Rank, HandRank, HandEvaluation, PlayerBoard } from '../types';
// Add RANK_NAMES to imports
import { SUITS, RANKS, ROW_SIZE, RANK_NAMES } from '../constants';

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  SUITS.forEach((suit) => {
    RANKS.forEach((rank) => {
      deck.push({
        id: `${rank}${suit}`,
        suit,
        rank,
      });
    });
  });
  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

// Evaluate a hand of cards
// isFrontRow: true restricts analysis to 3 cards (no straights/flushes)
export const evaluateHand = (cards: Card[], isFrontRow: boolean = false): HandEvaluation => {
  if (cards.length === 0) return { rank: HandRank.HighCard, value: 0, name: 'Empty' };

  // Sort Descending
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map(c => c.rank);
  const suits = sorted.map(c => c.suit);

  // Frequency Map
  const counts: Record<number, number> = {};
  ranks.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
  
  const uniqueRanks = Object.keys(counts).map(Number).sort((a, b) => b - a);
  const groups = uniqueRanks.map(r => ({ rank: r, count: counts[r] })).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count; // Most frequent first
    return b.rank - a.rank; // Then highest rank
  });

  const isFlush = !isFrontRow && suits.every(s => s === suits[0]) && suits.length >= 5;
  
  // Check Straight
  let isStraight = false;
  let straightHigh = 0;
  if (!isFrontRow && uniqueRanks.length >= 5) {
      // Check normal straight
      for (let i = 0; i <= uniqueRanks.length - 5; i++) {
          const slice = uniqueRanks.slice(i, i + 5);
          if (slice[0] - slice[4] === 4) {
              isStraight = true;
              straightHigh = slice[0];
              break;
          }
      }
      // Check Wheel (A, 5, 4, 3, 2)
      if (!isStraight && uniqueRanks.includes(14) && uniqueRanks.includes(2) && uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5)) {
          isStraight = true;
          straightHigh = 5; // 5 high straight
      }
  }

  // Check for Draws (Helper for real-time UI)
  const isFlushDraw = !isFrontRow && suits.length < 5 && suits.length >= 3 && suits.every(s => s === suits[0]);

  // --- Hand Detection ---
  
  // Royal / Straight Flush
  if (isFlush && isStraight) {
      if (straightHigh === 14 && sorted[0].rank === 14 && sorted[1].rank === 13) { 
        return { rank: HandRank.RoyalFlush, value: 14, name: 'Royal Flush' };
      }
      return { rank: HandRank.StraightFlush, value: straightHigh, name: 'Straight Flush' };
  }

  // Quads
  if (groups[0]?.count === 4) {
      return { 
          rank: HandRank.Quads, 
          value: groups[0].rank * 100 + (groups[1]?.rank || 0), 
          name: 'Four of a Kind' 
      };
  }

  // Full House
  if (groups[0]?.count === 3 && groups[1]?.count >= 2) {
      return { 
          rank: HandRank.FullHouse, 
          value: groups[0].rank * 100 + groups[1].rank, 
          name: 'Full House' 
      };
  }

  // Flush
  if (isFlush) {
      let val = 0;
      sorted.forEach((c, i) => val += c.rank * Math.pow(15, 4 - i));
      return { rank: HandRank.Flush, value: val, name: 'Flush' };
  }

  // Straight
  if (isStraight) {
      return { rank: HandRank.Straight, value: straightHigh, name: 'Straight' };
  }

  // Trips
  if (groups[0]?.count === 3) {
      let val = groups[0].rank * 100000;
      const kickers = sorted.filter(c => c.rank !== groups[0].rank);
      val += (kickers[0]?.rank || 0) * 100;
      val += (kickers[1]?.rank || 0);
      return { rank: HandRank.Trips, value: val, name: 'Three of a Kind' };
  }

  // Two Pair
  if (groups[0]?.count === 2 && groups[1]?.count === 2) {
      let val = groups[0].rank * 10000 + groups[1].rank * 100;
      const kicker = sorted.find(c => c.rank !== groups[0].rank && c.rank !== groups[1].rank);
      val += kicker?.rank || 0;
      return { rank: HandRank.TwoPair, value: val, name: 'Two Pair' };
  }

  // Pair
  if (groups[0]?.count === 2) {
      let val = groups[0].rank * 100000;
      const kickers = sorted.filter(c => c.rank !== groups[0].rank);
      kickers.forEach((k, i) => val += k.rank * Math.pow(15, 3 - i));
      return { rank: HandRank.Pair, value: val, name: `Pair of ${sorted.find(c => c.rank === groups[0].rank)?.rank === 11 ? 'Jacks' : sorted.find(c => c.rank === groups[0].rank)?.rank === 12 ? 'Queens' : sorted.find(c => c.rank === groups[0].rank)?.rank === 13 ? 'Kings' : sorted.find(c => c.rank === groups[0].rank)?.rank === 14 ? 'Aces' : groups[0].rank + 's'}` };
  }

  // High Card / Draws
  let val = 0;
  sorted.forEach((c, i) => val += c.rank * Math.pow(15, 4 - i));
  
  let name = 'High Card';
  if (isFlushDraw) name = 'Flush Draw';
  else if (cards.length > 0) {
      // Fix: Ensure RANK_NAMES is imported
      const rankName = RANK_NAMES[sorted[0].rank] || sorted[0].rank.toString();
      name = `${rankName} High`;
  }

  return { rank: HandRank.HighCard, value: val, name };
};

// Returns > 0 if A wins, < 0 if B wins, 0 if tie
export const compareHands = (handA: HandEvaluation, handB: HandEvaluation): number => {
    if (handA.rank !== handB.rank) {
        return handA.rank - handB.rank;
    }
    return handA.value - handB.value;
};

export const isBoardFull = (board: PlayerBoard): boolean => {
    return [
        ...board.front,
        ...board.mid,
        ...board.back
    ].every(c => c !== null);
};

export const checkFoul = (board: PlayerBoard): boolean => {
    const getCards = (row: (Card|null)[]) => row.filter((c): c is Card => c !== null);
    
    const front = evaluateHand(getCards(board.front), true);
    const mid = evaluateHand(getCards(board.mid), false);
    const back = evaluateHand(getCards(board.back), false);

    if (compareHands(back, mid) < 0) return true;
    if (compareHands(mid, front) < 0) return true;

    return false;
};