import React from 'react';
import { ROW_NAMES, evaluateRow, type Board, type RowName } from '../../engine';
import Card from '../Card';

const LABEL: Readonly<Record<RowName, string>> = { front: 'Front', mid: 'Middle', back: 'Back' };

interface MiniBoardProps {
  board: Board;
  /** A short name shown above the board, e.g. "You". */
  title: string;
  tone?: 'neutral' | 'good' | 'bad';
  /** Mark rows (e.g. the two rows that break the order in a foul). */
  flagged?: readonly RowName[];
  /** Per-row result to show on the right, e.g. "+1". */
  results?: Partial<Record<RowName, string>>;
}

const TONE: Readonly<Record<NonNullable<MiniBoardProps['tone']>, string>> = {
  neutral: 'border-white/10 bg-black/30',
  good: 'border-emerald-400/50 bg-emerald-950/30',
  bad: 'border-rose-400/60 bg-rose-950/30',
};

/** A small, read-only board drawn with the game's own cards, with each row's hand named. */
const MiniBoard: React.FC<MiniBoardProps> = ({ board, title, tone = 'neutral', flagged = [], results }) => (
  <figure
    className={`cards-guide m-0 rounded-2xl border p-2 ${TONE[tone]}`}
    aria-label={`${title}: ${ROW_NAMES.map((r) => `${LABEL[r]} ${evaluateRow(board[r], r).name}`).join(', ')}`}
  >
    <figcaption className="px-1 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">{title}</figcaption>
    <div className="flex flex-col gap-1.5">
      {ROW_NAMES.map((row) => {
        const hot = flagged.includes(row);
        return (
          <div key={row} className={`rounded-lg px-1 py-0.5 ${hot ? 'bg-rose-500/15 ring-1 ring-rose-400/60' : ''}`}>
            <div className="flex items-baseline justify-between px-0.5 text-[10px] font-bold leading-4">
              <span className="uppercase tracking-widest text-stone-400">{LABEL[row]}</span>
              <span className={hot ? 'text-rose-200' : 'text-[#e7c25d]'}>{evaluateRow(board[row], row).name}</span>
            </div>
            <div className="flex items-center gap-1">
              {board[row].map((card) => (
                <Card key={card.id} card={card} />
              ))}
              {results?.[row] && (
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-xs font-black ${
                    results[row]?.startsWith('+') ? 'bg-[#d4af37] text-stone-900' : results[row] === '0' ? 'bg-stone-600 text-white' : 'bg-rose-600 text-white'
                  }`}
                >
                  {results[row]}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </figure>
);

export default MiniBoard;
