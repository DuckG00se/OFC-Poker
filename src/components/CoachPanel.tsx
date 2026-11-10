import React from 'react';
import { GraduationCap } from 'lucide-react';
import type { Tutorial } from '../ui/useTutorial';

/**
 * The tutorial's floating note. It is not a dialog: the table stays fully playable
 * underneath, and it sits away from whatever it is pointing at.
 */
const CoachPanel: React.FC<{ tutorial: Tutorial }> = ({ tutorial }) => {
  const { step } = tutorial;
  if (!step) return null;
  return (
    <aside
      aria-label="Tutorial"
      data-place={step.place}
      className="ofc-coach ofc-pop rounded-2xl border border-[#d4af37]/50 bg-[#0b1f16]/95 p-3.5 shadow-[0_18px_40px_rgba(0,0,0,0.6)]"
    >
      <div key={step.id} aria-live="polite">
        <h2 className="flex items-center gap-2 text-sm font-black text-[#e7c25d]">
          <GraduationCap size={16} aria-hidden="true" />
          {step.title}
        </h2>
        <p className="mt-1 text-[13px] leading-snug text-stone-200">{step.body}</p>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
          {tutorial.position} of {tutorial.total}
        </span>
        <div className="flex items-center gap-2">
          {!tutorial.isLast && (
            <button
              type="button"
              onClick={tutorial.skip}
              className="rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-stone-400 transition hover:text-stone-200"
            >
              Skip tutorial
            </button>
          )}
          {step.manual ? (
            <button
              type="button"
              onClick={tutorial.next}
              className="rounded-full bg-[#d4af37] px-4 py-1 text-[11px] font-black uppercase tracking-wider text-stone-900 transition hover:bg-[#e7c25d]"
            >
              {tutorial.isLast ? 'Done' : 'Next'}
            </button>
          ) : (
            <span className="rounded-full border border-[#d4af37]/40 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#e7c25d]">
              Your move
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};

export default CoachPanel;
