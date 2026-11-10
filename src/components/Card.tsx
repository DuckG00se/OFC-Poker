import React from 'react';
import { rankLabel, type Card as CardModel, type Suit } from '../engine';

const GLYPH: Readonly<Record<Suit, string>> = { h: '♥', d: '♦', c: '♣', s: '♠' };
const SUIT_NAME: Readonly<Record<Suit, string>> = {
  h: 'hearts',
  d: 'diamonds',
  c: 'clubs',
  s: 'spades',
};

export const cardLabel = (card: CardModel): string => `${rankLabel(card.rank)} of ${SUIT_NAME[card.suit]}`;

interface CardProps {
  /** Omit (or set faceDown) to show the back of a card. */
  card?: CardModel;
  faceDown?: boolean;
  small?: boolean;
  selected?: boolean;
  staged?: boolean;
  glow?: boolean;
  draggable?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  className?: string;
}

const Card: React.FC<CardProps> = ({
  card,
  faceDown,
  small = false,
  selected = false,
  staged = false,
  glow = false,
  draggable = false,
  onClick,
  onDragStart,
  onDragEnd,
  className = '',
}) => {
  const size = small ? 'ofc-card-sm' : 'ofc-card';
  const interactive = onClick !== undefined;

  if (!card || faceDown) {
    return (
      <div
        aria-label="Face-down card"
        className={`${size} relative rounded-lg border-2 border-[#d4af37]/40 shadow-md bg-[repeating-linear-gradient(45deg,#7f1d1d,#7f1d1d_4px,#991b1b_4px,#991b1b_8px)] ${className}`}
      >
        <div className="absolute inset-1 rounded border border-[#d4af37]/30" />
      </div>
    );
  }

  const red = card.suit === 'h' || card.suit === 'd';
  const ink = red ? 'text-red-600' : 'text-slate-900';
  const rank = rankLabel(card.rank);

  return (
    <div
      role={interactive ? 'button' : 'img'}
      tabIndex={interactive ? 0 : undefined}
      aria-label={cardLabel(card)}
      aria-pressed={interactive ? selected : undefined}
      draggable={draggable}
      onClick={onClick}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.setData('cardId', card.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(e);
      }}
      onDragEnd={onDragEnd}
      className={`
        ${size} relative flex flex-col justify-between rounded-lg border-2 bg-white p-[0.12em]
        shadow-md transition-all duration-200 ease-out font-black leading-none
        ${selected ? 'border-[#d4af37] -translate-y-3 shadow-2xl ring-2 ring-[#d4af37] z-30' : staged ? 'border-[#d4af37]/70 ring-1 ring-[#d4af37]/50' : 'border-slate-300'}
        ${glow ? 'ring-2 ring-[#d4af37] shadow-[0_0_14px_rgba(212,175,55,0.5)]' : ''}
        ${interactive ? 'cursor-pointer hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-[#d4af37]' : ''}
        ${draggable ? 'active:cursor-grabbing' : ''}
        ${className}
      `}
    >
      <div className={`${ink} pl-[0.15em]`}>{rank}</div>
      <div className={`${ink} text-center text-[1.7em] pointer-events-none`} aria-hidden="true">
        {GLYPH[card.suit]}
      </div>
      <div className={`${ink} pr-[0.15em] text-right rotate-180`} aria-hidden="true">
        {rank}
      </div>
    </div>
  );
};

export default Card;
