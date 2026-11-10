import React from 'react';
import { Coins, Crown, Layers, Menu, Volume2, VolumeX } from 'lucide-react';

interface HeaderProps {
  bankroll: number;
  stake: number;
  handNo: number;
  variant: string;
  soundOn: boolean;
  showTracker: boolean;
  onToggleSound: () => void;
  onOpenTracker: () => void;
  onOpenMenu: () => void;
}

const IconButton: React.FC<{
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, pressed, onClick, children }) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={pressed}
    title={label}
    onClick={onClick}
    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-stone-300 transition hover:border-[#d4af37]/50 hover:text-[#d4af37]"
  >
    {children}
  </button>
);

const Header: React.FC<HeaderProps> = ({
  bankroll,
  stake,
  handNo,
  variant,
  soundOn,
  showTracker,
  onToggleSound,
  onOpenTracker,
  onOpenMenu,
}) => (
  <header className="ofc-header z-20 flex items-center justify-between gap-2 px-2 pt-2 sm:px-4">
    <div className="flex min-w-0 items-center gap-1.5">
      <Crown size={16} className="flex-none text-[#d4af37]" aria-hidden="true" />
      <div className="min-w-0 leading-tight">
        <div className="hidden text-xs font-black uppercase tracking-[0.18em] text-[#d4af37] sm:block">
          OFC Poker
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-[#d4af37] sm:font-bold sm:text-stone-400">
          Hand {handNo}
          <span className="hidden sm:inline"> · </span>
          <span className="block text-stone-400 sm:inline">{variant}</span>
        </div>
      </div>
    </div>

    <div
      className="flex items-center gap-2 rounded-full border border-white/5 bg-black/60 px-3 py-1.5 text-xs font-bold"
      aria-label={`Bankroll ${bankroll} dollars, ${stake} dollars per point`}
    >
      <Coins size={13} className={bankroll >= 0 ? 'text-emerald-400' : 'text-rose-400'} aria-hidden="true" />
      <span className={`font-black tabular-nums ${bankroll >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        {bankroll < 0 ? '-' : ''}${Math.abs(bankroll).toLocaleString()}
      </span>
      <span className="text-stone-400">${stake}/pt</span>
    </div>

    <div className="flex items-center gap-1.5">
      {showTracker && (
        <IconButton label="Cards remaining" onClick={onOpenTracker}>
          <Layers size={16} aria-hidden="true" />
        </IconButton>
      )}
      <IconButton label={soundOn ? 'Mute sound' : 'Turn sound on'} pressed={!soundOn} onClick={onToggleSound}>
        {soundOn ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
      </IconButton>
      <IconButton label="Menu" onClick={onOpenMenu}>
        <Menu size={16} aria-hidden="true" />
      </IconButton>
    </div>
  </header>
);

export default Header;
