import React, { useState } from 'react';
import {
  ROW_NAMES,
  ROW_SIZE,
  type Board,
  type RowEval,
  type RowName,
} from '../engine';
import Card from './Card';

const ROW_LABEL: Readonly<Record<RowName, string>> = { front: 'Front', mid: 'Middle', back: 'Back' };

export interface BoardViewProps {
  board: Board;
  /** Human board: empty slots accept taps and drops. */
  interactive?: boolean;
  /** Highlight empty slots (a card is selected or being dragged). */
  highlightSlots?: boolean;
  /** Cards placed this turn; they can be tapped to undo or dragged to another row. */
  stagedIds?: ReadonlySet<string>;
  /** Show face-down cards instead of the real ones (opponent in Fantasyland). */
  hidden?: boolean;
  evals?: Record<RowName, RowEval>;
  /** Royalty points per row (shown once the hand is scored). */
  royalties?: Record<RowName, number>;
  /** Rows to highlight as won. */
  winning?: Partial<Record<RowName, boolean>>;
  fouled?: boolean;
  onSlotClick?: (row: RowName) => void;
  onDropOnRow?: (cardId: string, row: RowName) => void;
  onStagedClick?: (cardId: string) => void;
  onDragStateChange?: (dragging: boolean) => void;
}

const BoardView: React.FC<BoardViewProps> = ({
  board,
  interactive = false,
  highlightSlots = false,
  stagedIds,
  hidden = false,
  evals,
  royalties,
  winning,
  fouled = false,
  onSlotClick,
  onDropOnRow,
  onStagedClick,
  onDragStateChange,
}) => {
  const [dragOver, setDragOver] = useState<RowName | null>(null);

  return (
    <div
      className={`relative flex flex-col gap-1 p-2 sm:p-4 rounded-3xl transition-colors duration-500 ${
        fouled
          ? 'bg-rose-900/20 ring-4 ring-rose-600/50'
          : 'bg-black/30 border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
      }`}
    >
      {fouled && (
        <div className="absolute inset-0 z-40 flex items-center justify-center rounded-3xl bg-black/70 pointer-events-none">
          <div className="ofc-pop -rotate-12 border-4 border-rose-500 px-5 py-2 text-3xl sm:text-5xl font-black tracking-[0.2em] text-rose-500">
            FOULED
          </div>
        </div>
      )}

      {ROW_NAMES.map((row) => {
        const cards = board[row];
        const ev = evals?.[row];
        const royalty = royalties?.[row] ?? 0;
        const won = winning?.[row] ?? false;
        const emptySlots = Math.max(0, ROW_SIZE[row] - cards.length);
        const accepting = interactive && emptySlots > 0;
        return (
          <div
            key={row}
            data-row={row}
            onDragOver={(e) => {
              if (!accepting) return;
              e.preventDefault();
              setDragOver(row);
            }}
            onDragLeave={() => setDragOver((r) => (r === row ? null : r))}
            onDrop={(e) => {
              setDragOver(null);
              if (!accepting) return;
              e.preventDefault();
              const id = e.dataTransfer.getData('cardId');
              if (id) onDropOnRow?.(id, row);
            }}
            className={`rounded-xl px-1 py-1 sm:px-2 transition-all duration-300 ${
              won ? 'bg-[#d4af37]/10 ring-1 ring-[#d4af37]/40' : ''
            } ${dragOver === row ? 'bg-[#d4af37]/10' : ''}`}
          >
            <div className="flex items-baseline justify-between gap-2 px-1 pb-1 text-[10px] font-black uppercase tracking-[0.18em]">
              <span className={won ? 'text-[#d4af37]' : 'text-stone-500'}>{ROW_LABEL[row]}</span>
              <span className="truncate text-right text-[#d4af37]/80 normal-case tracking-normal">
                {!hidden && ev && cards.length > 0 ? ev.name : ''}
                {!hidden && royalty > 0 ? ` · +${royalty}` : ''}
              </span>
            </div>
            <div className="flex justify-center gap-1.5 sm:gap-2">
              {cards.map((card) =>
                hidden ? (
                  <Card key={card.id} faceDown />
                ) : (
                  <Card
                    key={card.id}
                    card={card}
                    staged={stagedIds?.has(card.id)}
                    glow={won}
                    draggable={stagedIds?.has(card.id) ?? false}
                    onClick={
                      stagedIds?.has(card.id) && onStagedClick
                        ? () => onStagedClick(card.id)
                        : undefined
                    }
                    onDragStart={() => onDragStateChange?.(true)}
                    onDragEnd={() => onDragStateChange?.(false)}
                    className="ofc-pop"
                  />
                ),
              )}
              {Array.from({ length: emptySlots }, (_, i) => (
                <button
                  key={`empty-${i}`}
                  type="button"
                  disabled={!accepting}
                  aria-label={`Empty ${ROW_LABEL[row]} row slot`}
                  onClick={() => onSlotClick?.(row)}
                  className={`ofc-slot flex items-center justify-center rounded-lg border-2 border-dashed text-2xl font-bold transition-all ${
                    accepting && highlightSlots
                      ? 'cursor-pointer border-[#d4af37]/60 bg-[#d4af37]/10 text-[#d4af37] hover:bg-[#d4af37]/20'
                      : 'border-stone-800 bg-black/20 text-[#d4af37]/10'
                  } ${dragOver === row ? 'scale-105 border-[#d4af37] bg-[#d4af37]/20' : ''}`}
                >
                  +
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BoardView;
