import React from 'react';
import Table from './components/Table';
import type { AppState } from './state/appReducer';
import { useGame } from './state/useGame';
import { FlipProvider } from './ui/flip';
import { PrefsProvider, useMotionScale, type Prefs } from './ui/prefs';

interface AppProps {
  /** Start from a given state (used to resume a saved game, and in tests). */
  initialState?: AppState;
  initialPrefs?: Prefs;
}

const Game: React.FC<{ initialState?: AppState }> = ({ initialState }) => {
  const api = useGame(initialState);
  const motion = useMotionScale();
  return (
    // Card positions are forgotten at the start of every hand, so each deal starts at the deck.
    <FlipProvider resetKey={api.game.setup?.seed ?? 'idle'} scale={motion}>
      <Table api={api} />
    </FlipProvider>
  );
};

const App: React.FC<AppProps> = ({ initialState, initialPrefs }) => (
  <PrefsProvider initial={initialPrefs}>
    <Game initialState={initialState} />
  </PrefsProvider>
);

export default App;
