import React from 'react';
import { Card as CardType, PlayerBoard, HandEvaluation } from '../types';
import Card from './Card';

interface BoardProps {
  board: PlayerBoard;
  isHuman: boolean;
  onSlotClick?: (row: 'front' | 'mid' | 'back', index: number) => void;
  highlightEmpty?: boolean;
  evaluations?: { front: HandEvaluation, mid: HandEvaluation, back: HandEvaluation };
  fouled?: boolean;
  isWinner?: { front: boolean, mid: boolean, back: boolean };
}

const Row: React.FC<{
  cards: (CardType | null)[];
  rowName: 'front' | 'mid' | 'back';
  onClick: (idx: number) => void;
  highlight: boolean;
  evaluation?: HandEvaluation;
  isWinner?: boolean;
}> = ({ cards, rowName, onClick, highlight, evaluation, isWinner }) => {
  
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
            className={`
              relative rounded-lg border-2 border-dashed 
              ${!card ? (highlight ? 'border-yellow-500/50 bg-yellow-500/10 cursor-pointer hover:bg-yellow-500/20' : 'border-stone-600 bg-stone-800/50') : 'border-transparent'}
              w-16 h-24 sm:w-20 sm:h-28 flex items-center justify-center transition-all
            `}
          >
            {card ? (
              <Card card={card} />
            ) : (
              <div className="text-stone-700 text-2xl font-bold opacity-20">+</div>
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

const Board: React.FC<BoardProps> = ({ board, isHuman, onSlotClick, highlightEmpty, evaluations, fouled, isWinner }) => {
  return (
    <div className={`relative flex flex-col items-center p-4 rounded-3xl ${fouled ? 'bg-red-900/20 ring-4 ring-red-600' : 'bg-stone-800/40 shadow-2xl'}`}>
      
      {fouled && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 rounded-3xl backdrop-blur-sm pointer-events-none">
          <h2 className="text-6xl font-black text-red-500 tracking-widest border-4 border-red-500 p-4 rotate-12">FOULED</h2>
        </div>
      )}

      {/* Rows are rendered Back to Front for visual layering logic if negative margin used, but here standard block is fine.
          Actually, standard OFC view is Front Top, Back Bottom. */}
      
      <Row 
        rowName="front" 
        cards={board.front} 
        onClick={(idx) => onSlotClick && onSlotClick('front', idx)} 
        highlight={!!highlightEmpty}
        evaluation={evaluations?.front}
        isWinner={isWinner?.front}
      />
      <Row 
        rowName="mid" 
        cards={board.mid} 
        onClick={(idx) => onSlotClick && onSlotClick('mid', idx)} 
        highlight={!!highlightEmpty}
        evaluation={evaluations?.mid}
        isWinner={isWinner?.mid}
      />
      <Row 
        rowName="back" 
        cards={board.back} 
        onClick={(idx) => onSlotClick && onSlotClick('back', idx)} 
        highlight={!!highlightEmpty}
        evaluation={evaluations?.back}
        isWinner={isWinner?.back}
      />
    </div>
  );
};

export default Board;
