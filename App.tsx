import React, { useState, useEffect, useMemo } from 'react';
import { Card as CardType, PlayerState, Phase, PlayerBoard, HandEvaluation } from './types';
import { createDeck, shuffleDeck, isBoardFull, checkFoul, evaluateHand, compareHands } from './utils/pokerLogic';
import { performAIMove } from './utils/aiLogic';
import Board from './components/Board';
import Card from './components/Card';
import { ROW_SIZE } from './constants';
import { Trophy, RefreshCw, Play, Settings2, Coins, DollarSign, Timer, BrainCircuit, Swords } from 'lucide-react';

const INITIAL_BOARD: PlayerBoard = {
  front: Array(ROW_SIZE.front).fill(null),
  mid: Array(ROW_SIZE.mid).fill(null),
  back: Array(ROW_SIZE.back).fill(null),
};

const INITIAL_PLAYER_STATE: PlayerState = {
  hand: [],
  board: JSON.parse(JSON.stringify(INITIAL_BOARD)),
  fouled: false,
  scores: { front: 0, mid: 0, back: 0, scoop: 0, total: 0 }
};

const CHIP_VALUES = [5, 25, 100, 500];
const TOTAL_ROUNDS = 10;
const INITIAL_CAPITAL = 1000;

const App: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('START');
  const [deck, setDeck] = useState<CardType[]>([]);
  
  const [human, setHuman] = useState<PlayerState>(INITIAL_PLAYER_STATE);
  const [ai, setAi] = useState<PlayerState>(INITIAL_PLAYER_STATE);
  
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [aiEvaluations, setAiEvaluations] = useState<{front:HandEvaluation, mid:HandEvaluation, back:HandEvaluation} | undefined>(undefined);
  const [humanEvaluationsState, setHumanEvaluationsState] = useState<{front:HandEvaluation, mid:HandEvaluation, back:HandEvaluation} | undefined>(undefined);
  const [winnerFlags, setWinnerFlags] = useState<{front: boolean, mid: boolean, back: boolean} | undefined>(undefined);
  
  // Real-time human evaluations
  const currentHumanEvaluations = useMemo(() => {
    const getReal = (cards: (CardType|null)[]) => cards.filter((c): c is CardType => c !== null);
    return {
      front: evaluateHand(getReal(human.board.front), true),
      mid: evaluateHand(getReal(human.board.mid), false),
      back: evaluateHand(getReal(human.board.back), false)
    };
  }, [human.board]);

  // Banking & Tournament State
  const [roundCount, setRoundCount] = useState(1);
  const [humanBalance, setHumanBalance] = useState(INITIAL_CAPITAL);
  const [aiBalance, setAiBalance] = useState(INITIAL_CAPITAL);
  const [aiRemainingToBet, setAiRemainingToBet] = useState(INITIAL_CAPITAL);
  
  const [humanBet, setHumanBet] = useState(0);
  const [aiBet, setAiBet] = useState(0);
  const [aiStrategy, setAiStrategy] = useState<string>("Calculating...");
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);
  const [stats, setStats] = useState({ humanWins: 0, aiWins: 0 });

  const startBetting = () => {
    if (roundCount > TOTAL_ROUNDS) {
        setRoundCount(1);
        setHumanBalance(INITIAL_CAPITAL);
        setAiBalance(INITIAL_CAPITAL);
        setAiRemainingToBet(INITIAL_CAPITAL);
        setStats({ humanWins: 0, aiWins: 0 });
    }
    setPhase('BETTING');
    setHumanBet(0);
    setAiBet(0);
    setLastWinAmount(null);
    updateAiStrategy();
  };

  const updateAiStrategy = () => {
    if (roundCount <= 3) setAiStrategy("Playing Tight-Aggressive");
    else if (roundCount === TOTAL_ROUNDS) setAiStrategy("Going All-In (Final Round)");
    else if (aiBalance > humanBalance) setAiStrategy("Pressing the Advantage");
    else if (aiBalance < humanBalance) setAiStrategy("Playing Defensively");
    else setAiStrategy("Evaluating Table Dynamics");
  };

  const addBet = (amount: number) => {
    if (humanBalance >= amount) {
      setHumanBalance(prev => prev - amount);
      setHumanBet(prev => prev + amount);
    }
  };

  const clearBet = () => {
    setHumanBalance(prev => prev + humanBet);
    setHumanBet(0);
  };

  const startGame = () => {
    if (humanBet <= 0) return;
    
    // STRATEGIC AI BETTING LOGIC
    let currentAiBet = 0;
    const remainingRounds = TOTAL_ROUNDS - roundCount + 1;
    const averageNeeded = aiRemainingToBet / remainingRounds;

    if (roundCount === TOTAL_ROUNDS) {
        currentAiBet = aiRemainingToBet;
    } else {
        let multiplier = 1.0;
        if (roundCount <= 3) multiplier = 0.8 + Math.random() * 0.4;
        else if (aiBalance > humanBalance) multiplier = 1.2 + Math.random() * 0.5;
        else if (aiBalance < humanBalance) multiplier = 0.6 + Math.random() * 0.3;

        currentAiBet = Math.floor(averageNeeded * multiplier);
        const minBuffer = (remainingRounds - 1) * 5; 
        currentAiBet = Math.min(currentAiBet, aiRemainingToBet - minBuffer);
        currentAiBet = Math.max(5, currentAiBet);
        currentAiBet = Math.round(currentAiBet / 5) * 5;
    }

    setAiBet(currentAiBet);
    setAiBalance(prev => prev - currentAiBet);
    setAiRemainingToBet(prev => prev - currentAiBet);
    
    const newDeck = shuffleDeck(createDeck());
    setHuman(INITIAL_PLAYER_STATE);
    setAi(INITIAL_PLAYER_STATE);
    setAiEvaluations(undefined);
    setHumanEvaluationsState(undefined);
    setWinnerFlags(undefined);
    
    const humanCards = newDeck.slice(0, 5);
    const aiCards = newDeck.slice(5, 10);
    const remainingDeck = newDeck.slice(10);
    
    setDeck(remainingDeck);
    setHuman(prev => ({ ...prev, hand: humanCards }));
    
    const aiBoardWithCards = performAIMove({ 
        board: JSON.parse(JSON.stringify(INITIAL_BOARD)), 
        hand: aiCards 
    });
    setAi(prev => ({ ...prev, board: aiBoardWithCards }));

    setPhase('PLACEMENT');
  };

  const placeCard = (cardId: string, row: 'front' | 'mid' | 'back', index: number) => {
    if (phase !== 'PLACEMENT' && phase !== 'DRAWING') return;
    if (human.board[row][index] !== null) return;
    const cardToPlace = human.hand.find(c => c.id === cardId);
    if (!cardToPlace) return;
    const newBoard = { ...human.board };
    const newRow = [...newBoard[row]];
    newRow[index] = cardToPlace;
    newBoard[row] = newRow;
    const newHand = human.hand.filter(c => c.id !== cardId);
    setHuman(prev => ({ ...prev, board: newBoard, hand: newHand }));
    setSelectedCardId(null);
  };

  const handleSlotClick = (row: 'front' | 'mid' | 'back', index: number) => {
    if (selectedCardId) placeCard(selectedCardId, row, index);
  };

  const handleSlotDrop = (cardId: string, row: 'front' | 'mid' | 'back', index: number) => {
    placeCard(cardId, row, index);
  };

  useEffect(() => {
    if (phase === 'PLACEMENT') {
      if (human.hand.length === 0) {
        setPhase('DRAWING');
        setTimeout(() => drawRound(), 500);
      }
    } else if (phase === 'DRAWING') {
      if (human.hand.length === 0 && isBoardFull(human.board)) setPhase('SCORING');
    }
  }, [human.hand, human.board, phase]);

  const drawRound = () => {
    if (deck.length < 2 || isBoardFull(human.board)) {
        setPhase('SCORING');
        return;
    }
    const nextCardHuman = deck[0];
    const nextCardAi = deck[1];
    const remainingDeck = deck.slice(2);
    setDeck(remainingDeck);
    setHuman(prev => ({ ...prev, hand: [nextCardHuman] }));
    setAi(prev => {
        const newBoard = performAIMove({ board: prev.board, hand: [nextCardAi] });
        return { ...prev, board: newBoard };
    });
  };

  useEffect(() => {
      if (phase === 'DRAWING' && human.hand.length === 0 && !isBoardFull(human.board)) {
          setTimeout(() => drawRound(), 600);
      }
  }, [human.hand, phase]);

  useEffect(() => {
      if (phase === 'SCORING') {
          calculateScores();
          setPhase('GAME_OVER');
      }
  }, [phase]);

  const calculateScores = () => {
      const getReal = (cards: (CardType|null)[]) => cards.filter((c): c is CardType => c !== null);
      const hFront = evaluateHand(getReal(human.board.front), true);
      const hMid = evaluateHand(getReal(human.board.mid), false);
      const hBack = evaluateHand(getReal(human.board.back), false);
      setHumanEvaluationsState({ front: hFront, mid: hMid, back: hBack });
      
      const aiFront = evaluateHand(getReal(ai.board.front), true);
      const aiMid = evaluateHand(getReal(ai.board.mid), false);
      const aiBack = evaluateHand(getReal(ai.board.back), false);
      setAiEvaluations({ front: aiFront, mid: aiMid, back: aiBack });

      const humanFouled = checkFoul(human.board);
      const aiFouled = checkFoul(ai.board);
      setHuman(prev => ({ ...prev, fouled: humanFouled }));
      setAi(prev => ({ ...prev, fouled: aiFouled }));

      let hPoints = 0;
      let aiPoints = 0;
      const winners = { front: false, mid: false, back: false };

      if (humanFouled && !aiFouled) {
          aiPoints = 6;
      } else if (aiFouled && !humanFouled) {
          hPoints = 6;
      } else if (humanFouled && aiFouled) {
          hPoints = 0;
          aiPoints = 0;
      } else {
          const frontDiff = compareHands(hFront, aiFront);
          if (frontDiff > 0) winners.front = true;
          const midDiff = compareHands(hMid, aiMid);
          if (midDiff > 0) winners.mid = true;
          const backDiff = compareHands(hBack, aiBack);
          if (backDiff > 0) winners.back = true;
          const hNet = (winners.front ? 1 : 0) + (winners.mid ? 1 : 0) + (winners.back ? 1 : 0);
          const aiNet = (!winners.front && frontDiff !== 0 ? 1 : 0) + (!winners.mid && midDiff !== 0 ? 1 : 0) + (!winners.back && backDiff !== 0 ? 1 : 0);
          hPoints = hNet;
          aiPoints = aiNet;
          if (hNet === 3) hPoints += 3;
          if (aiNet === 3) aiPoints += 3;
      }

      setHuman(prev => ({ ...prev, scores: { ...prev.scores, total: hPoints } }));
      setAi(prev => ({ ...prev, scores: { ...prev.scores, total: aiPoints } }));
      setWinnerFlags(winners);

      const totalPot = humanBet + aiBet;
      let hPayout = 0;
      let aiPayout = 0;

      if (hPoints > aiPoints) {
          hPayout = totalPot;
          setStats(s => ({ ...s, humanWins: s.humanWins + 1 }));
      } else if (aiPoints > hPoints) {
          aiPayout = totalPot;
          setStats(s => ({ ...s, aiWins: s.aiWins + 1 }));
      } else {
          hPayout = humanBet;
          aiPayout = aiBet;
      }

      setHumanBalance(prev => prev + hPayout);
      setAiBalance(prev => prev + aiPayout);
      setLastWinAmount(hPayout - humanBet);
      setRoundCount(prev => prev + 1);
  };

  const getChipColor = (value: number) => {
    if (value === 5) return 'bg-red-600 border-red-800 shadow-red-900/50';
    if (value === 25) return 'bg-green-600 border-green-800 shadow-green-900/50';
    if (value === 100) return 'bg-slate-900 border-slate-700 shadow-black/50';
    if (value === 500) return 'bg-purple-600 border-purple-800 shadow-purple-900/50';
    return 'bg-stone-500';
  };

  return (
    <div className="min-h-screen bg-[#061c12] flex flex-col items-center py-4 font-sans relative overflow-x-hidden selection:bg-yellow-500/30">
      {/* Table Surface: High-end Velvet Felt Radial Gradient */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_#134e32_0%,_#061c12_70%)] opacity-100"></div>
      
      {/* Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" 
           style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/black-felt.png")' }}>
      </div>

      {/* Decorative Mahogany Rails (Top/Bottom) */}
      <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-[#3d1a10] to-[#26100a] shadow-2xl border-b border-[#5a2818]/30 z-10 flex items-center justify-center opacity-90">
         <div className="absolute bottom-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent"></div>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-[#3d1a10] to-[#26100a] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-t border-[#5a2818]/30 z-10 flex items-center justify-center opacity-90">
         <div className="absolute top-0 w-full h-[1px] bg-[#d4af37]/20"></div>
      </div>

      <header className="w-full max-w-5xl px-4 flex flex-wrap justify-between items-center z-20 text-stone-300 mt-16 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#d4af37]/10 px-3 py-1 rounded-lg border border-[#d4af37]/40 flex items-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.1)] backdrop-blur-sm">
             <Timer size={14} className="text-[#d4af37]" />
             <span className="font-black text-xs text-[#d4af37] uppercase tracking-tighter">
                {roundCount <= TOTAL_ROUNDS ? `Round ${roundCount} / 10` : 'Series Ended'}
             </span>
          </div>
          <span className="font-black tracking-[0.2em] text-sm text-[#d4af37] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] hidden sm:inline uppercase">OFC High Roller</span>
        </div>

        <div className="flex items-center gap-4 bg-black/60 px-6 py-2 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-xl">
            <div className="flex gap-6 text-xs font-bold items-center">
                 <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] text-stone-500 uppercase tracking-tighter font-black">PLAYER</span>
                        <span className="bg-emerald-500/10 text-emerald-400 px-1.5 rounded-sm text-[9px] border border-emerald-500/20">{stats.humanWins} W</span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400 font-black">
                        <DollarSign size={12} />
                        <span>{humanBalance.toLocaleString()}</span>
                    </div>
                 </div>

                 <div className="flex flex-col items-center px-2 opacity-60">
                    <Trophy size={16} className={stats.humanWins > stats.aiWins ? 'text-yellow-500' : stats.aiWins > stats.humanWins ? 'text-red-500' : 'text-stone-700'} />
                    <span className="text-[8px] text-stone-500 font-black tracking-tighter">VS</span>
                 </div>

                 <div className="flex flex-col items-start">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="bg-rose-500/10 text-rose-400 px-1.5 rounded-sm text-[9px] border border-rose-500/20">{stats.aiWins} W</span>
                        <span className="text-[10px] text-stone-500 uppercase tracking-tighter font-black">CPU</span>
                    </div>
                    <div className="flex items-center gap-1 text-rose-400 font-black">
                        <DollarSign size={12} />
                        <span>{aiBalance.toLocaleString()}</span>
                    </div>
                 </div>
            </div>
        </div>

        <div className="text-[10px] sm:text-xs uppercase tracking-[0.2em] font-black text-stone-500 bg-black/40 px-3 py-1 rounded-full border border-white/5 backdrop-blur-md">
            {phase.replace('_', ' ')}
        </div>
      </header>

      <div className="w-full max-w-4xl flex flex-col gap-6 relative z-10 px-4">
        
        {/* Opponent Row */}
        <div className="relative group">
             <div className="absolute -top-3 left-6 text-[10px] font-black text-rose-400/60 uppercase tracking-[0.3em] bg-[#0c2a1c] px-3 z-10 border border-rose-400/20 rounded-full">
                The House (AI)
             </div>
             <Board 
                board={ai.board} 
                isHuman={false} 
                evaluations={aiEvaluations} 
                fouled={ai.fouled}
             />
             {phase === 'PLACEMENT' || phase === 'DRAWING' ? (
                <div className="absolute top-2 right-4 flex items-center gap-1.5 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 text-rose-400 text-[10px] font-black shadow-lg backdrop-blur-md">
                    <Coins size={10} />
                    CPU STAKE: ${aiBet}
                </div>
             ) : null}
        </div>

        {/* Dynamic Center Area */}
        <div className="flex items-center justify-center min-h-[200px] py-4">
           
           {phase === 'START' && (
               <div className="text-center flex flex-col items-center gap-6">
                   <div className="bg-black/60 p-10 rounded-[2.5rem] border border-white/5 backdrop-blur-2xl shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] max-w-md animate-in fade-in slide-in-from-top-4 duration-500">
                        <h2 className="text-white text-3xl font-black mb-1 tracking-tighter">
                            {roundCount > TOTAL_ROUNDS ? 'TOURNAMENT OVER' : 'NEXT HAND'}
                        </h2>
                        <div className="w-20 h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mx-auto mb-6 rounded-full"></div>
                        <p className="text-stone-400 mb-8 text-sm leading-relaxed font-medium">
                            {roundCount > TOTAL_ROUNDS 
                                ? `The series has concluded. Final Score: You ${stats.humanWins} vs House ${stats.aiWins}.` 
                                : `Step into Round ${roundCount}. The House is eyeing your stack. Ready to commit your blind?`}
                        </p>
                        <button 
                            onClick={startBetting}
                            className="group relative px-12 py-4 bg-gradient-to-b from-[#e7c25d] to-[#d4af37] hover:from-[#f3d37a] hover:to-[#e7c25d] text-stone-900 font-black text-xl rounded-full shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-3 overflow-hidden mx-auto"
                        >
                            <Coins size={24} className="group-hover:rotate-12 transition-transform" />
                            {roundCount > TOTAL_ROUNDS ? 'RE-BUY' : 'PLACE BETS'}
                        </button>
                   </div>
               </div>
           )}

           {phase === 'BETTING' && (
               <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
                    <div className="flex flex-col items-center bg-black/40 px-10 py-5 rounded-[2rem] border border-white/10 backdrop-blur-xl shadow-2xl">
                        <div className="text-[#d4af37] text-[10px] font-black uppercase tracking-[0.3em] mb-1">Total Wager</div>
                        <div className="text-7xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center gap-1">
                            <span className="text-[#d4af37] opacity-80 text-4xl">$</span>
                            {humanBet}
                        </div>
                    </div>

                    <div className="flex gap-4">
                        {CHIP_VALUES.map(val => (
                            <button
                                key={val}
                                onClick={() => addBet(val)}
                                disabled={humanBalance < val}
                                className={`
                                    ${getChipColor(val)}
                                    w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[6px] border-dashed border-white/20
                                    flex items-center justify-center text-white font-black text-lg sm:text-xl
                                    shadow-2xl transition-all active:scale-90 hover:-translate-y-3
                                    disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed
                                    relative overflow-hidden group ring-4 ring-black/20
                                `}
                            >
                                <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-white/20 opacity-40"></div>
                                <div className="relative z-10">${val}</div>
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col items-center gap-5">
                        <div className="flex items-center gap-3 bg-black/40 px-5 py-2 rounded-full border border-[#d4af37]/20 text-stone-500 text-[10px] font-black tracking-widest uppercase backdrop-blur-md">
                            <BrainCircuit size={14} className="text-rose-500" />
                            House Mood: <span className="text-stone-200">{aiStrategy}</span>
                        </div>
                        
                        <div className="flex gap-4">
                            <button 
                                onClick={clearBet}
                                className="px-6 py-2 bg-stone-900/50 text-stone-500 hover:text-stone-100 rounded-full text-[10px] font-black transition-colors uppercase tracking-[0.2em] border border-stone-800"
                            >
                                Clear
                            </button>
                            <button 
                                onClick={startGame}
                                disabled={humanBet === 0}
                                className="px-10 py-4 bg-[#d4af37] hover:bg-[#e7c25d] disabled:opacity-50 disabled:cursor-not-allowed text-stone-900 font-black rounded-full shadow-[0_10px_25px_rgba(212,175,55,0.3)] transition-all hover:scale-105 flex items-center gap-2"
                            >
                                <Play size={20} fill="currentColor" />
                                DEAL HAND
                            </button>
                        </div>
                    </div>
               </div>
           )}

           {(phase === 'PLACEMENT' || phase === 'DRAWING') && (
               <div className="flex flex-col items-center gap-6">
                    <div className="flex gap-4 items-center animate-in fade-in zoom-in duration-300 overflow-x-auto overflow-y-visible max-w-full pt-10 pb-6 px-4 scrollbar-hide">
                        {human.hand.map((card) => (
                            <Card 
                                key={card.id} 
                                card={card} 
                                draggable={true}
                                onDragStart={() => setIsDragging(true)}
                                onClick={() => {
                                    setSelectedCardId(selectedCardId === card.id ? null : card.id);
                                }}
                                selected={selectedCardId === card.id}
                                className="hover:-translate-y-8 hover:z-50 shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
                            />
                        ))}
                        {human.hand.length === 0 && (
                            <div className="text-[#d4af37] italic text-xs animate-pulse flex items-center gap-3 bg-black/60 px-8 py-4 rounded-full border border-[#d4af37]/20 shadow-2xl backdrop-blur-xl">
                                <RefreshCw size={18} className="animate-spin text-[#d4af37]" />
                                <span className="font-black uppercase tracking-[0.2em]">Croupier is shuffling...</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-8 text-[10px] font-black uppercase tracking-[0.3em] bg-black/40 px-6 py-2 rounded-full border border-white/5 backdrop-blur-md">
                        <span className="text-emerald-400">Player: ${humanBet}</span>
                        <div className="w-px h-3 bg-white/10"></div>
                        <span className="text-rose-400">House: ${aiBet}</span>
                        <div className="w-px h-3 bg-white/10"></div>
                        <span className="text-white">Pot: ${humanBet + aiBet}</span>
                    </div>
               </div>
           )}

           {phase === 'GAME_OVER' && (
               <div className="flex flex-col items-center gap-8 animate-in slide-in-from-bottom-8 duration-700">
                   <div className="bg-black/60 p-10 rounded-[3rem] border border-[#d4af37]/20 backdrop-blur-2xl flex items-center gap-12 shadow-[0_40px_80px_rgba(0,0,0,0.6)] relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent opacity-80"></div>
                       <div className="text-center">
                           <div className="text-stone-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Points</div>
                           <div className={`text-6xl font-black ${human.scores.total > ai.scores.total ? 'text-emerald-400' : 'text-stone-300'}`}>
                               {human.scores.total}
                           </div>
                       </div>
                       <div className="h-20 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
                       <div className="text-center">
                           <div className="text-stone-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">House</div>
                           <div className={`text-6xl font-black ${ai.scores.total > human.scores.total ? 'text-rose-400' : 'text-stone-300'}`}>
                               {ai.scores.total}
                           </div>
                       </div>
                   </div>
                   
                   <div className="flex flex-col items-center gap-3 scale-110">
                        {lastWinAmount !== null && (
                            <div className={`text-5xl font-black drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] ${lastWinAmount > 0 ? 'text-emerald-400' : lastWinAmount < 0 ? 'text-rose-400' : 'text-stone-400'}`}>
                                {lastWinAmount > 0 ? '+' : ''}${lastWinAmount.toLocaleString()}
                            </div>
                        )}
                        <div className="text-[#d4af37] text-[10px] font-black uppercase tracking-[0.4em] opacity-80">
                            {lastWinAmount !== null && lastWinAmount > 0 ? 'Winnings Collected' : lastWinAmount === 0 ? 'Push - Stakes Returned' : 'Stack Lost'}
                        </div>
                   </div>

                   <button 
                      onClick={startBetting}
                      className="group flex items-center gap-4 px-14 py-5 bg-gradient-to-b from-[#e7c25d] to-[#d4af37] text-stone-900 font-black rounded-full shadow-[0_15px_30px_rgba(212,175,55,0.4)] transition-all hover:scale-110 active:scale-95"
                   >
                       <RefreshCw size={24} className="group-hover:rotate-180 transition-transform duration-700" />
                       <span className="text-lg uppercase tracking-widest">{roundCount > TOTAL_ROUNDS ? 'NEW SERIES' : 'CONTINUE'}</span>
                   </button>
               </div>
           )}
        </div>

        {/* Player Board */}
        <div className="relative mb-20">
             <div className="absolute -top-3 left-6 text-[10px] font-black text-emerald-400/60 uppercase tracking-[0.3em] bg-[#0c2a1c] px-3 z-10 border border-emerald-400/20 rounded-full">
                Player Stack
             </div>
             <Board 
                board={human.board} 
                isHuman={true} 
                onSlotClick={handleSlotClick}
                onSlotDrop={handleSlotDrop}
                highlightEmpty={!!selectedCardId || isDragging}
                evaluations={currentHumanEvaluations}
                fouled={human.fouled}
                isWinner={winnerFlags}
             />
             {phase === 'PLACEMENT' || phase === 'DRAWING' ? (
                <div className="absolute top-2 right-4 flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 text-emerald-400 text-[10px] font-black shadow-lg backdrop-blur-md">
                    <Coins size={10} />
                    YOUR STAKE: ${humanBet}
                </div>
             ) : null}
        </div>
      </div>
      
      <footer className="w-full max-w-5xl px-6 py-6 mt-auto flex flex-wrap justify-between text-[10px] text-stone-500 font-black uppercase tracking-[0.3em] z-20">
          <div className="flex gap-8">
             <div className="opacity-40">OFC POKER TOURNAMENT</div>
             <div className="hidden sm:block text-[#d4af37]/40 tracking-widest">VIP TABLE #042</div>
          </div>
          <div className="flex gap-8 items-center">
             <div className="flex items-center gap-2 text-stone-400/60"><Settings2 size={12} /> STATS: {stats.humanWins}W - {stats.aiWins}L</div>
             <div className="text-[#d4af37]/60">HOUSE OBLIGATION: ${aiRemainingToBet}</div>
          </div>
      </footer>
    </div>
  );
};

export default App;