import React from 'react';
import { BarChart3, BookOpen, Download, GraduationCap, History, Settings, Trophy } from 'lucide-react';
import Modal from './Modal';

export type MenuChoice = 'rules' | 'stats' | 'achievements' | 'history' | 'settings' | 'tutorial' | 'install';

interface MenuModalProps {
  canInstall: boolean;
  unlockedCount: number;
  totalAchievements: number;
  handsInHistory: number;
  onChoose: (choice: MenuChoice) => void;
  onClose: () => void;
}

const Item: React.FC<{
  icon: React.ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}> = ({ icon, title, detail, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-3.5 py-3 text-left transition hover:border-[#d4af37]/50"
  >
    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-black/40 text-[#d4af37]">{icon}</span>
    <span className="min-w-0">
      <span className="block text-sm font-black text-stone-100">{title}</span>
      <span className="block text-xs text-stone-400">{detail}</span>
    </span>
  </button>
);

const MenuModal: React.FC<MenuModalProps> = ({ canInstall, unlockedCount, totalAchievements, handsInHistory, onChoose, onClose }) => (
  <Modal title="Menu" onClose={onClose}>
    <div className="flex flex-col gap-2">
      <Item icon={<BookOpen size={17} aria-hidden="true" />} title="Rules and royalties" detail="How the game is scored, with the full royalty table" onClick={() => onChoose('rules')} />
      <Item icon={<GraduationCap size={17} aria-hidden="true" />} title="Guided hand" detail="A walkthrough of your next hand, step by step" onClick={() => onChoose('tutorial')} />
      <Item icon={<BarChart3 size={17} aria-hidden="true" />} title="Stats" detail="Win rate, foul rate, biggest win and more" onClick={() => onChoose('stats')} />
      <Item icon={<Trophy size={17} aria-hidden="true" />} title="Achievements" detail={`${unlockedCount} of ${totalAchievements} unlocked`} onClick={() => onChoose('achievements')} />
      <Item icon={<History size={17} aria-hidden="true" />} title="Hand history" detail={handsInHistory > 0 ? `Replay any of your last ${handsInHistory} hands` : 'Replay your finished hands'} onClick={() => onChoose('history')} />
      <Item icon={<Settings size={17} aria-hidden="true" />} title="Settings" detail="Game, sound, animation, cards and helpers" onClick={() => onChoose('settings')} />
      {canInstall && (
        <Item icon={<Download size={17} aria-hidden="true" />} title="Install app" detail="Add OFC Poker to this device and play offline" onClick={() => onChoose('install')} />
      )}
    </div>
  </Modal>
);

export default MenuModal;
