import React, { useState } from 'react';
import { Lock, Play, Trophy } from 'lucide-react';
import { ACHIEVEMENTS } from '../state/achievements';
import { rate, type HandRecord, type LifetimeStats } from '../state/stats';
import Modal from './Modal';

export type ProfileTab = 'stats' | 'achievements' | 'history';

interface ProfileModalProps {
  tab: ProfileTab;
  stats: LifetimeStats;
  achievements: Readonly<Record<string, number>>;
  history: readonly HandRecord[];
  onReplay: (record: HandRecord) => void;
  onClose: () => void;
}

const TABS: readonly { id: ProfileTab; label: string }[] = [
  { id: 'stats', label: 'Stats' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'history', label: 'History' },
];

const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
const money = (n: number): string => `${n < 0 ? '−' : n > 0 ? '+' : ''}$${Math.abs(n).toLocaleString()}`;

const Tile: React.FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
  <div className="rounded-2xl border border-white/5 bg-white/5 px-3 py-2.5">
    <div className="text-[10px] font-black uppercase tracking-widest text-stone-400">{label}</div>
    <div className="text-2xl font-black tabular-nums text-white">{value}</div>
    {hint && <div className="text-[11px] text-stone-400">{hint}</div>}
  </div>
);

const StatsTab: React.FC<{ stats: LifetimeStats }> = ({ stats }) => {
  const n = stats.handsPlayed;
  if (n === 0) return <p className="py-6 text-center text-sm text-stone-400">Play a hand and your numbers will show up here.</p>;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Tile label="Hands played" value={String(n)} />
      <Tile label="Win rate" value={`${rate(stats.handsWon, n)}%`} hint={`${stats.handsWon} won · ${stats.handsLost} lost · ${stats.handsTied} tied`} />
      <Tile label="Foul rate" value={`${rate(stats.fouls, n)}%`} hint={`${stats.fouls} fouled`} />
      <Tile label="Fantasyland rate" value={`${rate(stats.fantasylands, n)}%`} hint={`${stats.fantasylands} earned`} />
      <Tile label="Biggest win" value={`${signed(stats.biggestWinPoints)} pts`} hint={money(stats.biggestWinMoney)} />
      <Tile label="Royalties earned" value={String(stats.royaltiesEarned)} hint="points, all hands" />
      <Tile label="Net points" value={signed(stats.netPoints)} />
      <Tile label="Scoops" value={String(stats.scoops)} />
      <Tile label="Best clean streak" value={String(stats.bestCleanStreak)} hint={`now ${stats.currentCleanStreak} without a foul`} />
    </div>
  );
};

const AchievementsTab: React.FC<{ unlocked: Readonly<Record<string, number>> }> = ({ unlocked }) => {
  const count = ACHIEVEMENTS.filter((a) => unlocked[a.id] !== undefined).length;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold text-stone-400">{count} of {ACHIEVEMENTS.length} unlocked</p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a) => {
          const have = unlocked[a.id] !== undefined;
          return (
            <li
              key={a.id}
              className={`flex items-start gap-2.5 rounded-2xl border px-3 py-2 ${
                have ? 'border-[#d4af37]/40 bg-[#d4af37]/10' : 'border-white/5 bg-white/5'
              }`}
            >
              <span className={`mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full ${have ? 'bg-[#d4af37] text-stone-900' : 'bg-stone-800 text-stone-400'}`}>
                {have ? <Trophy size={14} aria-hidden="true" /> : <Lock size={13} aria-hidden="true" />}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-black ${have ? 'text-[#e7c25d]' : 'text-stone-200'}`}>
                  {a.title}
                  <span className="sr-only">{have ? ' (unlocked)' : ' (locked)'}</span>
                </span>
                <span className="block text-xs text-stone-400">{a.description}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const when = (at: number): string => {
  if (at <= 0) return '';
  const date = new Date(at);
  const today = new Date().toDateString() === date.toDateString();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return today ? time : `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
};

const HistoryTab: React.FC<{ history: readonly HandRecord[]; onReplay: (r: HandRecord) => void }> = ({ history, onReplay }) => {
  if (history.length === 0) return <p className="py-6 text-center text-sm text-stone-400">Finished hands appear here, ready to replay.</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {history.map((r) => (
        <li key={`${r.id}-${r.at}`}>
          <button
            type="button"
            onClick={() => onReplay(r)}
            aria-label={`Replay hand ${r.handNo}: ${signed(r.points)} points`}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-3 py-2 text-left transition hover:border-[#d4af37]/40"
          >
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-black/40 text-[#d4af37]">
              <Play size={13} fill="currentColor" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-stone-100">
                Hand {r.handNo}
                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  {r.variant} · {r.difficulty}
                </span>
              </span>
              <span className="flex flex-wrap gap-x-2 text-[11px] text-stone-400">
                <span>{when(r.at)}</span>
                {r.humanFouled && <span className="font-bold text-rose-300">Fouled</span>}
                {r.cpuFouled && <span className="font-bold text-emerald-300">CPU fouled</span>}
                {r.scoop > 0 && !r.cpuFouled && <span className="font-bold text-[#e7c25d]">Scoop</span>}
                {r.royalties > 0 && <span>Royalties +{r.royalties}</span>}
                {r.fantasylandNext > 0 && <span className="font-bold text-[#e7c25d]">Fantasyland</span>}
              </span>
            </span>
            <span className={`flex-none text-right text-sm font-black tabular-nums ${r.points > 0 ? 'text-emerald-400' : r.points < 0 ? 'text-rose-400' : 'text-stone-300'}`}>
              {signed(r.points)} pts
              <span className="block text-[11px] font-bold">{money(r.payout)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};

/** Lifetime stats, achievements and the hand history, as three tabs. */
const ProfileModal: React.FC<ProfileModalProps> = ({ tab: initialTab, stats, achievements, history, onReplay, onClose }) => {
  const [tab, setTab] = useState<ProfileTab>(initialTab);
  return (
    <Modal title="Your record" onClose={onClose}>
      <div role="tablist" aria-label="Record sections" className="mb-3 flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-black transition ${
              tab === t.id ? 'border-[#d4af37] bg-[#d4af37] text-stone-900' : 'border-white/10 text-stone-300 hover:border-[#d4af37]/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'stats' && <StatsTab stats={stats} />}
        {tab === 'achievements' && <AchievementsTab unlocked={achievements} />}
        {tab === 'history' && <HistoryTab history={history} onReplay={onReplay} />}
      </div>
    </Modal>
  );
};

export default ProfileModal;
