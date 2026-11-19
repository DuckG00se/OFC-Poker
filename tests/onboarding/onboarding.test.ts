import { describe, expect, it } from 'vitest';
import { checkFoul, parseCards } from '../../src/engine';
import { FOUL_EXPLAINER, FOUL_WARNING, INTRO, TUTORIAL } from '../../src/content/onboarding';
import { FOULED_BOARD, LEGAL_BOARD } from '../../src/components/howto/examples';
import {
  describeProblem,
  firstHandAdvice,
  orderProblems,
  problemRows,
  resetOnboarding,
  shouldOfferWelcome,
  type OnboardingFlags,
} from '../../src/ui/onboarding';
import { DEFAULT_PREFS } from '../../src/ui/prefs';
import { parsePrefs } from '../../src/state/persist';
import { board } from '../engine/helpers';

const flags = (over: Partial<OnboardingFlags> = {}): OnboardingFlags => ({ tutorialStatus: 'unseen', foulExplained: false, ...over });

describe('welcome choice on first launch', () => {
  it('is offered to a brand-new player on the start screen', () => {
    expect(shouldOfferWelcome(flags(), 0, 'idle')).toBe(true);
  });

  it('is not offered once they chose, or have played, or are mid-hand', () => {
    expect(shouldOfferWelcome(flags({ tutorialStatus: 'skipped' }), 0, 'idle')).toBe(false);
    expect(shouldOfferWelcome(flags({ tutorialStatus: 'completed' }), 0, 'idle')).toBe(false);
    expect(shouldOfferWelcome(flags(), 3, 'idle')).toBe(false);
    expect(shouldOfferWelcome(flags(), 0, 'placing')).toBe(false);
  });
});

describe('first-time flags persist and can be reset', () => {
  it('a new player starts unseen with no foul explained', () => {
    expect(DEFAULT_PREFS.tutorialStatus).toBe('unseen');
    expect(DEFAULT_PREFS.foulExplained).toBe(false);
  });

  it('completed, skipped and foulExplained survive a save and load', () => {
    for (const tutorialStatus of ['completed', 'skipped'] as const) {
      const saved = JSON.parse(JSON.stringify({ ...DEFAULT_PREFS, tutorialStatus, foulExplained: true })) as unknown;
      const loaded = parsePrefs(saved);
      expect(loaded.tutorialStatus).toBe(tutorialStatus);
      expect(loaded.foulExplained).toBe(true);
    }
  });

  it('the older boolean flag migrates: tutorialSeen true means completed', () => {
    const { tutorialStatus: _s, ...rest } = DEFAULT_PREFS;
    expect(parsePrefs({ ...rest, tutorialSeen: true }).tutorialStatus).toBe('completed');
    expect(parsePrefs({ ...rest, tutorialSeen: false }).tutorialStatus).toBe('unseen');
  });

  it('a garbage value falls back to unseen instead of breaking', () => {
    expect(parsePrefs({ ...DEFAULT_PREFS, tutorialStatus: 'banana' }).tutorialStatus).toBe('unseen');
  });

  it('resetOnboarding brings the welcome and the explainer back, and touches nothing else', () => {
    const played = { ...DEFAULT_PREFS, tutorialStatus: 'completed' as const, foulExplained: true, sound: false, fourColorDeck: true };
    const reset = resetOnboarding(played);
    expect(reset.tutorialStatus).toBe('unseen');
    expect(reset.foulExplained).toBe(false);
    expect(reset.sound).toBe(false);
    expect(reset.fourColorDeck).toBe(true);
    expect(shouldOfferWelcome(reset, 0, 'idle')).toBe(true);
  });
});

describe('what went wrong with a foul', () => {
  it('a legal board has no order problems', () => {
    expect(orderProblems(LEGAL_BOARD)).toEqual([]);
  });

  it('the example fouled board: front pair is stronger than the middle row', () => {
    const problems = orderProblems(FOULED_BOARD);
    expect(checkFoul(FOULED_BOARD)).toBe(true);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ upper: 'front', lower: 'mid', upperName: 'Pair of Queens', lowerName: 'K High' });
    expect(describeProblem(problems[0]!)).toBe('Your front row (Pair of Queens) is stronger than your middle row (K High).');
    expect(problemRows(problems)).toEqual(['front', 'mid']);
  });

  it('finds a problem between middle and back too, and can report both', () => {
    const b = board('Qs Qh 4d', 'Ac Ad 9h 7s 2c', 'Kc 8d 6h 5s 3c');
    expect(checkFoul(b)).toBe(true);
    const problems = orderProblems(b);
    expect(problems.map((p) => `${p.upper}>${p.lower}`)).toEqual(['mid>back']);
  });

  it('on an unfinished board it points at rows already out of order (heading for a foul)', () => {
    const partial = board('Qs Qh', 'Kd 7c', '');
    expect(orderProblems(partial).map((p) => p.upper)).toEqual(['front']);
    expect(orderProblems(board('2s', 'Ks Kh', 'As Ah Ad'))).toEqual([]);
  });

  it('every legal board the engine accepts yields no problems (the explainer never contradicts the rule)', () => {
    const legal = board('2s 3h 7d', 'Ks Kh 9d 5c 2d', 'As Ah Ad 4c 4d');
    expect(checkFoul(legal)).toBe(false);
    expect(orderProblems(legal)).toEqual([]);
  });
});

describe('advice for the first five cards is written from the cards dealt', () => {
  it('a pair: keep it together in the back', () => {
    expect(firstHandAdvice(parseCards('7s 7h Kd 3c 2s'))).toBe('You were dealt a pair of 7s. Keep them together, ideally in the back row.');
  });

  it('trips are named as three of a kind', () => {
    expect(firstHandAdvice(parseCards('9s 9h 9d 3c 2s'))).toContain('three 9s');
  });

  it('three suited cards suggest a flush draw', () => {
    expect(firstHandAdvice(parseCards('As 9s 4s Kd 2c'))).toContain('3 of your cards share a suit');
  });

  it('no pairs, no suits: names the highest card', () => {
    expect(firstHandAdvice(parseCards('As Kd 9c 5h 2s'))).toContain('highest card is the A');
  });

  it('no cards: still gives sensible advice', () => {
    expect(firstHandAdvice([])).toContain('Strong cards');
  });
});

describe('copy', () => {
  it('the intro is four short slides with at most two sentences each', () => {
    expect(INTRO).toHaveLength(4);
    for (const slide of INTRO) expect(slide.body.length).toBeLessThanOrEqual(2);
  });

  it('says points, never money', () => {
    const all = JSON.stringify([INTRO, TUTORIAL.finished(4, false), TUTORIAL.finished(-2, false), TUTORIAL.finished(0, true), FOUL_EXPLAINER, FOUL_WARNING.likely(60)]);
    expect(all).not.toMatch(/\$|money|chip|bet\b|wager|dollar/i);
  });

  it('the first-hand celebration changes with how the hand went', () => {
    expect(TUTORIAL.finished(4, false).body).toContain('+4 points');
    expect(TUTORIAL.finished(1, false).body).toContain('+1 point.');
    expect(TUTORIAL.finished(-1, false).body).toContain('lost 1 point ');
    expect(TUTORIAL.finished(-6, true).body).toContain('foul');
    expect(TUTORIAL.finished(-2, false).body).toContain('lost 2 points');
  });

  it('the foul cost quoted on screen is the engine\'s', () => {
    expect(FOUL_EXPLAINER.cost).toContain('6 points');
  });
});
