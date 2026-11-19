import React from 'react';
import { FOUL_EXPLAINER } from '../../content/onboarding';
import type { Board } from '../../engine';
import { describeProblem, orderProblems, problemRows } from '../../ui/onboarding';
import Modal from '../Modal';
import MiniBoard from './MiniBoard';

interface FoulExplainerProps {
  /** The player's finished, fouled board. */
  board: Board;
  onClose: () => void;
  onRules: () => void;
}

/** Shown once, the first time the player fouls: what the rule is and exactly what broke it. */
const FoulExplainer: React.FC<FoulExplainerProps> = ({ board, onClose, onRules }) => {
  const problems = orderProblems(board);
  return (
    <Modal title={FOUL_EXPLAINER.title} onClose={onClose}>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-stone-300">
        <p className="font-bold text-white">{FOUL_EXPLAINER.lead}</p>
        <p>{FOUL_EXPLAINER.rule}</p>
        <p className="text-xs font-black uppercase tracking-widest text-stone-400">{FOUL_EXPLAINER.whatHappened}</p>
        <div className="cards-guide">
          <MiniBoard board={board} title="Your board" tone="bad" flagged={problemRows(problems)} />
        </div>
        {problems.length > 0 && (
          <ul className="flex flex-col gap-1 rounded-xl border border-rose-400/30 bg-rose-950/30 p-3 text-[13px] text-rose-100">
            {problems.map((p) => (
              <li key={`${p.upper}-${p.lower}`}>{describeProblem(p)}</li>
            ))}
          </ul>
        )}
        <p>{FOUL_EXPLAINER.cost}</p>
        <div>
          <p className="mb-1 text-xs font-black uppercase tracking-widest text-[#d4af37]">{FOUL_EXPLAINER.tipsTitle}</p>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {FOUL_EXPLAINER.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={onRules}
            className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-stone-200 transition hover:border-[#d4af37]/60"
          >
            {FOUL_EXPLAINER.seeRules}
          </button>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="rounded-full bg-gradient-to-b from-[#e7c25d] to-[#d4af37] px-6 py-2 text-xs font-black uppercase tracking-wider text-stone-900"
          >
            {FOUL_EXPLAINER.gotIt}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default FoulExplainer;
