import React from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { ROW_NAMES, type HandScore, type RowName, type Session } from '../engine';
import SettingsPanel from './SettingsPanel';
import type { GameApi } from '../state/useGame';

const ROW_LABEL: Readonly<Record<RowName, string>> = { front: 'Front', mid: 'Middle', back: 'Back' };
const signed = (n: number): string => (n > 0 ? `+${n}` : String(n));

interface ResultPanelProps {
  result: HandScore;
  session: Session;
  fantasylandNext: number;
  handPayout: number;
  onDeal: () => void;
  onConfig: GameApi['setConfig'];
}

const ResultPanel: React.FC<ResultPanelProps> = ({
  result,
  session,
  fantasylandNext,
  handPayout,
  onDeal,
  onConfig,
}) => {
  const { human, ai } = result.seats;
  const points = result.points.human;
  const tone = points > 0 ? 'text-emerald-400' : points < 0 ? 'text-rose-400' : 'text-stone-300';

  return (
    <div className="ofc-pop flex w-full max-w-xl flex-col items-center gap-4 rounded-[2rem] border border-[#d4af37]/20 bg-black/60 p-5 sm:p-7 backdrop-blur-2xl shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-widest text-stone-500">
            <th className="text-left font-black">Row</th>
            <th className="text-left font-black">You</th>
            <th className="text-left font-black">CPU</th>
            <th className="text-right font-black">Pts</th>
          </tr>
        </thead>
        <tbody>
          {ROW_NAMES.map((row) => (
            <tr key={row} className="border-t border-white/5">
              <td className="py-1.5 font-bold text-stone-400">{ROW_LABEL[row]}</td>
              <td className="py-1.5 text-stone-200">
                {human.evals[row].name}
                {human.royalties[row] > 0 && (
                  <span className="ml-1 text-[#d4af37]">+{human.royalties[row]}</span>
                )}
              </td>
              <td className="py-1.5 text-stone-200">
                {ai.evals[row].name}
                {ai.royalties[row] > 0 && (
                  <span className="ml-1 text-[#d4af37]">+{ai.royalties[row]}</span>
                )}
              </td>
              <td
                className={`py-1.5 text-right font-black ${
                  result.rowResults[row] > 0
                    ? 'text-emerald-400'
                    : result.rowResults[row] < 0
                      ? 'text-rose-400'
                      : 'text-stone-500'
                }`}
              >
                {signed(result.rowResults[row])}
              </td>
            </tr>
          ))}
          {result.scoop !== 0 && (
            <tr className="border-t border-white/5">
              <td colSpan={3} className="py-1.5 font-bold text-[#d4af37]">
                {human.fouled || ai.fouled ? 'Foul penalty' : 'Scoop bonus'}
              </td>
              <td className="py-1.5 text-right font-black text-[#d4af37]">{signed(result.scoop)}</td>
            </tr>
          )}
          {(human.fouled || ai.fouled) && (
            <tr className="border-t border-white/5">
              <td colSpan={4} className="py-1.5 text-rose-300">
                {human.fouled && ai.fouled
                  ? 'Both boards fouled: no points change hands.'
                  : human.fouled
                    ? 'Your board fouled: the CPU collects a scoop and you earn no royalties.'
                    : 'The CPU fouled: you collect a scoop.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex flex-col items-center gap-1">
        <div className={`text-5xl font-black ${tone}`}>
          {signed(points)} <span className="text-lg">pts</span>
        </div>
        <div className={`text-lg font-black ${tone}`}>
          {handPayout >= 0 ? '+' : '-'}${Math.abs(handPayout).toLocaleString()}
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500">
          Bankroll ${session.bankroll.toLocaleString()}
        </div>
      </div>

      {fantasylandNext > 0 && (
        <div className="flex items-center gap-2 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#d4af37]">
          <Sparkles size={14} /> You're in Fantasyland next hand ({fantasylandNext} cards)
        </div>
      )}
      {session.fantasyland.ai > 0 && (
        <div className="rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-rose-300">
          CPU is in Fantasyland next hand ({session.fantasyland.ai} cards)
        </div>
      )}

      <button
        type="button"
        onClick={onDeal}
        className="group flex items-center gap-3 rounded-full bg-gradient-to-b from-[#e7c25d] to-[#d4af37] px-10 py-3 font-black text-stone-900 shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition hover:scale-105 active:scale-95"
      >
        <RefreshCw size={20} className="transition-transform duration-700 group-hover:rotate-180" />
        <span className="uppercase tracking-widest">Next hand</span>
      </button>

      <details className="w-full">
        <summary className="cursor-pointer text-center text-[10px] font-black uppercase tracking-[0.25em] text-stone-500 hover:text-stone-300">
          Settings
        </summary>
        <div className="mt-3">
          <SettingsPanel config={session.config} onChange={onConfig} />
        </div>
      </details>
    </div>
  );
};

export default ResultPanel;
