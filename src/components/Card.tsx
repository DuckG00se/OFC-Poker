import React, { useEffect, useRef } from 'react';
import { rankLabel, type Card as CardModel, type Suit } from '../engine';
import { useFlight } from '../ui/flip';
import { useMotionScale, usePrefs } from '../ui/prefs';

const GLYPH: Readonly<Record<Suit, string>> = { h: '♥', d: '♦', c: '♣', s: '♠' };
const SUIT_NAME: Readonly<Record<Suit, string>> = {
  h: 'hearts',
  d: 'diamonds',
  c: 'clubs',
  s: 'spades',
};
const RANK_NAME: Readonly<Record<number, string>> = {
  11: 'Jack',
  12: 'Queen',
  13: 'King',
  14: 'Ace',
};

/** Classic two-colour deck, and the colour-blind friendly four-colour deck. */
const TWO_COLOR: Readonly<Record<Suit, string>> = {
  h: 'text-red-600',
  d: 'text-red-600',
  c: 'text-slate-900',
  s: 'text-slate-900',
};
const FOUR_COLOR: Readonly<Record<Suit, string>> = {
  h: 'text-red-600',
  d: 'text-blue-600',
  c: 'text-green-700',
  s: 'text-slate-900',
};

/** The same decks, tuned for dark surfaces (the card tracker). Literal class names on purpose. */
const TWO_COLOR_DARK: Readonly<Record<Suit, string>> = {
  h: 'text-red-400',
  d: 'text-red-400',
  c: 'text-stone-100',
  s: 'text-stone-100',
};
const FOUR_COLOR_DARK: Readonly<Record<Suit, string>> = {
  h: 'text-red-400',
  d: 'text-sky-400',
  c: 'text-green-400',
  s: 'text-stone-100',
};

export const suitGlyph = (suit: Suit): string => GLYPH[suit];
export const suitColorOnDark = (suit: Suit, fourColor: boolean): string =>
  (fourColor ? FOUR_COLOR_DARK : TWO_COLOR_DARK)[suit];
export const suitColorClass = (suit: Suit, fourColor: boolean): string =>
  (fourColor ? FOUR_COLOR : TWO_COLOR)[suit];

export const cardLabel = (card: CardModel): string =>
  `${RANK_NAME[card.rank] ?? card.rank} of ${SUIT_NAME[card.suit]}`;

interface CardProps {
  card: CardModel;
  /** Show the back. The face is not rendered at all, so it cannot be read from the page. */
  faceDown?: boolean;
  selected?: boolean;
  /** Placed this turn and still movable. */
  staged?: boolean;
  glow?: boolean;
  dim?: boolean;
  /** Delay before the deal-in flight (to stagger a dealt hand). */
  dealDelayMs?: number;
  onClick?: () => void;
  /** Pointer-drag handlers from usePointerDrag. */
  dragProps?: { onPointerDown: (e: React.PointerEvent<HTMLElement>) => void };
  /** Extra words for screen readers, e.g. "placed this turn, tap to take back". */
  hint?: string;
  className?: string;
}

const Card: React.FC<CardProps> = ({
  card,
  faceDown = false,
  selected = false,
  staged = false,
  glow = false,
  dim = false,
  dealDelayMs = 0,
  onClick,
  dragProps,
  hint,
  className = '',
}) => {
  const { prefs } = usePrefs();
  const motion = useMotionScale();
  const ref = useFlight<HTMLDivElement>(card.id, { dealDelayMs, flip: !faceDown });
  const wasFaceDown = useRef(faceDown);

  // Turning a face-down card over (the opponent's Fantasyland board at showdown).
  useEffect(() => {
    const el = ref.current;
    if (wasFaceDown.current && !faceDown && el && motion > 0 && typeof el.animate === 'function') {
      el.animate(
        [{ transform: 'rotateY(90deg)' }, { transform: 'rotateY(0deg)' }],
        { duration: 300 * motion, delay: dealDelayMs * motion, easing: 'ease-out', fill: 'backwards' },
      );
    }
    wasFaceDown.current = faceDown;
  }, [faceDown, motion, dealDelayMs, ref]);

  const interactive = onClick !== undefined && !faceDown;
  const ink = suitColorClass(card.suit, prefs.fourColorDeck);
  const rank = rankLabel(card.rank);
  const label = faceDown ? 'Face-down card' : `${cardLabel(card)}${hint ? `, ${hint}` : ''}`;

  return (
    <div
      ref={ref}
      role={interactive ? 'button' : 'img'}
      tabIndex={interactive ? 0 : undefined}
      aria-label={label}
      aria-pressed={interactive ? selected : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
      {...(dragProps && !faceDown ? dragProps : {})}
      className={[
        'ofc-card @container relative select-none border-2 font-black leading-none shadow-md',
        'transition-[translate,box-shadow,border-color,opacity] duration-200 ease-out',
        faceDown ? 'ofc-card-back border-[#d4af37]/40' : 'bg-white',
        !faceDown && selected
          ? 'z-30 -translate-y-[14%] border-[#d4af37] shadow-2xl ring-2 ring-[#d4af37]'
          : !faceDown && staged
            ? 'border-[#d4af37]/80 ring-1 ring-[#d4af37]/60'
            : !faceDown
              ? 'border-slate-300'
              : '',
        glow ? 'ring-2 ring-[#d4af37] shadow-[0_0_14px_rgba(212,175,55,0.55)]' : '',
        dim ? 'opacity-55' : '',
        interactive ? 'cursor-pointer outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#d4af37]' : '',
        dragProps && !faceDown ? 'ofc-draggable' : '',
        className,
      ].join(' ')}
    >
      {!faceDown && (
        <>
          <div className={`absolute left-[9%] top-[6%] ${ink}`} aria-hidden="true">
            {rank}
          </div>
          <div
            className={`absolute inset-0 flex items-center justify-center pt-[16%] text-[1.7em] @[3.5rem]:pt-[6%] ${ink}`}
            aria-hidden="true"
          >
            {GLYPH[card.suit]}
          </div>
          {/* The mirrored corner only fits on larger cards. */}
          <div
            className={`absolute bottom-[6%] right-[9%] hidden rotate-180 @[3.5rem]:block ${ink}`}
            aria-hidden="true"
          >
            {rank}
          </div>
          {/* Shown only during the deal-in flip (see ui/flip.tsx). */}
          <div
            data-card-back
            aria-hidden="true"
            className="ofc-card-back pointer-events-none absolute inset-0 rounded-[inherit] opacity-0"
          />
        </>
      )}
    </div>
  );
};

export default React.memo(Card);
