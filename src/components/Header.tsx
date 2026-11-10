import React from 'react';
import { Coins, Crown } from 'lucide-react';
import type { GameState, Session } from '../engine';

interface HeaderProps {
  session: Session;
  game: GameState;
}

const Header: React.FC<HeaderProps> = ({ session, game }) => {
  const config = game.setup?.config ?? session.config;
  const handNo = game.phase === 'scored' ? session.handNo - 1 : session.handNo;
  return (
    <header className="z-20 flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-4 pt-3 text-stone-300">
      <div className="flex items-center gap-2">
        <Crown size={16} className="text-[#d4af37]" aria-hidden="true" />
        <span className="text-sm font-black uppercase tracking-[0.2em] text-[#d4af37]">OFC Poker</span>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/60 px-4 py-2 text-xs font-bold backdrop-blur-xl">
        <Coins size={14} className="text-emerald-400" aria-hidden="true" />
        <span className="font-black text-emerald-400" aria-label="Bankroll">
          ${session.bankroll.toLocaleString()}
        </span>
        <span className="text-stone-600">|</span>
        <span className="text-stone-400">${config.stake}/pt</span>
      </div>

      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">
        <span className="rounded-full border border-white/5 bg-black/40 px-3 py-1">
          Hand {Math.max(1, handNo)}
        </span>
        <span className="rounded-full border border-white/5 bg-black/40 px-3 py-1">
          {config.variant}
        </span>
        {game.setup && (
          <span
            className="hidden rounded-full border border-white/5 bg-black/40 px-3 py-1 sm:inline"
            title="Seed: replays this exact deal"
          >
            seed {game.setup.seed.split(':')[1] ? game.setup.seed.slice(0, 6) : game.setup.seed}
          </span>
        )}
      </div>
    </header>
  );
};

export default Header;
