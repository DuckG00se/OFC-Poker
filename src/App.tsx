import React, { useMemo, useState } from 'react';
import { Check, Play } from 'lucide-react';
import BoardView from './components/BoardView';
import CpuBadge from './components/CpuBadge';
import Header from './components/Header';
import HandTray from './components/HandTray';
import ResultPanel from './components/ResultPanel';
import SettingsPanel from './components/SettingsPanel';
import { personaFor, quipForResult, quipForStart } from './ai';
import { ROW_NAMES, evaluateRow, otherSeat, type RowEval, type RowName } from './engine';
import type { AppState } from './state/appReducer';
import { useGame } from './state/useGame';

interface AppProps {
  /** Start from a given state (used to resume a saved game and in tests). */
  initialState?: AppState;
}

const App: React.FC<AppProps> = ({ initialState }) => {
  const api = useGame(initialState);
  const { game, session } = api;
  const [selectedRaw, setSelectedRaw] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hintsOn, setHintsOn] = useState(true);

  const humanBoard = game.seats.human.board;
  const liveEvals = useMemo<Record<RowName, RowEval>>(
    () => ({
      front: evaluateRow(humanBoard.front, 'front'),
      mid: evaluateRow(humanBoard.mid, 'mid'),
      back: evaluateRow(humanBoard.back, 'back'),
    }),
    [humanBoard],
  );

  const turn = game.turn;
  const humanTurn = game.phase === 'placing' && turn?.seat === 'human' ? turn : null;
  const held = game.seats.human.held;
  const selectedId = selectedRaw && held.some((c) => c.id === selectedRaw) ? selectedRaw : null;

  const stagedIds = new Set(humanTurn?.placed.map((p) => p.cardId));
  const stagedDiscards = humanTurn
    ? humanTurn.dealt.filter((c) => humanTurn.discarded.includes(c.id))
    : [];
  const turnComplete =
    humanTurn !== null &&
    humanTurn.placed.length === humanTurn.need.place &&
    humanTurn.discarded.length === humanTurn.need.discard;

  const scored = game.phase === 'scored' && game.result !== null;
  const result = game.result;
  const aiHidden = game.phase === 'placing' && game.seats.ai.fantasyland > 0;

  const config = game.setup?.config ?? session.config;
  const persona = personaFor(config.difficulty);
  const handSeed = game.setup?.seed ?? '';
  const aiHasPlayed = game.seats.ai.street > 0;
  const quip =
    scored && result
      ? quipForResult(persona, result, game.fantasylandNext.ai, handSeed)
      : game.phase === 'placing' && !aiHasPlayed
        ? quipForStart(persona, handSeed)
        : null;
  // Move hints belong to the hand in progress; once it is scored the CPU reacts to the result.
  const hint =
    game.phase === 'placing' && api.aiNote && api.aiNote.handSeed === handSeed
      ? api.aiNote.text
      : null;

  const placeOrMove = (cardId: string, row: RowName) => {
    if (stagedIds.has(cardId)) api.move(cardId, row);
    else api.place(cardId, row);
    setSelectedRaw(null);
  };

  const status = ((): string => {
    if (game.phase === 'idle') return 'Choose your game and deal.';
    if (game.phase === 'scored') return 'Hand complete.';
    if (!turn) return '';
    if (turn.seat === 'ai') {
      return game.seats.ai.fantasyland > 0
        ? `${persona.name} is in Fantasyland…`
        : `${persona.name} is thinking…`;
    }
    const { place, discard } = turn.need;
    const left = place - turn.placed.length;
    const fl = game.seats.human.fantasyland > 0 ? 'Fantasyland! ' : '';
    if (left > 0) {
      return `${fl}Place ${left} card${left === 1 ? '' : 's'}${discard > 0 ? ` and discard ${discard - turn.discarded.length}` : ''}.`;
    }
    if (discard - turn.discarded.length > 0) return `${fl}Discard ${discard - turn.discarded.length}.`;
    return 'Confirm your placement, or tap a card to move it.';
  })();

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-x-hidden bg-[#061c12] font-sans selection:bg-yellow-500/30">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_#134e32_0%,_#061c12_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-gradient-to-b from-[#3d1a10] to-[#26100a] shadow-lg" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-[#3d1a10] to-[#26100a]" />

      <Header session={session} game={game} />

      <main className="relative z-10 flex w-full max-w-3xl flex-1 flex-col gap-4 px-2 py-4 sm:px-4">
        <section aria-label="CPU board" className="flex flex-col gap-2">
          <CpuBadge
            persona={persona}
            difficulty={config.difficulty}
            isDealer={game.setup?.button === 'ai'}
            thinking={api.aiThinking}
            quip={quip}
            hint={hint}
            hintsOn={hintsOn}
            onToggleHints={() => setHintsOn((on) => !on)}
          />
          <BoardView
            board={game.seats.ai.board}
            hidden={aiHidden}
            evals={scored ? result?.seats.ai.evals : undefined}
            royalties={scored ? result?.seats.ai.royalties : undefined}
            winning={
              scored && result
                ? Object.fromEntries(ROW_NAMES.map((r) => [r, result.rowResults[r] < 0]))
                : undefined
            }
            fouled={scored && !!result?.seats.ai.fouled}
          />
        </section>

        <section
          aria-live="polite"
          className="flex min-h-[11rem] flex-col items-center justify-center gap-3 py-1"
        >
          {game.phase === 'idle' && (
            <div className="ofc-pop flex w-full max-w-md flex-col items-center gap-5 rounded-[2rem] border border-white/5 bg-black/60 p-6 backdrop-blur-2xl">
              <h1 className="text-2xl font-black tracking-tight text-white">Open Face Chinese Poker</h1>
              <SettingsPanel config={session.config} onChange={api.setConfig} />
              <button
                type="button"
                onClick={api.deal}
                className="flex items-center gap-2 rounded-full bg-gradient-to-b from-[#e7c25d] to-[#d4af37] px-10 py-3 font-black text-stone-900 shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition hover:scale-105 active:scale-95"
              >
                <Play size={18} fill="currentColor" /> DEAL
              </button>
            </div>
          )}

          {scored && result && game.setup && (
            <ResultPanel
              result={result}
              session={session}
              fantasylandNext={game.fantasylandNext.human}
              handPayout={result.points.human * game.setup.config.stake}
              onDeal={api.deal}
              onConfig={api.setConfig}
            />
          )}

          {game.phase === 'placing' && (
            <>
              <div className="rounded-full border border-white/5 bg-black/40 px-4 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-stone-300">
                {status}
              </div>
              {humanTurn && (
                <>
                  <HandTray
                    held={held}
                    turn={humanTurn}
                    discarded={stagedDiscards}
                    selectedId={selectedId}
                    onSelect={(id) => setSelectedRaw((cur) => (cur === id ? null : id))}
                    onDiscard={() => {
                      if (selectedId) api.discard(selectedId);
                      setSelectedRaw(null);
                    }}
                    onUndoDiscard={api.undo}
                    onDropDiscard={api.discard}
                    onDragStateChange={setDragging}
                  />
                  <button
                    type="button"
                    onClick={api.confirm}
                    disabled={!turnComplete}
                    className="flex items-center gap-2 rounded-full bg-gradient-to-b from-[#e7c25d] to-[#d4af37] px-8 py-2.5 text-sm font-black uppercase tracking-widest text-stone-900 shadow-lg transition enabled:hover:scale-105 enabled:active:scale-95 disabled:opacity-30"
                  >
                    <Check size={18} /> Confirm
                  </button>
                </>
              )}
            </>
          )}
        </section>

        <section aria-label="Your board" className="relative pb-6">
          <div className="absolute -top-2.5 left-5 z-10 rounded-full border border-emerald-400/20 bg-[#0c2a1c] px-3 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400/70">
            You{game.setup?.button === otherSeat('ai') ? ' · D' : ''}
          </div>
          <BoardView
            board={game.seats.human.board}
            interactive={humanTurn !== null}
            highlightSlots={selectedId !== null || dragging}
            stagedIds={stagedIds}
            evals={scored && result ? result.seats.human.evals : liveEvals}
            royalties={scored ? result?.seats.human.royalties : undefined}
            winning={
              scored && result
                ? Object.fromEntries(ROW_NAMES.map((r) => [r, result.rowResults[r] > 0]))
                : undefined
            }
            fouled={scored && !!result?.seats.human.fouled}
            onSlotClick={(row) => selectedId && placeOrMove(selectedId, row)}
            onDropOnRow={placeOrMove}
            onStagedClick={api.undo}
            onDragStateChange={setDragging}
          />
        </section>
      </main>
    </div>
  );
};

export default App;
