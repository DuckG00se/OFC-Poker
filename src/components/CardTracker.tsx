import React from 'react';
import { RANKS, SUIT_ORDER, cardId, rankLabel, type Card } from '../engine';
import { usePrefs } from '../ui/prefs';
import { suitColorOnDark, suitGlyph } from './Card';

interface CardTrackerProps {
  /** Cards the player cannot see anywhere (still possibly in the deck or the opponent's hand). */
  unseen: readonly Card[];
  /** Leave out the explanation (for the always-visible desktop panel). */
  compact?: boolean;
}

const RANKS_DESC = [...RANKS].reverse();
const SUIT_WORD = { s: 'Spades', h: 'Hearts', d: 'Diamonds', c: 'Clubs' } as const;

/**
 * The "cards remaining" tracker: every card in the deck, with the ones already visible
 * (dead cards) crossed out. Live counts per suit make outs easy to read at a glance.
 */
const CardTracker: React.FC<CardTrackerProps> = ({ unseen, compact = false }) => {
  const { prefs } = usePrefs();
  const live = new Set(unseen.map((c) => c.id));
  return (
    <div className="flex flex-col gap-1.5">
      {SUIT_ORDER.map((suit) => {
        const liveCount = RANKS.filter((r) => live.has(cardId(r, suit))).length;
        const ink = suitColorOnDark(suit, prefs.fourColorDeck);
        return (
          <div key={suit} className="flex items-center gap-1.5" role="group" aria-label={`${SUIT_WORD[suit]}: ${liveCount} live`}>
            <span className={`w-9 flex-none text-sm font-black ${ink}`}>
              {suitGlyph(suit)} <span className="text-[10px] text-stone-400">{liveCount}</span>
            </span>
            <div className="grid flex-1 gap-[2px]" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
              {RANKS_DESC.map((rank) => {
                const isLive = live.has(cardId(rank, suit));
                return (
                  <span
                    key={rank}
                    aria-label={`${rankLabel(rank)} of ${SUIT_WORD[suit]}: ${isLive ? 'live' : 'dead'}`}
                    className={`flex aspect-square items-center justify-center rounded text-[11px] font-black ${
                      isLive ? `bg-white/10 ${ink}` : 'bg-black/30 text-stone-700 line-through'
                    }`}
                  >
                    {rankLabel(rank)}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
      {compact ? (
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{unseen.length} cards unseen</p>
      ) : (
        <p className="pt-1 text-[11px] leading-snug text-stone-400">
          {unseen.length} cards unseen. Crossed-out cards are dead: on a board, in your hand, or
          discarded by you. Your opponent's discards stay hidden.
        </p>
      )}
    </div>
  );
};

export default CardTracker;
