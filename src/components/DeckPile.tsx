import React from 'react';
import { useDeckAnchor } from '../ui/flip';

interface DeckPileProps {
  /** Cards left in the deck. */
  remaining: number;
}

/** The deck: where dealt cards fly from, with a count of what is left. */
const DeckPile: React.FC<DeckPileProps> = ({ remaining }) => {
  const anchor = useDeckAnchor();
  return (
    <div className="cards-deck relative flex-none" aria-label={`Deck: ${remaining} cards left`} role="img">
      <div className="ofc-card ofc-card-back absolute left-[3px] top-[3px] opacity-60" />
      <div className="ofc-card ofc-card-back absolute left-[1.5px] top-[1.5px] opacity-80" />
      <div ref={anchor} className="ofc-card ofc-card-back relative flex items-center justify-center">
        <span className="rounded bg-black/55 px-0.5 text-[9px] font-black text-[#e7c25d]">{remaining}</span>
      </div>
    </div>
  );
};

export default DeckPile;
