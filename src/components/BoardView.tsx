import React from 'react';
import { ROW_NAMES, ROW_SIZE, type Board, type RowName, type RowOuts } from '../engine';
import Card from './Card';

const ROW_LABEL: Readonly<Record<RowName, string>> = { front: 'Front', mid: 'Middle', back: 'Back' };
const ROW_KEY: Readonly<Record<RowName, string>> = { front: '1', mid: '2', back: '3' };

const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

const outsText = (outs: readonly RowOuts[]): string =>
  outs
    .map((o) => (o.needs === 1 ? `${o.label} ${o.outs} out${o.outs === 1 ? '' : 's'}` : `${o.label} ${o.outs} live`))
    .join(' · ');

export interface BoardViewProps {
  board: Board;
  /** Card size: the player's board is larger than the opponent's. */
  size: 'human' | 'cpu';
  /** Empty slots accept taps, and rows accept drops. */
  interactive?: boolean;
  /** Emphasise empty slots (a card is selected or being dragged). */
  highlightSlots?: boolean;
  /** Cards placed this turn; they can be tapped to take back or dragged elsewhere. */
  stagedIds?: ReadonlySet<string>;
  /** Show face-down cards (an opponent in Fantasyland). */
  hidden?: boolean;
  /** Stagger the flip when a hidden board is turned over. */
  staggerReveal?: boolean;
  /** Hand name per row (omit to hide). */
  names?: Partial<Record<RowName, string>>;
  /** Royalty points per row (0 = none). */
  royalties?: Partial<Record<RowName, number>>;
  /** Live outs per row. */
  outs?: Partial<Record<RowName, readonly RowOuts[]>>;
  /** Row results revealed so far, from this board's point of view (+1 / 0 / -1). */
  rowPoints?: Partial<Record<RowName, number>>;
  fouled?: boolean;
  onSlotClick?: (row: RowName) => void;
  onStagedClick?: (cardId: string) => void;
  dragBind?: (cardId: string) => { onPointerDown: (e: React.PointerEvent<HTMLElement>) => void };
}

const BoardView: React.FC<BoardViewProps> = ({
  board,
  size,
  interactive = false,
  highlightSlots = false,
  stagedIds,
  hidden = false,
  staggerReveal = false,
  names,
  royalties,
  outs,
  rowPoints,
  fouled = false,
  onSlotClick,
  onStagedClick,
  dragBind,
}) => (
  <div
    className={`relative flex flex-col rounded-2xl border p-1 transition-colors duration-500 sm:rounded-3xl sm:p-2 ${
      size === 'human' ? 'cards-human gap-0.5' : 'cards-cpu gap-0'
    } ${fouled ? 'border-rose-500/60 bg-rose-950/30' : 'border-white/5 bg-black/30'}`}
  >
    {fouled && (
      <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-[inherit] bg-black/55">
        <div className="ofc-stamp border-4 border-rose-500 px-4 py-1 text-2xl font-black tracking-[0.2em] text-rose-500 sm:text-4xl">
          FOULED
        </div>
      </div>
    )}

    {ROW_NAMES.map((row) => {
      const cards = board[row];
      const emptySlots = Math.max(0, ROW_SIZE[row] - cards.length);
      const accepting = interactive && emptySlots > 0;
      const name = !hidden && cards.length > 0 ? names?.[row] : undefined;
      const royalty = hidden ? 0 : (royalties?.[row] ?? 0);
      const rowOutsList = hidden ? [] : (outs?.[row] ?? []);
      const points = rowPoints?.[row];
      const won = points !== undefined && points > 0;
      const lost = points !== undefined && points < 0;
      return (
        <div
          key={row}
          role="group"
          aria-label={`${ROW_LABEL[row]} row, ${cards.length} of ${ROW_SIZE[row]} cards${name ? `, ${name}` : ''}${royalty > 0 ? `, ${royalty} royalty points` : ''}`}
          data-drop={accepting ? `row:${row}` : undefined}
          className={`relative rounded-xl px-1 pb-1 pt-0.5 transition-[background-color,box-shadow] duration-300 ${
            won ? 'bg-[#d4af37]/10 shadow-[inset_0_0_0_1px_rgba(212,175,55,0.45)]' : ''
          }`}
        >
          <div className="flex h-3.5 items-center justify-between gap-2 px-0.5 text-[10px] leading-none">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className={`font-black uppercase tracking-[0.16em] ${won ? 'text-[#d4af37]' : 'text-stone-400'}`}>
                {ROW_LABEL[row]}
              </span>
              {interactive && (
                <kbd className="ofc-kbd-hint rounded border border-white/10 px-1 text-[9px] font-bold text-stone-400">
                  {ROW_KEY[row]}
                </kbd>
              )}
              {rowOutsList.length > 0 && (
                <span className="truncate font-bold text-sky-300/90">{outsText(rowOutsList)}</span>
              )}
            </span>
            <span className="truncate text-right font-bold text-[#d4af37]/90">
              {name}
              {royalty > 0 && <span className="ml-1 rounded bg-[#d4af37]/15 px-1 text-[#e7c25d]">+{royalty}</span>}
            </span>
          </div>

          <div className="flex items-center justify-center gap-[max(3px,0.9vw)] sm:gap-2">
            {cards.map((card, index) => {
              const staged = stagedIds?.has(card.id) ?? false;
              return (
                <Card
                  key={card.id}
                  card={card}
                  faceDown={hidden}
                  staged={staged}
                  glow={won}
                  dim={lost}
                  dealDelayMs={staggerReveal ? index * 35 : 0}
                  hint={staged ? 'placed this turn, activate to take it back' : undefined}
                  onClick={staged && onStagedClick ? () => onStagedClick(card.id) : undefined}
                  dragProps={staged && dragBind ? dragBind(card.id) : undefined}
                />
              );
            })}
            {Array.from({ length: emptySlots }, (_, i) => (
              <button
                key={`empty-${i}`}
                type="button"
                disabled={!accepting}
                tabIndex={accepting && i === 0 ? 0 : -1}
                aria-label={`Place on the ${ROW_LABEL[row].toLowerCase()} row`}
                onClick={() => onSlotClick?.(row)}
                className={`ofc-slot border-2 border-dashed transition-colors duration-150 ${
                  accepting && highlightSlots
                    ? 'cursor-pointer border-[#d4af37]/70 bg-[#d4af37]/10 hover:bg-[#d4af37]/25'
                    : accepting
                      ? 'cursor-pointer border-stone-700 bg-black/20 hover:border-[#d4af37]/40'
                      : 'border-stone-800/80 bg-black/20'
                }`}
              />
            ))}
          </div>

          {points !== undefined && (
            <span
              className={`ofc-pop absolute right-1 top-1/2 z-20 rounded-full px-2 py-0.5 text-xs font-black shadow-lg sm:right-2 sm:text-sm ${
                won
                  ? 'bg-[#d4af37] text-stone-900'
                  : lost
                    ? 'bg-rose-600 text-white'
                    : 'bg-stone-700 text-stone-200'
              }`}
            >
              {signed(points)}
            </span>
          )}
        </div>
      );
    })}
  </div>
);

export default BoardView;
