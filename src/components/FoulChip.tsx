import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import type { FoulRisk } from '../ui/useFoulRisk';

/** Compact foul warning for the player's board. */
const FoulChip: React.FC<{ risk: FoulRisk }> = ({ risk }) => {
  const { status, risk: value } = risk;
  if (status === 'safe') {
    return (
      <span className="flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300">
        <ShieldCheck size={11} aria-hidden="true" /> Legal board
      </span>
    );
  }
  if (status === 'fouled' || status === 'certain') {
    return (
      <span
        role="alert"
        className="ofc-pulse flex items-center gap-1 rounded-full border border-rose-400/60 bg-rose-600/25 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-200"
      >
        <AlertTriangle size={11} aria-hidden="true" />
        {status === 'fouled' ? 'Fouled' : 'Foul certain'}
      </span>
    );
  }
  if (value === null) return null;
  const pct = Math.round(value * 100);
  const tone =
    pct >= 45
      ? 'border-rose-400/50 bg-rose-600/15 text-rose-200'
      : pct >= 20
        ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
        : 'border-emerald-400/25 bg-emerald-500/5 text-emerald-300';
  return (
    <span
      title="Estimated chance this board ends up fouled, from simulated play-outs"
      className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${tone}`}
    >
      {pct >= 45 && <AlertTriangle size={11} aria-hidden="true" />}
      Foul risk {pct}%
    </span>
  );
};

export default FoulChip;
