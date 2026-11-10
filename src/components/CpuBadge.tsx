import React from 'react';
import { Bot } from 'lucide-react';
import type { Persona } from '../ai';
import type { Difficulty } from '../engine';

interface CpuBadgeProps {
  persona: Persona;
  difficulty: Difficulty;
  isDealer: boolean;
  thinking: boolean;
  /** In Fantasyland this hand. */
  fantasyland: boolean;
  /** Personality line (start of hand, result). */
  quip: string | null;
  /** Explanation of the latest notable move (already filtered by the player's preference). */
  hint: string | null;
}

const LEVEL_STYLE: Readonly<Record<Difficulty, string>> = {
  easy: 'border-emerald-400/30 text-emerald-300',
  medium: 'border-amber-400/30 text-amber-300',
  hard: 'border-rose-400/40 text-rose-300',
};

/** Who you are playing: name, level, and one line of what they are saying or doing. */
const CpuBadge: React.FC<CpuBadgeProps> = ({
  persona,
  difficulty,
  isDealer,
  thinking,
  fantasyland,
  quip,
  hint,
}) => {
  const line = hint && !thinking ? hint : quip;
  const isHint = line !== null && line === hint && !thinking;
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-rose-400/30 bg-rose-950/50">
        <Bot size={15} className="text-rose-300" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 leading-tight">
          <span className="text-sm font-black tracking-wide text-stone-100">{persona.name}</span>
          <span className={`rounded-full border px-1.5 text-[9px] font-black uppercase tracking-widest ${LEVEL_STYLE[difficulty]}`}>
            {difficulty}
          </span>
          {isDealer && (
            <span className="rounded-full border border-white/10 px-1.5 text-[9px] font-black uppercase tracking-widest text-stone-400">
              Dealer
            </span>
          )}
          {fantasyland && (
            <span className="rounded-full border border-[#d4af37]/40 px-1.5 text-[9px] font-black uppercase tracking-widest text-[#d4af37]">
              Fantasyland
            </span>
          )}
          {thinking && (
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-stone-400" role="status">
              thinking
              <span className="inline-flex gap-0.5" aria-hidden="true">
                <span className="h-1 w-1 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.3s]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.15s]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-stone-400" />
              </span>
            </span>
          )}
        </div>
        <p
          key={line ?? 'none'}
          aria-live="polite"
          title={line ?? undefined}
          className={`ofc-fade h-4 truncate text-xs leading-4 ${isHint ? 'text-[#e7c25d]' : 'italic text-stone-400'}`}
        >
          {line ? (isHint ? line : `“${line}”`) : ''}
        </p>
      </div>
    </div>
  );
};

export default CpuBadge;
