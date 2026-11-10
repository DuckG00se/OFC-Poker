import React from 'react';
import { FastForward, ListOrdered, RefreshCw, Sparkles } from 'lucide-react';
import { ROW_NAMES, type HandScore, type RowName } from '../engine';
import type { RevealPlan } from '../ui/useGameFeedback';
import { useCountUp } from '../ui/useScoreReveal';

const ROW_LABEL: Readonly<Record<RowName, string>> = { front: 'Front', mid: 'Middle', back: 'Back' };
const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

interface ScoreStripProps {
  result: HandScore;
  /** Current stage of the reveal (see RevealPlan). */
  stage: number;
  plan: RevealPlan;
  done: boolean;
  stake: number;
  cpuName: string;
  fantasylandNext: number;
  cpuFantasylandNext: number;
  /** Count-up duration in ms (0 = no animation). */
  countMs: number;
  onNext: () => void;
  onSkip: () => void;
  onDetails: () => void;
}

const chipTone = (n: number): string =>
  n > 0
    ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
    : n < 0
      ? 'border-rose-400/40 bg-rose-500/10 text-rose-300'
      : 'border-white/10 bg-white/5 text-stone-300';

const Chip: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <span className={`ofc-pop rounded-full border px-2 py-0.5 text-[11px] font-black ${chipTone(value)}`}>
    {label} {signed(value)}
  </span>
);

/**
 * The scoring sequence: rows are revealed one at a time, then bonuses and royalties, while
 * the running total counts up. It sits where the hand was, so the boards never jump.
 */
const ScoreStrip: React.FC<ScoreStripProps> = ({
  result,
  stage,
  plan,
  done,
  stake,
  cpuName,
  fantasylandNext,
  cpuFantasylandNext,
  countMs,
  onNext,
  onSkip,
  onDetails,
}) => {
  const { human, ai } = result.seats;
  const rowsShown = Math.min(stage, plan.rows);
  const bonusesShown = plan.bonuses !== null && stage >= plan.bonuses;
  const royaltyNet = human.royaltyTotal - ai.royaltyTotal;

  let running = 0;
  ROW_NAMES.slice(0, rowsShown).forEach((row) => {
    running += result.rowResults[row];
  });
  if (bonusesShown) running += result.scoop + royaltyNet;
  const shown = useCountUp(done ? result.points.human : running, countMs);
  const final = result.points.human;
  const tone = shown > 0 ? 'text-emerald-400' : shown < 0 ? 'text-rose-400' : 'text-stone-200';
  const anyFoul = human.fouled || ai.fouled;

  return (
    <div className="flex w-full flex-col items-center gap-1.5" aria-live="polite">
      <div className="flex min-h-[1.5rem] flex-wrap items-center justify-center gap-1">
        {ROW_NAMES.slice(0, rowsShown).map((row) => (
          <Chip key={row} label={ROW_LABEL[row]} value={result.rowResults[row]} />
        ))}
        {bonusesShown && result.scoop !== 0 && <Chip label={anyFoul ? 'Foul' : 'Scoop'} value={result.scoop} />}
        {bonusesShown && (human.royaltyTotal > 0 || ai.royaltyTotal > 0) && (
          <Chip label="Royalties" value={royaltyNet} />
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`text-4xl font-black tabular-nums leading-none ${tone}`}>{signed(shown)}</span>
        <span className={`text-sm font-black ${tone}`}>pts</span>
        {done && (
          <span className={`ofc-pop text-lg font-black tabular-nums ${tone}`}>
            {final < 0 ? '−' : '+'}${Math.abs(final * stake).toLocaleString()}
          </span>
        )}
      </div>

      {done && (fantasylandNext > 0 || cpuFantasylandNext > 0) && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {fantasylandNext > 0 && (
            <span className="ofc-pop flex items-center gap-1 rounded-full border border-[#d4af37]/50 bg-[#d4af37]/15 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-[#e7c25d]">
              <Sparkles size={12} aria-hidden="true" /> Fantasyland next hand: {fantasylandNext} cards
            </span>
          )}
          {cpuFantasylandNext > 0 && (
            <span className="ofc-pop rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-rose-300">
              {cpuName} is in Fantasyland next hand
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        {done ? (
          <>
            <button
              type="button"
              onClick={onDetails}
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs font-black uppercase tracking-wider text-stone-300 transition hover:border-[#d4af37]/50"
            >
              <ListOrdered size={14} aria-hidden="true" /> Details
            </button>
            <button
              type="button"
              onClick={onNext}
              autoFocus
              className="group flex items-center gap-2 rounded-full bg-gradient-to-b from-[#e7c25d] to-[#d4af37] px-7 py-2 text-sm font-black uppercase tracking-widest text-stone-900 shadow-[0_8px_24px_rgba(212,175,55,0.3)] transition hover:scale-105 active:scale-95"
            >
              <RefreshCw size={16} className="transition-transform duration-500 group-hover:rotate-180" aria-hidden="true" />
              Next hand
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onSkip}
            className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs font-black uppercase tracking-wider text-stone-400 transition hover:text-stone-200"
          >
            <FastForward size={14} aria-hidden="true" /> Skip
          </button>
        )}
      </div>
    </div>
  );
};

export default ScoreStrip;
