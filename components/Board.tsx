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
  evaluation?: HandEvaluation;
  isWinner?: boolean;
}> = ({ cards, rowName, onClick, onDrop, highlight, evaluation, isWinner }) => {
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    if (cards[idx]) return; // Cannot drop on occupied slot
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
  
  return (
    <div className={`flex gap-2 sm:gap-4 justify-center items-center my-2 p-2 rounded-xl transition-colors duration-300 ${isWinner ? 'bg-yellow-500/20' : ''}`}>
      {/* Row Label / Hand Strength */}
      <div className="w-24 text-right pr-4 hidden sm:block">
        <div className="uppercase text-xs font-bold text-stone-400 tracking-wider">{rowName}</div>
        {evaluation && (
          <div className="text-xs text-yellow-300 font-semibold truncate">{evaluation.name}</div>
        )}
      </div>

      <div className="flex gap-2">
        {cards.map((card, idx) => (
          <div 
            key={`${rowName}-${idx}`} 
            onClick={() => !card && onClick(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, idx)}
            className={`
              relative rounded-lg border-2 border-dashed transition-all duration-200
              ${!card ? (highlight ? 'border-yellow-500/50 bg-yellow-500/10 cursor-pointer hover:bg-yellow-500/20' : 'border-stone-600 bg-stone-800/50') : 'border-transparent'}
              ${dragOverIdx === idx ? 'scale-110 border-yellow-400 bg-yellow-400/30 ring-4 ring-yellow-400/20 z-20' : ''}
              w-16 h-24 sm:w-20 sm:h-28 flex items-center justify-center
            `}
          >
            {card ? (
              <Card card={card} />
            ) : (
              <div className={`text-stone-700 text-2xl font-bold transition-opacity ${dragOverIdx === idx ? 'opacity-100 text-yellow-500' : 'opacity-20'}`}>+</div>
            )}
          </div>
        ))}
      </div>
       {/* Mobile Hand Strength */}
       {evaluation && (
          <div className="sm:hidden absolute left-2 text-[10px] text-yellow-300 bg-black/50 px-1 rounded">{evaluation.name}</div>
        )}
    </div>
  );
};

const Board: React.FC<BoardProps> = ({ board, isHuman, onSlotClick, onSlotDrop, highlightEmpty, evaluations, fouled, isWinner }) => {
  return (
    <div className={`relative flex flex-col items-center p-4 rounded-3xl ${fouled ? 'bg-red-900/20 ring-4 ring-red-600' : 'bg-stone-800/40 shadow-2xl'}`}>
      
      {fouled && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 rounded-3xl backdrop-blur-sm pointer-events-none">
          <h2 className="text-6xl font-black text-red-500 tracking-widest border-4 border-red-500 p-4 rotate-12">FOULED</h2>
        </div>
      )}

      <Row 
        rowName="front" 
        cards={board.front} 
        onClick={(idx) => onSlotClick && onSlotClick('front', idx)} 
        onDrop={(cardId, idx) => onSlotDrop && onSlotDrop(cardId, 'front', idx)}
        highlight={!!highlightEmpty}
        evaluation={evaluations?.front}
        isWinner={isWinner?.front}
      />
      <Row 
        rowName="mid" 
        cards={board.mid} 
        onClick={(idx) => onSlotClick && onSlotClick('mid', idx)} 
        onDrop={(cardId, idx) => onSlotDrop && onSlotDrop(cardId, 'mid', idx)}
        highlight={!!highlightEmpty}
        evaluation={evaluations?.mid}
        isWinner={isWinner?.mid}
      />
      <Row 
        rowName="back" 
        cards={board.back} 
        onClick={(idx) => onSlotClick && onSlotClick('back', idx)} 
        onDrop={(cardId, idx) => onSlotDrop && onSlotDrop(cardId, 'back', idx)}
        highlight={!!highlightEmpty}
        evaluation={evaluations?.back}
        isWinner={isWinner?.back}
      />
    </div>
  );
};

export default Board;