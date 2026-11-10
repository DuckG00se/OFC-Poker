import { describe, expect, it } from 'vitest';
import { scoreHand } from '../../src/engine';
import { ACHIEVEMENTS, newlyEarned, type AchievementContext } from '../../src/state/achievements';
import { appReducer, initialAppState } from '../../src/state/appReducer';
import { EMPTY_STATS, MAX_HISTORY, addHandToStats, rate, type HandRecord } from '../../src/state/stats';
import { board } from '../engine/helpers';
import { playHands, playOut } from './helpers';

const record = (patch: Partial<HandRecord> = {}): HandRecord => ({
  id: 's:1',
  handNo: 1,
  at: 1,
  variant: 'classic',
  difficulty: 'medium',
  stake: 5,
  points: 0,
  payout: 0,
  humanFouled: false,
  cpuFouled: false,
  scoop: 0,
  royalties: 0,
  fantasylandNext: 0,
  inFantasyland: false,
  log: [],
  ...patch,
});

describe('lifetime stats', () => {
  it('counts wins, losses, ties and money', () => {
    let s = addHandToStats(EMPTY_STATS, record({ points: 6, payout: 30, scoop: 3 }));
    s = addHandToStats(s, record({ points: -2, payout: -10 }));
    s = addHandToStats(s, record({ points: 0 }));
    expect(s).toMatchObject({ handsPlayed: 3, handsWon: 1, handsLost: 1, handsTied: 1, netPoints: 4 });
    expect(s.biggestWinPoints).toBe(6);
    expect(s.biggestWinMoney).toBe(30);
    expect(s.biggestLossPoints).toBe(-2);
    expect(s.scoops).toBe(1);
  });

  it('a win handed over by a CPU foul is not counted as a scoop', () => {
    const s = addHandToStats(EMPTY_STATS, record({ points: 6, scoop: 3, cpuFouled: true }));
    expect(s.scoops).toBe(0);
    expect(s.handsWon).toBe(1);
  });

  it('tracks the no-foul streak and its best value', () => {
    let s = EMPTY_STATS;
    for (let i = 0; i < 4; i++) s = addHandToStats(s, record());
    expect(s.currentCleanStreak).toBe(4);
    s = addHandToStats(s, record({ humanFouled: true, points: -6 }));
    expect(s.currentCleanStreak).toBe(0);
    expect(s.bestCleanStreak).toBe(4);
    expect(s.fouls).toBe(1);
  });

  it('tracks royalties and Fantasyland', () => {
    const s = addHandToStats(EMPTY_STATS, record({ royalties: 9, fantasylandNext: 16, points: 10 }));
    expect(s.royaltiesEarned).toBe(9);
    expect(s.fantasylands).toBe(1);
  });

  it('rate() is a whole percentage and safe with no hands', () => {
    expect(rate(1, 3)).toBe(33);
    expect(rate(0, 0)).toBe(0);
  });
});

describe('achievements', () => {
  const strong = board('Js Jh 4d', 'Ks Kh Kd 7c 2s', 'As Ah Ad 9c 9d');
  const weak = board('2c 3d 5h', '3h 6d 9s Tc Jc', '4s 4h 8d Qd Qc');
  const ctx = (patch: Partial<HandRecord>, stats = EMPTY_STATS, bankroll = 1000): AchievementContext => ({
    record: record(patch),
    result: scoreHand({ human: strong, ai: weak }),
    stats,
    bankroll,
  });

  it('every achievement has a unique id, a title and a description', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) {
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.description.length).toBeGreaterThan(0);
    }
  });

  it('unlocks first hand, first win, scoop, royalties and full house from one big hand', () => {
    const earned = newlyEarned({}, ctx({ points: 20, scoop: 3, royalties: 14 }));
    expect(earned).toEqual(
      expect.arrayContaining(['first-hand', 'first-win', 'first-scoop', 'royalty-10', 'big-win-20', 'full-house']),
    );
    expect(earned).not.toContain('royalty-25');
    expect(earned).not.toContain('first-fantasyland');
  });

  it('never unlocks the same achievement twice', () => {
    expect(newlyEarned({ 'first-hand': 5 }, ctx({}))).not.toContain('first-hand');
  });

  it('distinguishes entering Fantasyland from staying in it', () => {
    expect(newlyEarned({}, ctx({ fantasylandNext: 14 }))).toContain('first-fantasyland');
    const stay = newlyEarned({}, ctx({ fantasylandNext: 14, inFantasyland: true }));
    expect(stay).toContain('stay-fantasyland');
    expect(stay).not.toContain('first-fantasyland');
  });

  it('the 10-hand clean streak unlocks at exactly ten', () => {
    expect(newlyEarned({}, ctx({}, { ...EMPTY_STATS, currentCleanStreak: 9 }))).not.toContain('clean-10');
    expect(newlyEarned({}, ctx({}, { ...EMPTY_STATS, currentCleanStreak: 10 }))).toContain('clean-10');
  });

  it('a scoop handed over by a foul does not count as a scoop achievement', () => {
    expect(newlyEarned({}, ctx({ scoop: 3, cpuFouled: true, points: 6 }))).not.toContain('first-scoop');
  });

  it('level, variant and bankroll achievements', () => {
    expect(newlyEarned({}, ctx({ difficulty: 'hard', points: 1 }))).toContain('beat-hard');
    expect(newlyEarned({}, ctx({ difficulty: 'hard', points: -1 }))).not.toContain('beat-hard');
    expect(newlyEarned({}, ctx({ variant: 'pineapple', points: 1 }))).toContain('pineapple-win');
    expect(newlyEarned({}, ctx({}, EMPTY_STATS, 2000))).toContain('bankroll-double');
  });
});

describe('progress through the app reducer', () => {
  it('a finished hand updates stats, history and achievements exactly once', () => {
    const app = playOut(appReducer(initialAppState('prog'), { type: 'DEAL' }), 1234);
    expect(app.stats.handsPlayed).toBe(1);
    expect(app.history).toHaveLength(1);
    const [rec] = app.history;
    expect(rec?.at).toBe(1234);
    expect(rec?.handNo).toBe(1);
    expect(rec?.points).toBe(app.game.result?.points.human);
    expect(rec?.log).toBe(app.game.log);
    expect(app.unlocked).toContain('first-hand');
    expect(app.achievements['first-hand']).toBe(1234);
    // Stray actions afterwards change nothing.
    const again = appReducer(app, { type: 'GAME', action: { type: 'CONFIRM', seat: 'human' }, at: 9 });
    expect(again).toBe(app);
  });

  it('the unlock list is cleared when the next hand is dealt', () => {
    const app = playOut(appReducer(initialAppState('prog2'), { type: 'DEAL' }));
    expect(appReducer(app, { type: 'DEAL' }).unlocked).toEqual([]);
  });

  it('history is newest-first and capped', () => {
    const app = playHands(initialAppState('cap'), MAX_HISTORY + 3);
    expect(app.history).toHaveLength(MAX_HISTORY);
    expect(app.history[0]?.handNo).toBe(MAX_HISTORY + 3);
    expect(app.stats.handsPlayed).toBe(MAX_HISTORY + 3);
  });

  it('stats agree with the recorded hands', () => {
    const app = playHands(initialAppState('agree'), 12);
    expect(app.stats.netPoints).toBe(app.history.reduce((n, r) => n + r.points, 0));
    expect(app.stats.fouls).toBe(app.history.filter((r) => r.humanFouled).length);
    expect(app.stats.handsWon + app.stats.handsLost + app.stats.handsTied).toBe(12);
  });

  it('a new session keeps the lifetime record; a full reset clears it', () => {
    const app = playHands(initialAppState('keep'), 2);
    const next = appReducer(app, { type: 'NEW_SESSION', seed: 'other' });
    expect(next.stats.handsPlayed).toBe(2);
    expect(next.history).toHaveLength(2);
    expect(next.session.handNo).toBe(1);
    const wiped = appReducer(app, { type: 'RESET_ALL', seed: 'zero' });
    expect(wiped.stats.handsPlayed).toBe(0);
    expect(wiped.history).toHaveLength(0);
    expect(wiped.achievements).toEqual({});
  });
});
