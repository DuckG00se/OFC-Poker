import React from 'react';
import { BookOpen, Play } from 'lucide-react';
import { personaFor } from '../ai';
import type { GameConfig } from '../engine';
import SettingsPanel from './SettingsPanel';

interface StartScreenProps {
  config: GameConfig;
  onConfig: (patch: Partial<GameConfig>) => void;
  onDeal: () => void;
  /** Whether the guided hand will run on this deal, and the switch for it. */
  guided: boolean;
  onGuided: (on: boolean) => void;
  onRules: () => void;
  /** A line about the player's record so far, if they have one. */
  summary: string | null;
}

const StartScreen: React.FC<StartScreenProps> = ({ config, onConfig, onDeal, guided, onGuided, onRules, summary }) => {
  const persona = personaFor(config.difficulty);
  return (
    <main className="relative z-10 flex w-full max-w-md flex-1 flex-col items-center justify-center px-3 py-6">
      <div className="ofc-pop flex w-full flex-col items-center gap-5 rounded-[2rem] border border-[#d4af37]/15 bg-black/55 p-6 shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight text-white">Open Face Chinese Poker</h1>
          <div className="mx-auto mt-2 h-0.5 w-24 rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
          <p className="mt-3 text-sm text-stone-400">
            Build three rows from 13 cards. Back beats middle, middle beats front, or you foul.
          </p>
        </div>
        <SettingsPanel config={config} onChange={onConfig} />
        <p className="w-full rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs text-stone-300">
          <span className="font-black text-white">{persona.name}</span>, {persona.title.toLowerCase()}.{' '}
          {persona.blurb}
        </p>
        <label className="flex w-full cursor-pointer items-center gap-2.5 text-sm text-stone-200">
          <input
            type="checkbox"
            checked={guided}
            onChange={(e) => onGuided(e.target.checked)}
            className="h-4 w-4 accent-[#d4af37]"
          />
          <span>
            <span className="font-bold">Guide me through this hand</span>
            <span className="block text-xs text-stone-400">A short walkthrough while you play. Skip it any time.</span>
          </span>
        </label>
        <button
          type="button"
          onClick={onDeal}
          autoFocus
          className="flex items-center gap-2 rounded-full bg-gradient-to-b from-[#e7c25d] to-[#d4af37] px-12 py-3 text-lg font-black text-stone-900 shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition hover:scale-105 active:scale-95"
        >
          <Play size={18} fill="currentColor" aria-hidden="true" /> DEAL
        </button>
        <div className="flex w-full flex-wrap items-center justify-between gap-2 text-xs text-stone-400">
          <span>{summary ?? 'Your progress is saved on this device.'}</span>
          <button
            type="button"
            onClick={onRules}
            className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[#e7c25d] hover:underline"
          >
            <BookOpen size={13} aria-hidden="true" /> Rules
          </button>
        </div>
      </div>
    </main>
  );
};

export default StartScreen;
