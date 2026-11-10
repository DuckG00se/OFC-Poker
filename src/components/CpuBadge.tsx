import React from 'react';
import { Bot, Lightbulb } from 'lucide-react';
import type { Persona } from '../ai';
import type { Difficulty } from '../engine';

interface CpuBadgeProps {
  persona: Persona;
  difficulty: Difficulty;
  isDealer: boolean;
  thinking: boolean;
  /** Personality line (start of hand, result). Always shown. */
  quip: string | null;
  /** Explanation of the latest notable move. Shown only when hints are on. */
  hint: string | null;
  hintsOn: boolean;
  onToggleHints: () => void;
}

const LEVEL_STYLE: Readonly<Record<Difficulty, string>> = {
  easy: 'border-emerald-400/30 text-emerald-300',
  medium: 'border-amber-400/30 text-amber-300',
  hard: 'border-rose-400/40 text-rose-300',
};

const CpuBadge: React.FC<CpuBadgeProps> = ({
  persona,
  difficulty,
  isDealer,
  thinking,
  quip,
  hint,
  hintsOn,
  onToggleHints,
}) => (
  <div className="flex flex-col gap-1.5 px-2">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-rose-400/30 bg-rose-950/50">
          <Bot size={15} className="text-rose-300" aria-hidden="true" />
        </span>
        <span className="text-sm font-black tracking-wide text-stone-100">{persona.name}</span>
        <span className="hidden text-xs text-stone-500 sm:inline">{persona.title}</span>
      </div>
      <span
        className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${LEVEL_STYLE[difficulty]}`}
      >
        {difficulty}
      </span>
      {isDealer && (
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-stone-400">
          Dealer
        </span>
      )}
      {thinking && (
        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-stone-400" role="status">
          thinking
          <span className="inline-flex gap-0.5" aria-hidden="true">
            <span className="h-1 w-1 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.3s]" />
            <span className="h-1 w-1 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.15s]" />
            <span className="h-1 w-1 animate-bounce rounded-full bg-stone-400" />
          </span>
        </span>
      )}
      <button
        type="button"
        onClick={onToggleHints}
        aria-pressed={hintsOn}
        title="Show a short reason for some of the CPU's moves"
        className={`ml-auto flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest transition ${
          hintsOn
            ? 'border-[#d4af37]/50 bg-[#d4af37]/10 text-[#d4af37]'
            : 'border-white/10 text-stone-500 hover:text-stone-300'
        }`}
      >
        <Lightbulb size={11} aria-hidden="true" /> Why {hintsOn ? 'on' : 'off'}
      </button>
    </div>

    <div className="min-h-[2.6rem] text-xs leading-snug" aria-live="polite">
      {hintsOn && hint && !thinking && (
        <p key={hint} className="ofc-fade rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 px-3 py-1.5 text-[#e7c25d]">
          {hint}
        </p>
      )}
      {quip && !(hintsOn && hint && !thinking) && (
        <p key={quip} className="ofc-fade px-1 italic text-stone-400">
          “{quip}”
        </p>
      )}
    </div>
  </div>
);

export default CpuBadge;
