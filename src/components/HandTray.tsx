import React from 'react';
import { Trash2 } from 'lucide-react';
import type { Card as CardModel } from '../engine';
import Card from './Card';

interface HandTrayProps {
  held: readonly CardModel[];
  /** Number of cards dealt this turn: big hands (Fantasyland) use smaller cards. */
  dealtCount: number;
  selectedId: string | null;
  /** How many cards must be discarded this turn (0 hides the discard zone). */
  discardNeed: number;
  discarded: readonly CardModel[];
  onSelect: (cardId: string) => void;
  onDiscardSelected: () => void;
  onUndoDiscard: (cardId: string) => void;
  dragBind: (cardId: string) => { onPointerDown: (e: React.PointerEvent<HTMLElement>) => void };
}

const HandTray: React.FC<HandTrayProps> = ({
  held,
  dealtCount,
  selectedId,
  discardNeed,
  discarded,
  onSelect,
  onDiscardSelected,
  onUndoDiscard,
  dragBind,
}) => {
  const big = dealtCount > 5;
  const discardFull = discarded.length >= discardNeed;

  return (
    <div className="flex w-full items-center justify-center gap-2 sm:gap-4">
      <div
        role="group"
        aria-label={`Your hand, ${held.length} card${held.length === 1 ? '' : 's'}`}
        data-drop="hand"
        className={`flex min-w-0 flex-wrap items-center justify-center gap-[max(4px,1.2vw)] rounded-xl p-1 sm:gap-2 ${
          big ? 'cards-fl' : 'cards-human'
        }`}
        style={{ minHeight: 'calc(var(--card-w) * 1.4 + 0.5rem)' }}
      >
        {held.map((card, index) => (
          <Card
            key={card.id}
            card={card}
            selected={selectedId === card.id}
            dealDelayMs={index * 70}
            onClick={() => onSelect(card.id)}
            dragProps={dragBind(card.id)}
            hint={selectedId === card.id ? 'selected' : undefined}
            className="shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
          />
        ))}
      </div>

      {discardNeed > 0 && (
        <div
          data-drop={discardFull ? undefined : 'discard'}
          className="cards-mini flex flex-none flex-col items-center gap-1 rounded-xl border border-dashed border-rose-400/40 bg-rose-950/30 p-1.5"
        >
          <div className="flex gap-1" style={{ minHeight: 'calc(var(--card-w) * 1.4)' }}>
            {discarded.map((card) => (
              <Card
                key={card.id}
                card={card}
                onClick={() => onUndoDiscard(card.id)}
                hint="marked to discard, activate to take it back"
              />
            ))}
            {Array.from({ length: Math.max(0, discardNeed - discarded.length) }, (_, i) => (
              <div key={i} className="ofc-slot flex items-center justify-center border-2 border-dashed border-rose-400/30">
                <Trash2 size={12} className="text-rose-400/50" aria-hidden="true" />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={onDiscardSelected}
            disabled={selectedId === null || discardFull}
            className="rounded-full border border-rose-400/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-300 transition enabled:hover:bg-rose-500/20 disabled:opacity-40"
          >
            Discard {discarded.length}/{discardNeed}
          </button>
        </div>
      )}
    </div>
  );
};

export default HandTray;
