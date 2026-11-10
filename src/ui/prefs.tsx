import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface Helpers {
  /** Name of the hand currently made on each row. */
  handNames: boolean;
  /** Foul risk estimate and "foul certain" warnings. */
  foulWarning: boolean;
  /** Live outs and draw indicators per row. */
  outs: boolean;
  /** Royalties already locked in. */
  royalties: boolean;
  /** The cards-remaining tracker. */
  tracker: boolean;
}

export type MotionLevel = 'full' | 'fast' | 'off';

/** Player preferences: presentation only, never rules. */
export interface Prefs {
  sound: boolean;
  haptics: boolean;
  /** Colour-blind friendly deck: clubs green, diamonds blue. */
  fourColorDeck: boolean;
  motion: MotionLevel;
  /** Show the CPU's short explanation of some of its moves. */
  cpuHints: boolean;
  helpers: Helpers;
}

export const DEFAULT_PREFS: Prefs = {
  sound: true,
  haptics: true,
  fourColorDeck: false,
  motion: 'full',
  cpuHints: true,
  helpers: { handNames: true, foulWarning: true, outs: true, royalties: true, tracker: true },
};

interface PrefsApi {
  prefs: Prefs;
  update: (patch: Partial<Prefs>) => void;
  setHelper: (key: keyof Helpers, value: boolean) => void;
}

const PrefsContext = createContext<PrefsApi | null>(null);

interface PrefsProviderProps {
  initial?: Prefs;
  /** Called after every change (used to persist preferences). */
  onChange?: (prefs: Prefs) => void;
  children: React.ReactNode;
}

export const PrefsProvider: React.FC<PrefsProviderProps> = ({ initial, onChange, children }) => {
  const [prefs, setPrefs] = useState<Prefs>(initial ?? DEFAULT_PREFS);
  const update = useCallback((patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch })), []);
  const setHelper = useCallback(
    (key: keyof Helpers, value: boolean) =>
      setPrefs((p) => ({ ...p, helpers: { ...p.helpers, [key]: value } })),
    [],
  );
  useEffect(() => onChange?.(prefs), [prefs, onChange]);
  const api = useMemo(() => ({ prefs, update, setHelper }), [prefs, update, setHelper]);
  return <PrefsContext.Provider value={api}>{children}</PrefsContext.Provider>;
};

export const usePrefs = (): PrefsApi => {
  const api = useContext(PrefsContext);
  if (!api) throw new Error('usePrefs must be used inside a PrefsProvider');
  return api;
};

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/** True when the operating system asks for reduced motion. */
export const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(REDUCED_QUERY).matches,
  );
  useEffect(() => {
    const query = window.matchMedia(REDUCED_QUERY);
    const onChange = (): void => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
};

/**
 * Animation time multiplier: 1 for full motion, 0.5 for fast, 0 for none. The system
 * "reduce motion" setting always wins over the in-game preference.
 */
export const useMotionScale = (): number => {
  const { prefs } = usePrefs();
  const reduced = usePrefersReducedMotion();
  if (reduced || prefs.motion === 'off') return 0;
  return prefs.motion === 'fast' ? 0.5 : 1;
};
