import React, { useState } from 'react';
import Table from './components/Table';
import { randomSeed } from './engine';
import type { AppState } from './state/appReducer';
import { browserStorage, createSaveWriter, loadSave, type SaveWriter } from './state/persist';
import { useGame } from './state/useGame';
import { usePersistence } from './state/usePersistence';
import { FlipProvider } from './ui/flip';
import { PrefsProvider, useMotionScale, usePrefs, type Prefs } from './ui/prefs';

interface AppProps {
  /** Start from a given state instead of the saved one (used in tests). */
  initialState?: AppState;
  initialPrefs?: Prefs;
}

const Game: React.FC<{ initialState: AppState; writer: SaveWriter }> = ({ initialState, writer }) => {
  const api = useGame(initialState);
  const { prefs } = usePrefs();
  const motion = useMotionScale();
  usePersistence(writer, api.app, prefs);
  return (
    // Card positions are forgotten at the start of every hand, so each deal starts at the deck.
    <FlipProvider resetKey={api.game.setup?.seed ?? 'idle'} scale={motion}>
      <Table api={api} />
    </FlipProvider>
  );
};

const App: React.FC<AppProps> = ({ initialState, initialPrefs }) => {
  // Read the save once, before the first render, so a resumed game appears immediately.
  const [boot] = useState(() => {
    const storage = browserStorage();
    const loaded = loadSave(storage, randomSeed());
    return { loaded, writer: createSaveWriter(storage) };
  });
  return (
    <PrefsProvider initial={initialPrefs ?? boot.loaded.prefs}>
      <Game initialState={initialState ?? boot.loaded.app} writer={boot.writer} />
    </PrefsProvider>
  );
};

export default App;
