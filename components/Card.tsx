import React from 'react';
import { Card as CardType } from '../types';
import { Heart, Diamond, Club, Spade } from 'lucide-react';
import { RANK_NAMES } from '../constants';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  selected?: boolean;
  className?: string;
  small?: boolean;
  draggable?: boolean;
}

const Card: React.FC<CardProps> = ({ 
  card, 
  onClick, 
  onDragStart,
  selected, 
  className = '', 
  small = false,
  draggable = false
}) => {
  const isRed = card.suit === 'h' || card.suit === 'd';
  
  const SuitIcon = () => {
    const props = { size: small ? 14 : 20, className: isRed ? 'text-red-600' : 'text-slate-900' };
    switch (card.suit) {
      case 'h': return <Heart {...props} fill={isRed ? 'currentColor' : 'none'} />;
      case 'd': return <Diamond {...props} fill={isRed ? 'currentColor' : 'none'} />;
      case 'c': return <Club {...props} fill={isRed ? 'currentColor' : 'none'} />;
      case 's': return <Spade {...props} fill={isRed ? 'currentColor' : 'none'} />;
    }
  };

  const rankDisplay = RANK_NAMES[card.rank] || card.rank.toString();

  const handleDragStart = (e: React.DragEvent) => {
    if (!draggable) return;
    e.dataTransfer.setData('cardId', card.id);
    e.dataTransfer.effectAllowed = 'move';
    if (onDragStart) onDragStart(e);
  };

  return (
    <div 
      onClick={onClick}
      draggable={draggable}
      onDragStart={handleDragStart}
      className={`
        relative bg-white rounded-lg shadow-md border-2 select-none transition-all duration-300 ease-out overflow-visible
        ${selected ? 'border-[#d4af37] -translate-y-4 shadow-2xl ring-2 ring-[#d4af37] z-30' : 'border-slate-300 hover:border-slate-400'}
        ${small ? 'w-10 h-14' : 'w-16 h-24 sm:w-20 sm:h-28'}
        flex flex-col items-center justify-between p-1 cursor-pointer
        ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}
        ${className}
      `}
    >
      <div className={`w-full text-left font-black leading-none pl-1 ${small ? 'text-[10px]' : 'text-lg'} ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
        {rankDisplay}
      </div>
      <div className="flex-1 flex items-center justify-center pointer-events-none">
        <SuitIcon />
      </div>
      <div className={`w-full text-right font-black leading-none pr-1 ${small ? 'text-[10px]' : 'text-lg'} ${isRed ? 'text-red-600' : 'text-slate-900'} rotate-180`}>
        {rankDisplay}
      </div>
      
      {/* Gloss Effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none rounded-lg opacity-30"></div>
    </div>
  );
};

export default Card;