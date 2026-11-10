import React from 'react';
import { ROW_NAMES, type HandScore, type RowName } from '../engine';

const ROW_LABEL: Readonly<Record<RowName, string>> = { front: 'Front', mid: 'Middle', back: 'Back' };
const signed = (n: number): string => (n > 0 ? `+${n}` : String(n));

interface ResultDetailsProps {
  result: HandScore;
  cpuName: string;
  stake: number;
}

/** The full scoring breakdown for a finished hand. */
const ResultDetails: React.FC<ResultDetailsProps> = ({ result, cpuName, stake }) => {
  const { human, ai } = result.seats;
  const points = result.points.human;
  const anyFoul = human.fouled || ai.fouled;
  return (
    <div className="flex flex-col gap-3">
      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-widest text-stone-400">
            <th scope="col" className="text-left font-black">Row</th>
            <th scope="col" className="text-left font-black">You</th>
            <th scope="col" className="text-left font-black">{cpuName}</th>
            <th scope="col" className="text-right font-black">Pts</th>
          </tr>
        </thead>
        <tbody>
          {ROW_NAMES.map((row) => (
            <tr key={row} className="border-t border-white/5">
              <th scope="row" className="py-1.5 text-left font-bold text-stone-400">{ROW_LABEL[row]}</th>
              <td className="py-1.5 text-stone-200">
                {human.evals[row].name}
                {human.royalties[row] > 0 && <span className="ml-1 text-[#d4af37]">+{human.royalties[row]}</span>}
              </td>
              <td className="py-1.5 text-stone-200">
                {ai.evals[row].name}
                {ai.royalties[row] > 0 && <span className="ml-1 text-[#d4af37]">+{ai.royalties[row]}</span>}
              </td>
              <td
                className={`py-1.5 text-right font-black ${
                  result.rowResults[row] > 0 ? 'text-emerald-400' : result.rowResults[row] < 0 ? 'text-rose-400' : 'text-stone-400'
                }`}
              >
                {signed(result.rowResults[row])}
              </td>
            </tr>
          ))}
          {result.scoop !== 0 && (
            <tr className="border-t border-white/5">
              <th scope="row" colSpan={3} className="py-1.5 text-left font-bold text-[#d4af37]">
                {anyFoul ? 'Foul penalty (scoop)' : 'Scoop bonus'}
              </th>
              <td className="py-1.5 text-right font-black text-[#d4af37]">{signed(result.scoop)}</td>
            </tr>
          )}
          <tr className="border-t border-white/5">
            <th scope="row" colSpan={3} className="py-1.5 text-left font-bold text-stone-400">
              Royalties (you {human.royaltyTotal}, {cpuName} {ai.royaltyTotal})
            </th>
            <td className="py-1.5 text-right font-black text-stone-200">
              {signed(human.royaltyTotal - ai.royaltyTotal)}
            </td>
          </tr>
          <tr className="border-t border-[#d4af37]/30">
            <th scope="row" colSpan={3} className="py-2 text-left font-black text-white">
              Total: {signed(points)} points × ${stake}
            </th>
            <td className={`py-2 text-right font-black ${points > 0 ? 'text-emerald-400' : points < 0 ? 'text-rose-400' : 'text-stone-300'}`}>
              {points < 0 ? '-' : '+'}${Math.abs(points * stake).toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>
      {anyFoul && (
        <p className="text-xs text-rose-300">
          {human.fouled && ai.fouled
            ? 'Both boards fouled, so no points change hands.'
            : human.fouled
              ? `Your board fouled: ${cpuName} collects a scoop plus royalties, and you earn none.`
              : `${cpuName} fouled: you collect a scoop plus your royalties.`}
        </p>
      )}
    </div>
  );
};

export default ResultDetails;
