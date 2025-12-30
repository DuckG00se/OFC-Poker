import { Card, PlayerBoard, Rank } from '../types';
import { evaluateHand, checkFoul, compareHands } from './pokerLogic';

// Simple heuristic AI
export const getAIMove = (card: Card, currentBoard: PlayerBoard): 'front' | 'mid' | 'back' => {
    // Helper to count empty slots
    const countEmpty = (row: (Card|null)[]) => row.filter(c => c === null).length;
    
    const backEmpty = countEmpty(currentBoard.back);
    const midEmpty = countEmpty(currentBoard.mid);
    const frontEmpty = countEmpty(currentBoard.front);

    const rank = card.rank;

    // Strategy 1: Protect the Back Row
    // If we have a high card (K, A) or standard high card (10+), try to put in back if empty slots exist
    // This helps establish the "Strongest" row foundation.
    if (rank >= 12 && backEmpty > 0) {
        return 'back';
    }

    // Strategy 2: Pairs Logic (Simplified)
    // If the card matches a rank already in a row, prioritize that row to make pairs/trips
    // Check Back Matches
    const backCards = currentBoard.back.filter((c): c is Card => c !== null);
    if (backCards.some(c => c.rank === rank) && backEmpty > 0) return 'back';
    
    // Check Mid Matches
    const midCards = currentBoard.mid.filter((c): c is Card => c !== null);
    if (midCards.some(c => c.rank === rank) && midEmpty > 0) return 'mid';

    // Check Front Matches (only if rank is high enough to be worth it or low enough not to foul?)
    // Actually, making a pair in front is risky if Mid/Back are weak.
    // But if we have a pair, usually good to pair up.
    const frontCards = currentBoard.front.filter((c): c is Card => c !== null);
    if (frontCards.some(c => c.rank === rank) && frontEmpty > 0) {
        // Only pair in front if rank is not HUGE, or if we have stronger foundation
        // For safety, let's allow it, but AI might foul. 
        // Refinement: Only pair in front if rank <= 9 OR if back/mid are already strong.
        // Let's keep it simple: Pair up if possible.
        return 'front';
    }

    // Strategy 3: Fill by Strength
    // Back (High) > Mid (Med) > Front (Low)
    
    // If rank is high (10+) and Back has room, go Back.
    if (rank >= 10 && backEmpty > 0) return 'back';

    // If rank is Medium (6-10) and Mid has room, go Mid.
    if (rank >= 6 && rank < 12 && midEmpty > 0) return 'mid';

    // If rank is Low (< 6) and Front has room, go Front.
    if (rank < 8 && frontEmpty > 0) return 'front';

    // Fallback: If preferred row is full, spill over to next logical row
    // Try Back first for high cards
    if (backEmpty > 0) return 'back';
    if (midEmpty > 0) return 'mid';
    return 'front';
};

export const performAIMove = (aiState: { board: PlayerBoard, hand: Card[] }): PlayerBoard => {
    let newBoard = { ...aiState.board };
    const hand = [...aiState.hand];
    
    // Sort hand by rank descending to place strongest cards first during initial deal
    hand.sort((a, b) => b.rank - a.rank);

    for (const card of hand) {
        // Get target row
        let target = getAIMove(card, newBoard);
        
        // Ensure valid move (row not full)
        const isFull = (row: 'front'|'mid'|'back') => newBoard[row].every(c => c !== null);
        
        if (isFull(target)) {
            // Find first available
            if (!isFull('back')) target = 'back';
            else if (!isFull('mid')) target = 'mid';
            else target = 'front';
        }

        // Place card in first empty slot of target row
        const rowArr = [...newBoard[target]];
        const emptyIdx = rowArr.findIndex(c => c === null);
        rowArr[emptyIdx] = card;
        
        newBoard = {
            ...newBoard,
            [target]: rowArr
        };
    }

    return newBoard;
};
