import React, { useState } from 'react';
import { Card as CardType, PlayerBoard, HandEvaluation } from '../types';
import Card from './Card';

interface BoardProps {
  board: PlayerBoard;
  isHuman: boolean;
  onSlotClick?: (row: 'front' | 'mid' | 'back', index: number) => void;
  onSlotDrop?: (cardId: string, row: 'front' | 'mid' | 'back', index: number) => void;
  highlightEmpty?: boolean;
  evaluations?: { front: HandEvaluation, mid: HandEvaluation, back: HandEvaluation };
  fouled?: boolean;
  isWinner?: { front: boolean, mid: boolean, back: boolean };
}

const Row: React.FC<{
  cards: (CardType | null)[];
  rowName: 'front' | 'mid' | 'back';
  onClick: (idx: number) => void;
  onDrop: (cardId: string, idx: number) => void;
  highlight: boolean;
  isWinner?: boolean;
  evaluation?: HandEvaluation;
}> = ({ cards, rowName, onClick, onDrop, highlight, isWinner, evaluation }) => {
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    if (cards[idx]) return; 
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDragLeave = () => {
    setDragOverIdx(null);
  };

  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(null);
    const cardId = e.dataTransfer.getData('cardId');
    if (cardId) {
      onDrop(cardId, idx);
    }
  };

  const hasCards = cards.some(c => c !== null);
  
  return (
    <div className={`
      flex gap-2 sm:gap-4 justify-center items-center my-2 p-2 rounded-xl transition-all duration-300 relative
      ${isWinner ? 'bg-[#d4af37]/5 ring-1 ring-[#d4af37]/30 shadow-[0_0_20px_rgba(212,175,55,0.1)]' : ''}
    `}>
      <div className="w-20 text-right pr-2 hidden sm:flex flex-col items-end justify-center">
        <div className={`uppercase text-[9px] font-black tracking-[0.2em] ${isWinner ? 'text-[#d4af37]' : 'text-stone-500'}`}>{rowName}</div>
        {hasCards && evaluation && evaluation.name !== 'Empty' && (
          <div className="text-[8px] font-bold text-[#d4af37]/80 uppercase tracking-tighter mt-0.5 leading-tight animate-in fade-in slide-in-from-right-1">
            {evaluation.name}
          </div>
        )}
      </div>

      <div className="flex gap-2 relative">
        {cards.map((card, idx) => (
          <div 
            key={`${rowName}-${idx}`} 
            onClick={() => !card && onClick(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, idx)}
            className={`
              relative rounded-lg border-2 border-dashed transition-all duration-200
              ${!card ? (highlight ? 'border-[#d4af37]/40 bg-[#d4af37]/5 cursor-pointer hover:bg-[#d4af37]/10' : 'border-stone-800 bg-black/20') : 'border-transparent'}
              ${dragOverIdx === idx ? 'scale-105 border-[#d4af37] bg-[#d4af37]/20 shadow-[0_0_15px_rgba(212,175,55,0.2)]' : ''}
              w-16 h-24 sm:w-20 sm:h-28 flex items-center justify-center
            `}
          >
            {card ? (
              <Card card={card} className={isWinner ? 'ring-2 ring-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.4)]' : ''} />
            ) : (
              <div className={`text-[#d4af37] text-2xl font-bold transition-opacity ${dragOverIdx === idx ? 'opacity-100' : 'opacity-10'}`}>+</div>
            )}
          </div>
        ))}
      </div>

      {isWinner && (
         <div className="absolute -right-3 sm:-right-6 bg-gradient-to-b from-[#e7c25d] to-[#d4af37] text-stone-900 rounded-full p-1 shadow-lg border border-black/20 transform scale-75 sm:scale-100">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
         </div>
      )}
    </div>
  );
};

const Board: React.FC<BoardProps> = ({ board, isHuman, onSlotClick, onSlotDrop, highlightEmpty, evaluations, fouled, isWinner }) => {
  return (
    <div className={`
      relative flex flex-col items-center p-4 rounded-[2.5rem] transition-all duration-500
      ${fouled ? 'bg-rose-900/10 ring-4 ring-rose-600/50' : 'bg-black/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 backdrop-blur-xl'}
    `}>
      
      {fouled && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 rounded-[2.5rem] backdrop-blur-[4px] pointer-events-none">
          <div className="flex flex-col items-center animate-in zoom-in duration-300">
            <h2 className="text-4xl sm:text-6xl font-black text-rose-500 tracking-[0.2em] border-8 border-rose-500 px-8 py-4 -rotate-12 shadow-[0_0_50px_rgba(239,68,68,0.4)]">
              FOULED
            </h2>
          </div>
        </div>
      )}

      <Row 
        rowName="front" 
        cards={board.front} 
        onClick={(idx) => onSlotClick && onSlotClick('front', idx)} 
        onDrop={(cardId, idx) => onSlotDrop && onSlotDrop(cardId, 'front', idx)}
        highlight={!!highlightEmpty}
        isWinner={isWinner?.front}
        evaluation={evaluations?.front}
      />
      <div className="w-[80%] h-px bg-white/5 mx-auto"></div>
      <Row 
        rowName="mid" 
        cards={board.mid} 
        onClick={(idx) => onSlotClick && onSlotClick('mid', idx)} 
        onDrop={(cardId, idx) => onSlotDrop && onSlotDrop(cardId, 'mid', idx)}
        highlight={!!highlightEmpty}
        isWinner={isWinner?.mid}
        evaluation={evaluations?.mid}
      />
      <div className="w-[80%] h-px bg-white/5 mx-auto"></div>
      <Row 
        rowName="back" 
        cards={board.back} 
        onClick={(idx) => onSlotClick && onSlotClick('back', idx)} 
        onDrop={(cardId, idx) => onSlotDrop && onSlotDrop(cardId, 'back', idx)}
        highlight={!!highlightEmpty}
        isWinner={isWinner?.back}
        evaluation={evaluations?.back}
      />
    </div>
  );
};

export default Board;