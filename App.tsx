import React, { useState, useEffect, useCallback } from 'react';
import { Card as CardType, PlayerState, Phase, PlayerBoard, HandEvaluation } from './types';
import { createDeck, shuffleDeck, isBoardFull, checkFoul, evaluateHand, compareHands } from './utils/pokerLogic';
import { performAIMove } from './utils/aiLogic';
import Board from './components/Board';
import Card from './components/Card';
import { ROW_SIZE } from './constants';
import { Trophy, RefreshCw, Play } from 'lucide-react';

const INITIAL_BOARD: PlayerBoard = {
  front: Array(ROW_SIZE.front).fill(null),
  mid: Array(ROW_SIZE.mid).fill(null),
  back: Array(ROW_SIZE.back).fill(null),
};

const INITIAL_PLAYER_STATE: PlayerState = {
  hand: [],
  board: JSON.parse(JSON.stringify(INITIAL_BOARD)), // Deep copy
  fouled: false,
  scores: { front: 0, mid: 0, back: 0, scoop: 0, total: 0 }
};

const App: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('START');
  const [deck, setDeck] = useState<CardType[]>([]);
  
  const [human, setHuman] = useState<PlayerState>(INITIAL_PLAYER_STATE);
  const [ai, setAi] = useState<PlayerState>(INITIAL_PLAYER_STATE);
  
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [aiEvaluations, setAiEvaluations] = useState<{front:HandEvaluation, mid:HandEvaluation, back:HandEvaluation} | undefined>(undefined);
  const [humanEvaluations, setHumanEvaluations] = useState<{front:HandEvaluation, mid:HandEvaluation, back:HandEvaluation} | undefined>(undefined);
  const [winnerFlags, setWinnerFlags] = useState<{front: boolean, mid: boolean, back: boolean} | undefined>(undefined);
  
  // Track Series Stats
  const [stats, setStats] = useState({ humanWins: 0, aiWins: 0 });

  // --- Actions ---

  const startGame = () => {
    const newDeck = shuffleDeck(createDeck());
    
    // Reset States
    setHuman(INITIAL_PLAYER_STATE);
    setAi(INITIAL_PLAYER_STATE);
    setAiEvaluations(undefined);
    setHumanEvaluations(undefined);
    setWinnerFlags(undefined);
    
    // Initial Deal: 5 cards each
    const humanCards = newDeck.slice(0, 5);
    const aiCards = newDeck.slice(5, 10);
    const remainingDeck = newDeck.slice(10);
    
    setDeck(remainingDeck);
    
    // Set Human Hand
    setHuman(prev => ({ ...prev, hand: humanCards }));
    
    // AI places immediately
    const aiBoardWithCards = performAIMove({ 
        board: JSON.parse(JSON.stringify(INITIAL_BOARD)), 
        hand: aiCards 
    });
    setAi(prev => ({ ...prev, board: aiBoardWithCards }));

    setPhase('PLACEMENT');
  };

  const placeCard = (cardId: string, row: 'front' | 'mid' | 'back', index: number) => {
    if (phase !== 'PLACEMENT' && phase !== 'DRAWING') return;
    if (human.board[row][index] !== null) return; // Slot occupied

    const cardToPlace = human.hand.find(c => c.id === cardId);
    if (!cardToPlace) return;

    // Update Board
    const newBoard = { ...human.board };
    const newRow = [...newBoard[row]];
    newRow[index] = cardToPlace;
    newBoard[row] = newRow;

    // Remove from Hand
    const newHand = human.hand.filter(c => c.id !== cardId);

    setHuman(prev => ({ ...prev, board: newBoard, hand: newHand }));
    setSelectedCardId(null);
  };

  const handleSlotClick = (row: 'front' | 'mid' | 'back', index: number) => {
    if (selectedCardId) {
      placeCard(selectedCardId, row, index);
    }
  };

  const handleSlotDrop = (cardId: string, row: 'front' | 'mid' | 'back', index: number) => {
    placeCard(cardId, row, index);
  };

  // Check Phase Transitions
  useEffect(() => {
    if (phase === 'PLACEMENT') {
      if (human.hand.length === 0) {
        setPhase('DRAWING');
        // Trigger first draw immediately
        setTimeout(() => drawRound(), 500);
      }
    } else if (phase === 'DRAWING') {
      if (human.hand.length === 0 && !isBoardFull(human.board)) {
        // Wait for player to place, then trigger next draw
      } else if (human.hand.length === 0 && isBoardFull(human.board)) {
         setPhase('SCORING');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [human.hand, human.board, phase]);

  const drawRound = () => {
    if (deck.length < 2) {
        setPhase('SCORING');
        return;
    }
    if (isBoardFull(human.board)) {
        setPhase('SCORING');
        return;
    }

    const nextCardHuman = deck[0];
    const nextCardAi = deck[1];
    const remainingDeck = deck.slice(2);

    setDeck(remainingDeck);

    // Human gets card into hand
    setHuman(prev => ({ ...prev, hand: [nextCardHuman] }));

    // AI Places card immediately
    setAi(prev => {
        const newBoard = performAIMove({ board: prev.board, hand: [nextCardAi] });
        return { ...prev, board: newBoard };
    });
  };

  // Effect to trigger next draw after placement in DRAWING phase
  useEffect(() => {
      if (phase === 'DRAWING' && human.hand.length === 0 && !isBoardFull(human.board)) {
          // Player placed their card. Time for next round.
          setTimeout(() => drawRound(), 600);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [human.hand, phase]);

  // Scoring Logic
  useEffect(() => {
      if (phase === 'SCORING') {
          calculateScores();
          setPhase('GAME_OVER');
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const calculateScores = () => {
      // 1. Evaluate Hands
      const getReal = (cards: (CardType|null)[]) => cards.filter((c): c is CardType => c !== null);
      
      const hFront = evaluateHand(getReal(human.board.front), true);
      const hMid = evaluateHand(getReal(human.board.mid), false);
      const hBack = evaluateHand(getReal(human.board.back), false);
      setHumanEvaluations({ front: hFront, mid: hMid, back: hBack });

      const aiFront = evaluateHand(getReal(ai.board.front), true);
      const aiMid = evaluateHand(getReal(ai.board.mid), false);
      const aiBack = evaluateHand(getReal(ai.board.back), false);
      setAiEvaluations({ front: aiFront, mid: aiMid, back: aiBack });

      // 2. Check Fouls
      const humanFouled = checkFoul(human.board);
      const aiFouled = checkFoul(ai.board);
      
      setHuman(prev => ({ ...prev, fouled: humanFouled }));
      setAi(prev => ({ ...prev, fouled: aiFouled }));

      // 3. Compare Rows
      let hScore = 0;
      let aiScore = 0;
      let scores = { front: 0, mid: 0, back: 0, scoop: 0 };
      const winners = { front: false, mid: false, back: false };

      if (humanFouled && !aiFouled) {
          aiScore = 6; // Auto win
      } else if (aiFouled && !humanFouled) {
          hScore = 6;
      } else if (humanFouled && aiFouled) {
          hScore = 0;
          aiScore = 0;
      } else {
          const frontDiff = compareHands(hFront, aiFront);
          if (frontDiff > 0) { scores.front = 1; winners.front = true; }
          else if (frontDiff < 0) { scores.front = -1; }

          const midDiff = compareHands(hMid, aiMid);
          if (midDiff > 0) { scores.mid = 1; winners.mid = true; }
          else if (midDiff < 0) { scores.mid = -1; }

          const backDiff = compareHands(hBack, aiBack);
          if (backDiff > 0) { scores.back = 1; winners.back = true; }
          else if (backDiff < 0) { scores.back = -1; }

          if (scores.front > 0 && scores.mid > 0 && scores.back > 0) {
              scores.scoop = 3;
          } else if (scores.front < 0 && scores.mid < 0 && scores.back < 0) {
              scores.scoop = -3;
          }

          const rawTotal = scores.front + scores.mid + scores.back + scores.scoop;
          if (rawTotal > 0) hScore = rawTotal;
          else aiScore = Math.abs(rawTotal);
      }

      setHuman(prev => ({ ...prev, scores: { ...prev.scores, total: hScore } }));
      setAi(prev => ({ ...prev, scores: { ...prev.scores, total: aiScore } }));
      setWinnerFlags(winners);

      if (hScore > aiScore) {
          setStats(s => ({ ...s, humanWins: s.humanWins + 1 }));
      } else if (aiScore > hScore) {
          setStats(s => ({ ...s, aiWins: s.aiWins + 1 }));
      }
  };

  return (
    <div className="min-h-screen bg-[#1a3c28] flex flex-col items-center justify-between py-4 font-sans relative">
      
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      {/* Header Info */}
      <header className="w-full max-w-5xl px-4 flex justify-between items-center z-10 text-stone-300 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="font-bold tracking-widest text-sm">OFC POKER AI</span>
        </div>

        {/* Stats Display */}
        <div className="flex gap-4 text-xs font-bold bg-black/30 px-4 py-1.5 rounded-full border border-white/10 shadow-inner">
             <span className="text-green-400">YOU: {stats.humanWins}</span>
             <span className="text-stone-600">|</span>
             <span className="text-red-400">CPU: {stats.aiWins}</span>
        </div>

        <div className="text-xs uppercase tracking-wider font-semibold opacity-60">
            {phase === 'PLACEMENT' ? 'Initial Placement' : phase === 'DRAWING' ? 'Drawing Phase' : phase === 'GAME_OVER' ? 'Game Over' : ''}
        </div>
      </header>

      {/* Game Area */}
      <div className="flex-1 w-full max-w-4xl flex flex-col gap-4 relative z-0">
        
        {/* Computer Board */}
        <div className="relative">
             <div className="absolute -top-3 left-4 text-xs font-bold text-stone-500 uppercase tracking-widest bg-[#1a3c28] px-2 z-10">
                Computer Opponent
             </div>
             <Board 
                board={ai.board} 
                isHuman={false} 
                evaluations={aiEvaluations} 
                fouled={ai.fouled}
             />
             {phase === 'GAME_OVER' && (
                 <div className="absolute top-4 right-4 text-3xl font-bold text-white drop-shadow-md">
                    SCORE: {ai.scores.total}
                 </div>
             )}
        </div>

        {/* Divider / Game State / Controls */}
        <div className="flex items-center justify-center min-h-[140px]">
           {phase === 'START' && (
               <button 
                  onClick={startGame}
                  className="group relative px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-stone-900 font-black text-xl rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
               >
                  <Play size={24} className="fill-stone-900" />
                  DEAL HAND
               </button>
           )}

           {(phase === 'PLACEMENT' || phase === 'DRAWING') && (
               <div className="flex flex-col items-center gap-2">
                    <div className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-1 opacity-50">
                        Drag cards to place them
                    </div>
                    <div className="flex gap-4 items-center animate-in fade-in zoom-in duration-300">
                        {human.hand.map((card) => (
                            <Card 
                                key={card.id} 
                                card={card} 
                                draggable={true}
                                onDragStart={() => setIsDragging(true)}
                                onClick={() => setSelectedCardId(selectedCardId === card.id ? null : card.id)}
                                selected={selectedCardId === card.id}
                                className="hover:-translate-y-4 shadow-2xl"
                            />
                        ))}
                        {human.hand.length === 0 && (
                            <div className="text-stone-500 italic text-sm">Waiting for CPU...</div>
                        )}
                    </div>
               </div>
           )}

           {phase === 'GAME_OVER' && (
               <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-4">
                   <div className="bg-stone-900/80 p-6 rounded-2xl border border-stone-700 backdrop-blur-md flex items-center gap-8 shadow-2xl">
                       <div className="text-center">
                           <div className="text-stone-400 text-xs font-bold uppercase">Your Score</div>
                           <div className={`text-4xl font-black ${human.scores.total > ai.scores.total ? 'text-green-400' : 'text-stone-200'}`}>
                               {human.scores.total}
                           </div>
                       </div>
                       <div className="h-10 w-px bg-stone-700"></div>
                       <div className="text-center">
                           <div className="text-stone-400 text-xs font-bold uppercase">AI Score</div>
                           <div className={`text-4xl font-black ${ai.scores.total > human.scores.total ? 'text-red-400' : 'text-stone-200'}`}>
                               {ai.scores.total}
                           </div>
                       </div>
                   </div>
                   
                   <div className="flex gap-2">
                        {human.scores.total > ai.scores.total ? (
                            <div className="flex items-center gap-2 text-yellow-400 font-bold text-xl px-4 py-2 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                                <Trophy size={20} /> YOU WIN!
                            </div>
                        ) : human.scores.total < ai.scores.total ? (
                             <div className="flex items-center gap-2 text-red-400 font-bold text-xl px-4 py-2 bg-red-400/10 rounded-lg border border-red-400/20">
                                YOU LOST
                            </div>
                        ) : (
                            <div className="text-stone-400 font-bold text-xl">DRAW</div>
                        )}
                   </div>

                   <button 
                      onClick={startGame}
                      className="flex items-center gap-2 px-6 py-2 bg-stone-100 hover:bg-white text-stone-900 font-bold rounded-full transition-colors mt-2"
                   >
                       <RefreshCw size={18} /> Play Again
                   </button>
               </div>
           )}
        </div>

        {/* Human Board */}
        <div className="relative">
             <div className="absolute -top-3 left-4 text-xs font-bold text-stone-400 uppercase tracking-widest bg-[#1a3c28] px-2 z-10">
                Your Board
             </div>
             <Board 
                board={human.board} 
                isHuman={true} 
                onSlotClick={handleSlotClick}
                onSlotDrop={handleSlotDrop}
                highlightEmpty={!!selectedCardId || isDragging}
                evaluations={humanEvaluations}
                fouled={human.fouled}
                isWinner={winnerFlags}
             />
        </div>

      </div>
      
      {/* Footer / Instructions */}
      <footer className="w-full max-w-4xl px-4 mt-4 flex justify-between text-xs text-stone-500 font-medium">
          <div>OFC POKER v1.0</div>
          <div>RULES: BACK &gt; MID &gt; FRONT (Strongest to Weakest)</div>
      </footer>
    </div>
  );
};

export default App;