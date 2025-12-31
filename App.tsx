import React, { useState, useEffect } from 'react';
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
  const [humanEvaluations, setHumanEvaluations] = useState<{front:HandEvaluation, mid:HandEvaluation, back:HandEvaluation} | undefined>(undefined);
  const [winnerFlags, setWinnerFlags] = useState<{front: boolean, mid: boolean, back: boolean} | undefined>(undefined);
  
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
    setHumanEvaluations(undefined);
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
      setHumanEvaluations({ front: hFront, mid: hMid, back: hBack });
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
    <div className="min-h-screen bg-[#1a3c28] flex flex-col items-center justify-between py-4 font-sans relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      <header className="w-full max-w-5xl px-4 flex flex-wrap justify-between items-center z-10 text-stone-300 mb-2 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-500/20 px-3 py-1 rounded-lg border border-yellow-500/30 flex items-center gap-2">
             <Timer size={14} className="text-yellow-500" />
             <span className="font-black text-xs text-yellow-500 uppercase tracking-tighter">
                {roundCount <= TOTAL_ROUNDS ? `Round ${roundCount} / 10` : 'Series Ended'}
             </span>
          </div>
          <span className="font-bold tracking-widest text-sm text-white/90 hidden sm:inline uppercase">OFC High Roller</span>
        </div>

        <div className="flex items-center gap-4 bg-black/40 px-6 py-2 rounded-2xl border border-white/5 shadow-xl backdrop-blur-md">
            <div className="flex gap-6 text-xs font-bold items-center">
                 <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] opacity-40 uppercase tracking-tighter font-black">PLAYER</span>
                        <span className="bg-green-500/20 text-green-400 px-1.5 rounded-sm text-[9px] border border-green-500/30">{stats.humanWins} W</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-400 font-black">
                        <DollarSign size={12} />
                        <span>{humanBalance.toLocaleString()}</span>
                    </div>
                 </div>

                 <div className="flex flex-col items-center px-2 opacity-60">
                    <Trophy size={16} className={stats.humanWins > stats.aiWins ? 'text-yellow-500' : stats.aiWins > stats.humanWins ? 'text-red-500' : 'text-stone-600'} />
                    <span className="text-[8px] text-stone-500 font-black tracking-tighter">VS</span>
                 </div>

                 <div className="flex flex-col items-start">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="bg-red-500/20 text-red-400 px-1.5 rounded-sm text-[9px] border border-red-500/30">{stats.aiWins} W</span>
                        <span className="text-[10px] opacity-40 uppercase tracking-tighter font-black">CPU</span>
                    </div>
                    <div className="flex items-center gap-1 text-red-400 font-black">
                        <DollarSign size={12} />
                        <span>{aiBalance.toLocaleString()}</span>
                    </div>
                 </div>
            </div>
        </div>

        <div className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold opacity-60 bg-white/5 px-2 py-1 rounded">
            {phase.replace('_', ' ')}
        </div>
      </header>

      <div className="flex-1 w-full max-w-4xl flex flex-col gap-4 relative z-0">
        
        {/* Opponent Row */}
        <div className="relative">
             <div className="absolute -top-3 left-4 text-xs font-bold text-stone-500 uppercase tracking-widest bg-[#1a3c28] px-2 z-10">
                Opponent
             </div>
             <Board 
                board={ai.board} 
                isHuman={false} 
                evaluations={aiEvaluations} 
                fouled={ai.fouled}
             />
             {phase === 'PLACEMENT' || phase === 'DRAWING' ? (
                <div className="absolute top-2 right-4 flex items-center gap-1.5 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 text-red-400 text-xs font-bold shadow-lg">
                    <Coins size={12} />
                    CPU STAKE: ${aiBet}
                </div>
             ) : null}
        </div>

        {/* Dynamic Center Area */}
        <div className="flex items-center justify-center min-h-[240px]">
           
           {phase === 'START' && (
               <div className="text-center flex flex-col items-center gap-6">
                   <div className="bg-black/40 p-8 rounded-[2rem] border border-white/10 backdrop-blur-md shadow-2xl max-w-md animate-in fade-in slide-in-from-top-4 duration-500">
                        <h2 className="text-white text-3xl font-black mb-1 tracking-tighter">
                            {roundCount > TOTAL_ROUNDS ? 'SERIES COMPLETE' : 'READY FOR NEXT HAND?'}
                        </h2>
                        <div className="w-16 h-1 bg-yellow-500 mx-auto mb-4 rounded-full"></div>
                        <p className="text-stone-400 mb-6 text-sm leading-relaxed">
                            {roundCount > TOTAL_ROUNDS 
                                ? `10 hands have been played. Final Standings: YOU ${stats.humanWins} - ${stats.aiWins} CPU.` 
                                : `Round ${roundCount} of ${TOTAL_ROUNDS}. The AI is currently calculating its strategic bet based on its remaining $${aiRemainingToBet} obligation.`}
                        </p>
                        <button 
                            onClick={startBetting}
                            className="group relative px-10 py-4 bg-yellow-500 hover:bg-yellow-400 text-stone-900 font-black text-xl rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3 overflow-hidden"
                        >
                            <Coins size={24} className="group-hover:rotate-12 transition-transform" />
                            {roundCount > TOTAL_ROUNDS ? 'NEW TOURNAMENT' : 'ENTER BETTING'}
                        </button>
                   </div>
               </div>
           )}

           {phase === 'BETTING' && (
               <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
                    <div className="flex flex-col items-center bg-black/20 px-8 py-4 rounded-3xl border border-white/5">
                        <div className="text-stone-400 text-xs font-bold uppercase tracking-[0.2em] mb-1">Your Total Wager</div>
                        <div className="text-6xl font-black text-yellow-400 drop-shadow-lg flex items-center justify-center gap-1">
                            <DollarSign size={40} className="text-yellow-600" />
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
                                    w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-dashed 
                                    flex items-center justify-center text-white font-black text-lg sm:text-xl
                                    shadow-2xl transition-all active:scale-90 hover:-translate-y-2
                                    disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed
                                    relative overflow-hidden group
                                `}
                            >
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                ${val}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center gap-2 bg-stone-900/50 px-4 py-2 rounded-full border border-stone-800 text-stone-500 text-xs font-bold italic">
                            <BrainCircuit size={14} className="text-red-500" />
                            AI Strategy: <span className="text-stone-300">{aiStrategy}</span>
                        </div>
                        
                        <div className="flex gap-4">
                            <button 
                                onClick={clearBet}
                                className="px-6 py-2 bg-stone-800/50 text-stone-500 hover:text-stone-100 rounded-full text-xs font-bold transition-colors uppercase tracking-widest border border-stone-700"
                            >
                                Reset
                            </button>
                            <button 
                                onClick={startGame}
                                disabled={humanBet === 0}
                                className="px-10 py-4 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-full shadow-2xl transition-all hover:scale-105 flex items-center gap-2"
                            >
                                <Play size={20} fill="currentColor" />
                                LOCK BETS
                            </button>
                        </div>
                    </div>
               </div>
           )}

           {(phase === 'PLACEMENT' || phase === 'DRAWING') && (
               <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-4 items-center animate-in fade-in zoom-in duration-300">
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
                                className="hover:-translate-y-4 shadow-2xl"
                            />
                        ))}
                        {human.hand.length === 0 && (
                            <div className="text-stone-500 italic text-sm animate-pulse flex items-center gap-3 bg-black/40 px-6 py-3 rounded-full border border-white/10 shadow-xl">
                                <RefreshCw size={16} className="animate-spin text-yellow-500" />
                                <span className="font-bold tracking-tight">CPU is analyzing the board...</span>
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex gap-6 text-[11px] font-black uppercase tracking-[0.2em] bg-black/20 px-4 py-1.5 rounded-full">
                        <span className="text-yellow-500/70">You: ${humanBet}</span>
                        <span className="text-red-500/70">CPU: ${aiBet}</span>
                        <span className="text-white/90">Pot: ${humanBet + aiBet}</span>
                    </div>
               </div>
           )}

           {phase === 'GAME_OVER' && (
               <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-4 duration-500">
                   <div className="bg-stone-900/90 p-8 rounded-[2.5rem] border border-stone-700 backdrop-blur-xl flex items-center gap-10 shadow-2xl relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-stone-600 to-transparent opacity-50"></div>
                       <div className="text-center">
                           <div className="text-stone-500 text-[10px] font-bold uppercase tracking-widest mb-1">Your Pts</div>
                           <div className={`text-5xl font-black ${human.scores.total > ai.scores.total ? 'text-green-400' : 'text-stone-300'}`}>
                               {human.scores.total}
                           </div>
                       </div>
                       <div className="h-16 w-px bg-stone-800"></div>
                       <div className="text-center">
                           <div className="text-stone-500 text-[10px] font-bold uppercase tracking-widest mb-1">CPU Pts</div>
                           <div className={`text-5xl font-black ${ai.scores.total > human.scores.total ? 'text-red-400' : 'text-stone-300'}`}>
                               {ai.scores.total}
                           </div>
                       </div>
                   </div>
                   
                   <div className="flex flex-col items-center gap-2 scale-110">
                        <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-md border border-white/5 mb-1">
                            <Swords size={12} className="text-stone-500" />
                            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Session: {stats.humanWins}W - {stats.aiWins}W</span>
                        </div>
                        {lastWinAmount !== null && (
                            <div className={`text-4xl font-black drop-shadow-2xl ${lastWinAmount > 0 ? 'text-green-400' : lastWinAmount < 0 ? 'text-red-500' : 'text-stone-400'}`}>
                                {lastWinAmount > 0 ? '+' : ''}${lastWinAmount.toLocaleString()}
                            </div>
                        )}
                        <div className="text-stone-500 text-[10px] font-black uppercase tracking-[0.3em] opacity-80">
                            {lastWinAmount !== null && lastWinAmount > 0 ? 'Tournament Payout' : lastWinAmount === 0 ? 'Push - Pot Split' : 'Loss - Pot Lost'}
                        </div>
                   </div>

                   <button 
                      onClick={startBetting}
                      className="group flex items-center gap-3 px-12 py-4 bg-yellow-500 hover:bg-yellow-400 text-stone-900 font-black rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95"
                   >
                       <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-700" />
                       {roundCount > TOTAL_ROUNDS ? 'FINAL STANDINGS' : 'CONTINUE SERIES'}
                   </button>
               </div>
           )}
        </div>

        {/* Player Board */}
        <div className="relative">
             <div className="absolute -top-3 left-4 text-xs font-bold text-stone-400 uppercase tracking-widest bg-[#1a3c28] px-2 z-10">
                Your Table
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
             {phase === 'PLACEMENT' || phase === 'DRAWING' ? (
                <div className="absolute top-2 right-4 flex items-center gap-1.5 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20 text-yellow-400 text-xs font-bold shadow-lg">
                    <Coins size={12} />
                    YOUR STAKE: ${humanBet}
                </div>
             ) : null}
        </div>
      </div>
      
      <footer className="w-full max-w-4xl px-4 mt-6 flex justify-between text-[10px] text-stone-500 font-bold uppercase tracking-[0.2em] opacity-40">
          <div className="flex gap-6">
             <div>OFC TOURNAMENT SERIES</div>
             <div className="hidden sm:block">INITIAL AI BUDGET: $1,000</div>
          </div>
          <div className="flex gap-6 items-center">
             <div className="flex items-center gap-2"><Settings2 size={12} /> RECORD: {stats.humanWins}W / {stats.aiWins}L</div>
             <div className="text-stone-300">AI OBLIGATION REMAINING: ${aiRemainingToBet}</div>
          </div>
      </footer>
    </div>
  );
};

export default App;