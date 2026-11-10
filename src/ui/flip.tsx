import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

/** A box in document coordinates (unaffected by scrolling and by the element's own transforms). */
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Layout generation the box was measured in; bumped on resize. */
  epoch: number;
}

interface FlipContextValue {
  positions: Map<string, Box>;
  deck: { current: HTMLElement | null };
  ready: { current: boolean };
  epoch: { current: number };
  /** Animation time multiplier; 0 disables flights. */
  scale: number;
}

const FlipContext = createContext<FlipContextValue | null>(null);

const layoutBox = (el: HTMLElement, epoch: number): Box => {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight, epoch };
};

interface FlipProviderProps {
  /** Positions are forgotten whenever this changes (a new hand: every card starts in the deck again). */
  resetKey: string;
  /** Animation time multiplier; 0 turns flights off. */
  scale: number;
  children: React.ReactNode;
}

/**
 * Card motion without a library. Every card registers under its id; when a card with the same
 * id shows up somewhere else (hand to board, board back to hand, into the discard zone) it
 * animates from where it was ("FLIP": First, Last, Invert, Play). A card seen for the first
 * time flies in from the deck. Only `transform` and `opacity` are animated, through the Web
 * Animations API, so the work stays on the compositor.
 */
export const FlipProvider: React.FC<FlipProviderProps> = ({ resetKey, scale, children }) => {
  const positions = useRef(new Map<string, Box>()).current;
  const deck = useRef<HTMLElement | null>(null);
  const ready = useRef(false);
  const epoch = useRef(0);
  const lastKey = useRef(resetKey);
  if (lastKey.current !== resetKey) {
    lastKey.current = resetKey;
    positions.clear();
  }

  useEffect(() => {
    ready.current = true;
    const onResize = (): void => {
      epoch.current++;
    };
    window.addEventListener('resize', onResize);
    return () => {
      ready.current = false;
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const value = useMemo(
    () => ({ positions, deck, ready, epoch, scale }),
    [positions, scale],
  );
  return <FlipContext.Provider value={value}>{children}</FlipContext.Provider>;
};

const useFlip = (): FlipContextValue | null => useContext(FlipContext);

const DEAL_MS = 380;
const MOVE_MS = 230;
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

interface FlightOptions {
  /** Delay before a first-appearance (deal) flight, for staggering a dealt hand. */
  dealDelayMs?: number;
  /** Deal flights flip from the back of the card to its face (set false for face-down cards). */
  flip?: boolean;
}

/**
 * Attach the returned ref to a card element to make it take part in flights.
 * Pass `undefined` as the id to opt out.
 */
export const useFlight = <T extends HTMLElement>(
  id: string | undefined,
  { dealDelayMs = 0, flip = true }: FlightOptions = {},
): React.RefObject<T> => {
  const ref = useRef<T>(null);
  const ctx = useFlip();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !ctx || !id) return;
    const box = layoutBox(el, ctx.epoch.current);
    const prev = ctx.positions.get(id);
    ctx.positions.set(id, box);
    if (ctx.scale === 0 || typeof el.animate !== 'function') return;

    if (prev) {
      if (prev.epoch !== box.epoch) return; // the layout itself changed (resize): no animation
      const dx = prev.x + prev.w / 2 - (box.x + box.w / 2);
      const dy = prev.y + prev.h / 2 - (box.y + box.h / 2);
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      const s = box.w > 0 ? prev.w / box.w : 1;
      el.style.zIndex = '40';
      const anim = el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${s})` },
          { transform: 'translate(0px, 0px) scale(1)' },
        ],
        { duration: MOVE_MS * ctx.scale, easing: EASE },
      );
      anim.onfinish = anim.oncancel = () => {
        el.style.zIndex = '';
      };
      return;
    }

    // First time this card is seen: deal it in from the deck.
    const deckEl = ctx.deck.current;
    if (!ctx.ready.current || !deckEl) return;
    const from = layoutBox(deckEl, box.epoch);
    const dx = from.x + from.w / 2 - (box.x + box.w / 2);
    const dy = from.y + from.h / 2 - (box.y + box.h / 2);
    const s = box.w > 0 ? from.w / box.w : 1;
    const timing: KeyframeAnimationOptions = {
      duration: DEAL_MS * ctx.scale,
      delay: dealDelayMs * ctx.scale,
      easing: EASE,
      fill: 'backwards',
    };
    el.style.zIndex = '40';
    const anim = el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotateY(${flip ? 180 : 0}deg)` },
        { transform: 'translate(0px, 0px) scale(1) rotateY(0deg)' },
      ],
      timing,
    );
    anim.onfinish = anim.oncancel = () => {
      el.style.zIndex = '';
    };
    if (flip) {
      // The card back covers the face for the first half of the turn.
      el.querySelector<HTMLElement>('[data-card-back]')?.animate(
        [
          { opacity: 1, offset: 0 },
          { opacity: 1, offset: 0.5 },
          { opacity: 0, offset: 0.51 },
          { opacity: 0, offset: 1 },
        ],
        { ...timing, easing: 'linear' },
      );
    }
  });

  return ref;
};

/** Marks the element cards are dealt from. */
export const useDeckAnchor = (): ((el: HTMLElement | null) => void) => {
  const ctx = useFlip();
  return (el) => {
    if (ctx) ctx.deck.current = el;
  };
};

/**
 * Lets a drag-and-drop tell the flight system where a card visually is when it is released,
 * so it settles from the drop point instead of jumping back to where the drag started.
 */
export const useFlightOverride = (): ((id: string, rect: DOMRect) => void) => {
  const ctx = useFlip();
  return (id, rect) => {
    if (!ctx) return;
    ctx.positions.set(id, {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      w: rect.width,
      h: rect.height,
      epoch: ctx.epoch.current,
    });
  };
};
