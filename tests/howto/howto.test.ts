import { describe, expect, it } from 'vitest';
import {
  BACK_ROYALTIES,
  FANTASYLAND,
  FOUL_PENALTY,
  FRONT_PAIR_MIN_RANK,
  HandCategory,
  MID_ROYALTIES,
  ROYAL_FLUSH_ROYALTY,
  SCOOP_BONUS,
  checkFoul,
  evaluateRow,
  fantasylandEntryCards,
  frontPairRoyalty,
  frontTripsRoyalty,
  nextFantasyland,
  parseCards,
  rankLabel,
  rowRoyalty,
  scoreHand,
  staysInFantasyland,
} from '../../src/engine';
import { COPY, progressiveRows } from '../../src/content/rules';
import {
  FOULED_BOARD,
  LEGAL_BOARD,
  RANKING_EXAMPLES,
  WORKED,
  exampleIsCorrect,
} from '../../src/components/howto/examples';
import { board } from '../engine/helpers';

const ev = (text: string, row: 'front' | 'mid' | 'back') => evaluateRow(parseCards(text), row);

describe('royalty table shown in the rules equals what the engine pays', () => {
  it('front pairs: every rank the screen lists pays what rowRoyalty pays', () => {
    for (let rank = FRONT_PAIR_MIN_RANK; rank <= 14; rank++) {
      const r = rankLabel(rank);
      const hand = ev(`${r}s ${r}h 2d`, 'front');
      expect(rowRoyalty(hand, 'front')).toBe(frontPairRoyalty(rank));
    }
    // and pairs below the minimum pay nothing
    expect(rowRoyalty(ev('5s 5h 2d', 'front'), 'front')).toBe(0);
  });

  it('front trips: 222 and AAA match the table', () => {
    expect(rowRoyalty(ev('2s 2h 2d', 'front'), 'front')).toBe(frontTripsRoyalty(2));
    expect(rowRoyalty(ev('As Ah Ad', 'front'), 'front')).toBe(frontTripsRoyalty(14));
  });

  it('middle and back rows: every listed hand pays its table value', () => {
    const samples: Record<number, string> = {
      [HandCategory.Trips]: '7s 7h 7d Kc 2s',
      [HandCategory.Straight]: '9s 8h 7d 6c 5s',
      [HandCategory.Flush]: 'As 9s 7s 4s 2s',
      [HandCategory.FullHouse]: 'Ks Kh Kd 4c 4s',
      [HandCategory.Quads]: '9s 9h 9d 9c 2s',
      [HandCategory.StraightFlush]: '9s 8s 7s 6s 5s',
    };
    for (const [category, cards] of Object.entries(samples)) {
      const c = Number(category) as HandCategory;
      expect(rowRoyalty(ev(cards, 'mid'), 'mid')).toBe(MID_ROYALTIES[c] ?? 0);
      expect(rowRoyalty(ev(cards, 'back'), 'back')).toBe(BACK_ROYALTIES[c] ?? 0);
    }
    const royal = 'Ah Kh Qh Jh Th';
    expect(rowRoyalty(ev(royal, 'mid'), 'mid')).toBe(ROYAL_FLUSH_ROYALTY.mid);
    expect(rowRoyalty(ev(royal, 'back'), 'back')).toBe(ROYAL_FLUSH_ROYALTY.back);
  });

  it('the middle row pays double the back row for every hand both pay for', () => {
    for (const [category, back] of Object.entries(BACK_ROYALTIES)) {
      const mid = MID_ROYALTIES[Number(category) as HandCategory];
      if (back && mid && Number(category) !== HandCategory.Quads && Number(category) !== HandCategory.StraightFlush) {
        expect(mid).toBe(back * 2);
      }
    }
  });
});

describe('Fantasyland numbers on screen equal the engine', () => {
  it('progressive card counts in the table are what entry actually grants', () => {
    const entry = (cards: string) => fantasylandEntryCards(ev(cards, 'front'), 'progressive');
    const rows = progressiveRows();
    expect(rows.map((r) => r.cards)).toEqual([entry('Qs Qh 2d'), entry('Ks Kh 2d'), entry('As Ah 2d'), entry('2s 2h 2d')]);
    expect(rows[0]?.cards).toBe(FANTASYLAND.baseCards);
    expect(rows[3]?.cards).toBe(FANTASYLAND.tripsCards);
  });

  it('a pair of jacks does not qualify, a pair of queens does', () => {
    expect(fantasylandEntryCards(ev('Js Jh 2d', 'front'), 'flat')).toBe(0);
    expect(fantasylandEntryCards(ev('Qs Qh 2d', 'front'), 'flat')).toBe(FANTASYLAND.baseCards);
  });

  it('the stay conditions listed are the ones the engine applies', () => {
    expect(staysInFantasyland(board('2s 2h 2d', 'Ks Kh Kd 3c 4d', 'As Ah Ad 7c 7h'))).toBe(true); // front trips
    expect(staysInFantasyland(board('2s 3h 7d', 'Ks Kh Kd 4c 4s', 'As Ah Ad 5c 5d'))).toBe(true); // mid full house
    expect(staysInFantasyland(board('2s 3h 7d', 'Js Jh 9d 5c 2d', '9s 9h 9c 9d As'))).toBe(true); // back quads
    expect(staysInFantasyland(board('2s 3h 7d', 'Js Jh 9d 5c 2d', 'As Ah Ad 5h 5s'))).toBe(false); // back full house only
    expect(nextFantasyland(board('Qs Qh 2d', 'Ks Kh 9d 5c 2c', 'As Ah Ad 4c 4d'), false, 'flat')).toBe(FANTASYLAND.baseCards);
  });
});

describe('the worked scoring example is computed, and adds up', () => {
  const { score, you, cpu } = WORKED;

  it('both example boards are legal', () => {
    expect(checkFoul(you)).toBe(false);
    expect(checkFoul(cpu)).toBe(false);
  });

  it('matches a fresh call to the real scoring function', () => {
    expect(score).toEqual(scoreHand({ human: you, ai: cpu }));
  });

  it('the total on screen = rows won - rows lost + scoop + royalty difference', () => {
    const rows = Object.values(score.rowResults).reduce<number>((n, r) => n + r, 0);
    const royalty = score.seats.human.royaltyTotal - score.seats.ai.royaltyTotal;
    expect(score.points.human).toBe(rows + score.scoop + royalty);
    // pinned, so a change to the example or to the rules is noticed on purpose:
    expect(score.rowResults).toEqual({ front: 1, mid: 1, back: -1 });
    expect(score.points.human).toBe(4);
  });

  it('the copy built from the example says the same thing', () => {
    expect(COPY.scoring.exampleTotal(score.points.human)).toBe('Total: +4 points.');
    expect(COPY.scoring.exampleRowWin('Front', 'A', 'B')).toContain('you win');
  });

  it('example cards are all distinct', () => {
    const ids = [...you.front, ...you.mid, ...you.back, ...cpu.front, ...cpu.mid, ...cpu.back].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('foul example', () => {
  it('the fouled board really is a foul, and the legal board is not', () => {
    expect(checkFoul(FOULED_BOARD)).toBe(true);
    expect(checkFoul(LEGAL_BOARD)).toBe(false);
  });

  it('it fouls for the reason the copy gives: front (pair) is stronger than middle (king high)', () => {
    expect(evaluateRow(FOULED_BOARD.front, 'front').category).toBe(HandCategory.Pair);
    expect(evaluateRow(FOULED_BOARD.mid, 'mid').category).toBe(HandCategory.HighCard);
  });

  it('a foul costs what the screen says (a scoop) and a scoop is worth what it says', () => {
    const score = scoreHand({ human: FOULED_BOARD, ai: LEGAL_BOARD });
    expect(score.points.human).toBeLessThanOrEqual(-FOUL_PENALTY);
    expect(FOUL_PENALTY).toBe(3 + SCOOP_BONUS);
    expect(COPY.scoring.scoopLine).toContain(`+${SCOOP_BONUS}`);
    expect(COPY.scoring.foulLine).toContain(String(FOUL_PENALTY));
  });
});

describe('hand rankings cheat sheet', () => {
  it('every example is the hand it claims to be', () => {
    for (const ex of RANKING_EXAMPLES) expect(exampleIsCorrect(ex)).toBe(true);
  });

  it('they run from weakest to strongest', () => {
    for (let i = 1; i < RANKING_EXAMPLES.length; i++) {
      const prev = RANKING_EXAMPLES[i - 1];
      const cur = RANKING_EXAMPLES[i];
      if (!prev || !cur) throw new Error('missing');
      expect(cur.category >= prev.category).toBe(true);
    }
    expect(RANKING_EXAMPLES).toHaveLength(10);
  });
});
