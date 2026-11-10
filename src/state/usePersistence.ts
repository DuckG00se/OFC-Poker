import { useEffect, useRef } from 'react';
import type { Prefs } from '../ui/prefs';
import type { AppState } from './appReducer';
import type { SaveWriter } from './persist';

const SAVE_DELAY_MS = 250;

/**
 * Saves the game shortly after every change, and immediately when the page is being hidden
 * or closed (the last moment a mobile browser reliably gives a page).
 */
export const usePersistence = (writer: SaveWriter, app: AppState, prefs: Prefs): void => {
  const latest = useRef({ app, prefs });
  latest.current = { app, prefs };
  const dirty = useRef(false);

  useEffect(() => {
    dirty.current = true;
    const id = window.setTimeout(() => {
      writer.save(latest.current.app, latest.current.prefs);
      dirty.current = false;
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [writer, app, prefs]);

  useEffect(() => {
    const flush = (): void => {
      if (!dirty.current) return;
      writer.save(latest.current.app, latest.current.prefs);
      dirty.current = false;
    };
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
    };
  }, [writer]);
};
