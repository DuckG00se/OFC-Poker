import { useCallback, useEffect, useRef, useState } from 'react';
import type { RowName } from '../engine';
import { useFlightOverride } from './flip';

export type DropTarget =
  | { kind: 'row'; row: RowName }
  | { kind: 'discard' }
  | { kind: 'hand' };

const DRAG_THRESHOLD_PX = 7;

const parseTarget = (el: Element | null): { target: DropTarget; el: HTMLElement } | null => {
  const host = el?.closest<HTMLElement>('[data-drop]');
  const value = host?.dataset.drop;
  if (!host || !value) return null;
  if (value === 'discard') return { target: { kind: 'discard' }, el: host };
  if (value === 'hand') return { target: { kind: 'hand' }, el: host };
  if (value === 'row:front' || value === 'row:mid' || value === 'row:back') {
    return { target: { kind: 'row', row: value.slice(4) as RowName }, el: host };
  }
  return null;
};

interface DragState {
  cardId: string;
  el: HTMLElement;
  pointerId: number;
  startX: number;
  startY: number;
  dragging: boolean;
  over: HTMLElement | null;
}

export interface PointerDrag {
  /** Id of the card being dragged, or null. Use it to highlight where it can go. */
  dragId: string | null;
  /** Spread the result on a draggable card. */
  bind: (cardId: string) => { onPointerDown: (e: React.PointerEvent<HTMLElement>) => void };
}

/**
 * Drag and drop built on pointer events, so it behaves the same with a mouse, a finger or a
 * pen (HTML5 drag-and-drop does not fire on touch screens). The card follows the pointer via
 * a transform written straight to the element (no React render per move). Drop zones are any
 * element with a `data-drop` attribute: "row:front" | "row:mid" | "row:back" | "discard" | "hand".
 *
 * `onDrop` returns whether the drop was accepted; a rejected card glides back to where it was.
 * A press that never moves past a small threshold is left alone, so taps still work.
 */
export const usePointerDrag = (
  onDrop: (cardId: string, target: DropTarget) => boolean,
): PointerDrag => {
  const [dragId, setDragId] = useState<string | null>(null);
  const state = useRef<DragState | null>(null);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;
  const overrideFlight = useFlightOverride();
  const overrideRef = useRef(overrideFlight);
  overrideRef.current = overrideFlight;
  const cleanup = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanup.current?.(), []);

  const bind = useCallback(
    (cardId: string) => ({
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (state.current) return;
        const el = e.currentTarget;
        state.current = {
          cardId,
          el,
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          dragging: false,
          over: null,
        };

        const setOver = (next: HTMLElement | null): void => {
          const s = state.current;
          if (!s || s.over === next) return;
          s.over?.removeAttribute('data-drag-over');
          next?.setAttribute('data-drag-over', 'true');
          s.over = next;
        };

        const onMove = (ev: PointerEvent): void => {
          const s = state.current;
          if (!s || ev.pointerId !== s.pointerId) return;
          const dx = ev.clientX - s.startX;
          const dy = ev.clientY - s.startY;
          if (!s.dragging) {
            if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
            s.dragging = true;
            s.el.style.transition = 'none';
            s.el.style.pointerEvents = 'none';
            s.el.style.zIndex = '60';
            s.el.setAttribute('data-dragging', 'true');
            setDragId(s.cardId);
          }
          ev.preventDefault();
          s.el.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`;
          setOver(parseTarget(document.elementFromPoint(ev.clientX, ev.clientY))?.el ?? null);
        };

        const finish = (ev: PointerEvent, cancelled: boolean): void => {
          const s = state.current;
          if (!s || ev.pointerId !== s.pointerId) return;
          cleanup.current?.();
          if (!s.dragging) return; // a plain tap: let the click handler deal with it

          const hit = cancelled ? null : parseTarget(document.elementFromPoint(ev.clientX, ev.clientY));
          const rect = s.el.getBoundingClientRect();
          const releasedAt = s.el.style.transform;
          setOver(null);
          s.el.style.transform = '';
          s.el.style.transition = '';
          s.el.style.pointerEvents = '';
          s.el.style.zIndex = '';
          s.el.removeAttribute('data-dragging');
          setDragId(null);

          // The click that follows a mouse drag must not also select the card.
          const swallow = (click: MouseEvent): void => {
            click.stopPropagation();
            click.preventDefault();
          };
          window.addEventListener('click', swallow, { capture: true, once: true });
          window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);

          if (hit) {
            overrideRef.current(s.cardId, rect);
            if (onDropRef.current(s.cardId, hit.target)) return;
          }
          // Rejected or dropped on nothing: glide back.
          if (typeof s.el.animate === 'function') {
            s.el.animate([{ transform: releasedAt }, { transform: 'translate(0px, 0px) scale(1)' }], {
              duration: 180,
              easing: 'ease-out',
            });
          }
        };

        /*
         * While a card is being dragged, the touch moves themselves must be cancelled (not
         * just the pointer events). Otherwise a finger that is still moving when it lifts
         * makes the browser start a "fling", and the browser then uses the NEXT touch to stop
         * that fling instead of delivering it: the first tap after a quick drag-and-drop
         * (for example on Confirm) would silently do nothing. Verified in Chromium with real
         * touch events. Moves below the drag threshold are left alone so taps still click.
         */
        const onTouchMove = (ev: TouchEvent): void => {
          if (state.current?.dragging && ev.cancelable) ev.preventDefault();
        };

        const onUp = (ev: PointerEvent): void => finish(ev, false);
        const onCancel = (ev: PointerEvent): void => finish(ev, true);
        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onCancel);
        cleanup.current = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('touchmove', onTouchMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onCancel);
          state.current = null;
          cleanup.current = null;
        };
      },
    }),
    [],
  );

  return { dragId, bind };
};
