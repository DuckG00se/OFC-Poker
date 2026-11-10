import { useEffect, useRef } from 'react';
import type { RowName } from '../engine';

export interface KeyboardHandlers {
  /** 1 / 2 / 3: front, middle, back. */
  onRow?: (row: RowName) => void;
  /** Enter: confirm the turn, skip the score reveal, or deal the next hand. */
  onEnter?: () => void;
  /** D or 0: discard the selected card. */
  onDiscard?: () => void;
  /** Backspace, Z or U: take back the last staged card. */
  onUndo?: () => void;
  /** Left / Right: move the selection through the hand. */
  onCycle?: (direction: -1 | 1) => void;
  onEscape?: () => void;
}

const ROW_KEYS: Readonly<Record<string, RowName>> = { '1': 'front', '2': 'mid', '3': 'back' };

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

const isActivatable = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.tagName === 'BUTTON' || target.tagName === 'A' || target.tagName === 'SUMMARY' || target.getAttribute('role') === 'button');

/** Global keyboard shortcuts for playing without a pointer. Disabled while a dialog is open. */
export const useKeyboard = (handlers: KeyboardHandlers): void => {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const h = ref.current;
      const row = ROW_KEYS[e.key];
      if (row) {
        h.onRow?.(row);
        e.preventDefault();
        return;
      }
      switch (e.key) {
        case 'Enter':
          // A focused button or card handles Enter itself.
          if (isActivatable(e.target)) return;
          h.onEnter?.();
          e.preventDefault();
          break;
        case 'd':
        case 'D':
        case '0':
          h.onDiscard?.();
          break;
        case 'Backspace':
        case 'z':
        case 'Z':
        case 'u':
        case 'U':
          h.onUndo?.();
          e.preventDefault();
          break;
        case 'ArrowLeft':
          h.onCycle?.(-1);
          break;
        case 'ArrowRight':
          h.onCycle?.(1);
          break;
        case 'Escape':
          h.onEscape?.();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
};
