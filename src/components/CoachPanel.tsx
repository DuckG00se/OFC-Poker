import React from 'react';
import { AlertTriangle, GraduationCap, PartyPopper } from 'lucide-react';
import { FOUL_WARNING, TUTORIAL } from '../content/onboarding';
import type { Tutorial } from '../ui/useTutorial';

/** A warning that takes the panel's place while the player's rows are heading for a foul. */
export interface CoachWarning {
  /** What is wrong, in plain words. */
  text: string;
  /** Chance of a foul, or null when it is already certain. */
  percent: number | null;
  /** Take back the last card placed. */
  onFix: () => void;
}

interface CoachPanelProps {
  tutorial: Tutorial;
  warning: CoachWarning | null;
}

/**
 * The tutorial's floating note. It is not a dialog: the table stays fully playable
 * underneath, and it sits away from whatever it is pointing at.
 */
const CoachPanel: React.FC<CoachPanelProps> = ({ tutorial, warning }) => {
  const { step } = tutorial;

  if (tutorial.active && warning) {
    return (
      <div
        aria-label="Tutorial warning"
        role="alert"
        data-place="top"
        className="ofc-coach ofc-pop rounded-2xl border border-rose-400/70 bg-[#2a0f12] p-3.5 shadow-[0_18px_40px_rgba(0,0,0,0.6)]"
      >
        <h2 className="flex items-center gap-2 text-sm font-black text-rose-200">
          <AlertTriangle size={16} aria-hidden="true" />
          {FOUL_WARNING.title}
        </h2>
        <p className="mt-1 text-[13px] leading-snug text-stone-100">{warning.text}</p>
        <p className="mt-1 text-xs leading-snug text-stone-300">
          {warning.percent === null ? FOUL_WARNING.certain : FOUL_WARNING.likely(warning.percent)} {FOUL_WARNING.hint}
        </p>
        <div className="mt-2.5 flex justify-end">
          <button
            type="button"
            onClick={warning.onFix}
            className="rounded-full bg-rose-300 px-4 py-1 text-[11px] font-black uppercase tracking-wider text-stone-900 transition hover:bg-rose-200"
          >
            {FOUL_WARNING.fix}
          </button>
        </div>
      </div>
    );
  }

  if (!step) return null;
  const Icon = step.celebrate ? PartyPopper : GraduationCap;
  return (
    <aside
      aria-label="Tutorial"
      data-place={step.place}
      className={`ofc-coach ofc-pop rounded-2xl border bg-[#0b1f16] p-3.5 shadow-[0_18px_40px_rgba(0,0,0,0.6)] ${
        step.celebrate ? 'border-[#e7c25d] ring-2 ring-[#d4af37]/40' : 'border-[#d4af37]/50'
      }`}
    >
      <div key={step.id} aria-live="polite">
        <h2 className="flex items-center gap-2 text-sm font-black text-[#e7c25d]">
          <Icon size={16} aria-hidden="true" />
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
              {TUTORIAL.skip}
            </button>
          )}
          {step.manual ? (
            <button
              type="button"
              onClick={tutorial.next}
              className="rounded-full bg-[#d4af37] px-4 py-1 text-[11px] font-black uppercase tracking-wider text-stone-900 transition hover:bg-[#e7c25d]"
            >
              {tutorial.isLast ? TUTORIAL.done : TUTORIAL.next}
            </button>
          ) : (
            <span className="rounded-full border border-[#d4af37]/40 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#e7c25d]">
              {TUTORIAL.yourMove}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};

export default CoachPanel;
