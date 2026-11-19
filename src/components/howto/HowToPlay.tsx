import React from 'react';
import { GraduationCap } from 'lucide-react';
import { COPY, HOWTO_SECTIONS } from '../../content/rules';
import { usePrefersReducedMotion } from '../../ui/prefs';
import Modal from '../Modal';
import {
  DealingSection,
  FantasylandSection,
  GoalSection,
  RankingsSection,
  RoyaltiesSection,
  RuleSection,
  ScoringSection,
} from './Sections';

interface HowToPlayProps {
  onClose: () => void;
  /** Offered as a button at the end of the intro, if provided. */
  onStartTutorial?: () => void;
}

/**
 * The rules and scoring screen. It is a dialog drawn over the game and changes nothing in it;
 * the game is paused while it is open (see useGame). Every number comes from the engine.
 */
const HowToPlay: React.FC<HowToPlayProps> = ({ onClose, onStartTutorial }) => {
  const reduced = usePrefersReducedMotion();
  const jump = (id: string): void => {
    document.getElementById(`howto-${id}`)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };
  return (
    <Modal title={COPY.title} onClose={onClose}>
      <p className="text-sm leading-relaxed text-stone-300">{COPY.intro}</p>
      <nav aria-label="Sections" className="-mx-1 mt-3 flex flex-wrap gap-1.5">
        {HOWTO_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => jump(s.id)}
            className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-stone-300 transition hover:border-[#d4af37]/60 hover:text-[#e7c25d]"
          >
            {s.label}
          </button>
        ))}
      </nav>
      {onStartTutorial && (
        <button
          type="button"
          onClick={onStartTutorial}
          className="mt-3 flex items-center gap-2 rounded-full border border-[#d4af37]/50 bg-[#d4af37]/10 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-[#e7c25d] transition hover:bg-[#d4af37]/20"
        >
          <GraduationCap size={14} aria-hidden="true" /> Play a guided hand
        </button>
      )}
      <div className="mt-1">
        <GoalSection />
        <RuleSection />
        <DealingSection />
        <ScoringSection />
        <RoyaltiesSection />
        <FantasylandSection />
        <RankingsSection />
      </div>
    </Modal>
  );
};

export default HowToPlay;
