import React from 'react';
import type { Card as CardModel, Turn } from '../engine';
import Card from './Card';

interface HandTrayProps {
  held: readonly CardModel[];
  turn: Turn;
  discarded: readonly CardModel[];
  selectedId: string | null;
  onSelect: (cardId: string) => void;
  onDiscard: () => void;
  onUndoDiscard: (cardId: string) => void;
  onDragStateChange: (dragging: boolean) => void;
  onDropDiscard: (cardId: string) => void;
}

const HandTray: React.FC<HandTrayProps> = ({
  held,
  turn,
  discarded,
  selectedId,
  onSelect,
  onDiscard,
  onUndoDiscard,
  onDragStateChange,
  onDropDiscard,
}) => {
  const small = turn.dealt.length > 5;
  const canDiscard = turn.need.discard > 0;
  const discardFull = discarded.length >= turn.need.discard;

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex min-h-[6rem] max-w-full flex-wrap justify-center gap-2 px-2">
        {held.map((card) => (
          <Card
            key={card.id}
            card={card}
            small={small}
            selected={selectedId === card.id}
            draggable
            onClick={() => onSelect(card.id)}
            onDragStart={() => onDragStateChange(true)}
            onDragEnd={() => onDragStateChange(false)}
            className="ofc-pop shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
          />
        ))}
      </div>

      {canDiscard && (
        <div
          onDragOver={(e) => {
            if (!discardFull) e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData('cardId');
            if (id) onDropDiscard(id);
          }}
          className="flex items-center gap-3 rounded-2xl border border-dashed border-rose-400/40 bg-rose-950/30 px-4 py-2"
        >
          <button
            type="button"
            onClick={onDiscard}
            disabled={selectedId === null || discardFull}
            className="rounded-full border border-rose-400/40 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-rose-300 transition enabled:hover:bg-rose-500/20 disabled:opacity-40"
          >
            Discard {discarded.length}/{turn.need.discard}
          </button>
          <div className="flex gap-1.5">
            {discarded.map((card) => (
              <Card key={card.id} card={card} small onClick={() => onUndoDiscard(card.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HandTray;
