import React, { useMemo, useState } from 'react';
import { Check, Sparkles, Undo2 } from 'lucide-react';
import { personaFor, quipForResult, quipForStart } from '../ai';
import {
  ROW_NAMES,
  boardCount,
  evaluateRow,
  rowOuts,
  royaltyPreview,
  viewFor,
  type RowName,
  type RowOuts,
} from '../engine';
import type { GameApi } from '../state/useGame';
import { useMotionScale, usePrefs } from '../ui/prefs';
import { useFoulRisk } from '../ui/useFoulRisk';
import { revealPlan, useGameFeedback } from '../ui/useGameFeedback';
import { useKeyboard } from '../ui/useKeyboard';
import { usePointerDrag } from '../ui/usePointerDrag';
import { useCountUp, useScoreReveal } from '../ui/useScoreReveal';
import { useTurnInteraction } from '../ui/useTurnInteraction';
import BoardView from './BoardView';
import CardTracker from './CardTracker';
import CpuBadge from './CpuBadge';
import DeckPile from './DeckPile';
import FoulChip from './FoulChip';
import HandTray from './HandTray';
import Header from './Header';
import Modal from './Modal';
import ResultDetails from './ResultDetails';
import ScoreStrip from './ScoreStrip';
import SettingsModal from './SettingsModal';
import StartScreen from './StartScreen';

const REVEAL_STEP_MS = 650;
type Dialog = 'settings' | 'tracker' | 'details' | null;

const pickRows = <T,>(fn: (row: RowName) => T): Record<RowName, T> => ({
  front: fn('front'),
  mid: fn('mid'),
  back: fn('back'),
});

/** The whole play screen. All game rules live in the engine; this only arranges and wires. */
const Table: React.FC<{ api: GameApi }> = ({ api }) => {
  const { game, session } = api;
  const { prefs, update } = usePrefs();
  const motion = useMotionScale();
  const [dialog, setDialog] = useState<Dialog>(null);

  const ix = useTurnInteraction(game, api);
  const drag = usePointerDrag(ix.drop);

  const config = game.setup?.config ?? session.config;
  const persona = personaFor(config.difficulty);
  const seed = game.setup?.seed ?? '';
  const result = game.result;
  const scored = game.phase === 'scored' && result !== null;
  const plan = useMemo(() => revealPlan(result), [result]);
  const reveal = useScoreReveal(scored ? seed : null, plan.total, REVEAL_STEP_MS * motion);
  useGameFeedback(game, { sound: prefs.sound, haptics: prefs.haptics, stage: reveal.stage, plan });

  const view = useMemo(() => viewFor(game, 'human'), [game]);
  const foulRisk = useFoulRisk(game, prefs.helpers.foulWarning);
  const humanBoard = game.seats.human.board;
  const aiBoard = game.seats.ai.board;

  // ---- Helpers for the player's board (live while playing, exact once scored). ----
  const liveNames = useMemo(() => pickRows((row) => evaluateRow(humanBoard[row], row).name), [humanBoard]);
  const preview = useMemo(() => royaltyPreview(humanBoard), [humanBoard]);
  const outs = useMemo<Record<RowName, readonly RowOuts[]>>(
    () => pickRows((row) => rowOuts(humanBoard, row, view.unseen, config.fantasyland)),
    [humanBoard, view.unseen, config.fantasyland],
  );
  const previewTotal = preview.front + preview.mid + preview.back;

  const rowsRevealed = Math.min(reveal.stage, plan.rows);
  const revealedRows = ROW_NAMES.slice(0, rowsRevealed);
  const bonusesShown = plan.bonuses !== null ? reveal.stage >= plan.bonuses : reveal.done;
  const humanRowPoints = scored && result
    ? Object.fromEntries(revealedRows.map((row) => [row, result.rowResults[row]]))
    : undefined;
  const aiRowPoints = scored && result
    ? Object.fromEntries(revealedRows.map((row) => [row, -result.rowResults[row] || 0]))
    : undefined;

  const humanNames = scored && result
    ? pickRows((row) => result.seats.human.evals[row].name)
    : prefs.helpers.handNames
      ? liveNames
      : undefined;
  const humanRoyalties = scored && result
    ? bonusesShown
      ? result.seats.human.royalties
      : undefined
    : prefs.helpers.royalties
      ? preview
      : undefined;

  // ---- The opponent. ----
  const aiHidden = game.phase === 'placing' && game.seats.ai.fantasyland > 0;
  const aiHasPlayed = game.seats.ai.street > 0;
  const quip =
    scored && result
      ? reveal.done
        ? quipForResult(persona, result, game.fantasylandNext.ai, seed)
        : null
      : game.phase === 'placing' && !aiHasPlayed
        ? quipForStart(persona, seed)
        : null;
  const hint =
    prefs.cpuHints && game.phase === 'placing' && api.aiNote?.handSeed === seed
      ? api.aiNote.text
      : null;

  // ---- Money: hold the old bankroll until the reveal is over, then count to the new one. ----
  const payout = scored && result ? result.points.human * config.stake : 0;
  const bankroll = useCountUp(
    scored && !reveal.done ? session.bankroll - payout : session.bankroll,
    700 * motion,
  );

  const status = ((): string => {
    if (ix.notice) return ix.notice;
    if (scored) return reveal.done ? 'Hand complete' : 'Scoring…';
    const turn = game.turn;
    if (!turn) return '';
    if (turn.seat === 'ai') {
      return game.seats.ai.fantasyland > 0
        ? `${persona.name} is setting a Fantasyland hand…`
        : `${persona.name} is thinking…`;
    }
    const fl = game.seats.human.fantasyland > 0 ? 'Fantasyland! ' : '';
    if (ix.placesLeft > 0) {
      return `${fl}Place ${ix.placesLeft} card${ix.placesLeft === 1 ? '' : 's'}${
        ix.discardsLeft > 0 ? ` and discard ${ix.discardsLeft}` : ''
      }`;
    }
    if (ix.discardsLeft > 0) return `${fl}Discard ${ix.discardsLeft}`;
    return 'Confirm, or take a card back';
  })();

  useKeyboard({
    onRow: (row) => {
      if (!ix.turn) return;
      ix.placeOn(row, ix.selectedId ?? ix.held[0]?.id);
    },
    onEnter: () => {
      if (game.phase === 'idle') api.deal();
      else if (scored) {
        if (reveal.done) api.deal();
        else reveal.skip();
      } else if (ix.turn) ix.confirm();
    },
    onDiscard: () => {
      if (ix.turn) ix.discard(ix.selectedId ?? undefined);
    },
    onUndo: ix.undoLast,
    onCycle: ix.cycle,
    onEscape: ix.clearSelection,
  });

  const handNo = game.phase === 'scored' ? session.handNo - 1 : session.handNo;
  const highlightSlots = ix.turn !== null && ix.placesLeft > 0 && (ix.selectedId !== null || drag.dragId !== null);

  return (
    <div className="relative flex min-h-dvh flex-col items-center overflow-x-hidden bg-[#061c12] font-sans selection:bg-yellow-500/30">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#14553a_0%,_#0a2c1e_45%,_#061c12_80%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-b from-[#4a2014] to-[#26100a]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-t from-[#4a2014] to-[#26100a]" />

      <Header
        bankroll={bankroll}
        stake={config.stake}
        handNo={Math.max(1, handNo)}
        variant={config.variant}
        soundOn={prefs.sound}
        showTracker={prefs.helpers.tracker && game.phase !== 'idle'}
        onToggleSound={() => update({ sound: !prefs.sound })}
        onOpenTracker={() => setDialog('tracker')}
        onOpenSettings={() => setDialog('settings')}
      />

      {game.phase === 'idle' ? (
        <StartScreen config={session.config} onConfig={api.setConfig} onDeal={api.deal} />
      ) : (
        <main className="ofc-table relative z-10 flex-1 px-1.5 pb-2.5 pt-1.5 sm:px-4">
          <h1 className="sr-only">Open Face Chinese Poker: hand {Math.max(1, handNo)}</h1>
          <section aria-label={`${persona.name}'s board`} className="ofc-area-cpu flex flex-col gap-1">
            <CpuBadge
              persona={persona}
              difficulty={config.difficulty}
              isDealer={game.setup?.button === 'ai'}
              thinking={api.aiThinking}
              fantasyland={game.seats.ai.fantasyland > 0}
              quip={quip}
              hint={hint}
            />
            <BoardView
              board={aiBoard}
              size="cpu"
              hidden={aiHidden}
              staggerReveal={game.seats.ai.fantasyland > 0}
              names={scored && result ? pickRows((row) => result.seats.ai.evals[row].name) : undefined}
              royalties={scored && result && bonusesShown ? result.seats.ai.royalties : undefined}
              rowPoints={aiRowPoints}
              fouled={scored && reveal.stage >= 1 && !!result?.seats.ai.fouled}
            />
          </section>

          <section className="ofc-area-center flex items-center justify-center">
            <div
              className="ofc-center-inner flex flex-col items-center justify-center gap-1.5"
              style={{ minHeight: 'calc(var(--card-human) * 1.4 + 5.6rem)' }}
            >
            <div className="flex w-full items-center gap-2">
              <DeckPile remaining={52 - game.deckPos} />
              <p
                role="status"
                aria-live="polite"
                className={`min-w-0 flex-1 truncate rounded-full border px-3 py-1 text-center text-[11px] font-black uppercase tracking-[0.14em] ${
                  ix.notice
                    ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                    : 'border-white/5 bg-black/40 text-stone-300'
                }`}
              >
                {status}
              </p>
              <div className="cards-deck flex-none" aria-hidden="true">
                <div className="ofc-slot opacity-0" />
              </div>
            </div>

            {ix.turn && (
              <>
                <HandTray
                  held={ix.held}
                  dealtCount={ix.turn.dealt.length}
                  selectedId={ix.selectedId}
                  discardNeed={ix.turn.need.discard}
                  discarded={ix.stagedDiscards}
                  onSelect={ix.select}
                  onDiscardSelected={() => ix.discard()}
                  onUndoDiscard={ix.undo}
                  dragBind={drag.bind}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={ix.undoLast}
                    disabled={!ix.canUndo}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs font-black uppercase tracking-wider text-stone-300 transition enabled:hover:border-[#d4af37]/50 disabled:opacity-30"
                  >
                    <Undo2 size={14} aria-hidden="true" /> Undo
                  </button>
                  <button
                    type="button"
                    onClick={ix.confirm}
                    aria-disabled={!ix.complete}
                    className={`flex items-center gap-2 rounded-full bg-gradient-to-b from-[#e7c25d] to-[#d4af37] px-7 py-2 text-sm font-black uppercase tracking-widest text-stone-900 shadow-lg transition ${
                      ix.complete ? 'hover:scale-105 active:scale-95' : 'opacity-35'
                    }`}
                  >
                    <Check size={16} aria-hidden="true" /> Confirm
                  </button>
                </div>
                <p className="ofc-kbd-hint whitespace-nowrap text-[10px] font-bold tracking-wide text-stone-400">
                  1 2 3 place · ← → pick{ix.turn.need.discard > 0 ? ' · D discard' : ''} · ⌫ undo · Enter confirm
                </p>
              </>
            )}

            {scored && result && (
              <ScoreStrip
                result={result}
                stage={reveal.stage}
                plan={plan}
                done={reveal.done}
                stake={config.stake}
                cpuName={persona.name}
                fantasylandNext={game.fantasylandNext.human}
                cpuFantasylandNext={game.fantasylandNext.ai}
                countMs={450 * motion}
                onNext={api.deal}
                onSkip={reveal.skip}
                onDetails={() => setDialog('details')}
              />
            )}
            </div>
            {prefs.helpers.tracker && (
              <aside aria-label="Cards remaining" className="ofc-tracker-dock rounded-2xl border border-white/5 bg-black/40 p-2.5">
                <CardTracker unseen={view.unseen} compact />
              </aside>
            )}
          </section>

          <section aria-label="Your board" className="ofc-area-you flex flex-col gap-1">
            <div className="flex min-h-[1.25rem] flex-wrap items-center justify-between gap-x-2 gap-y-1 px-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400/80">You</span>
                {game.setup?.button === 'human' && (
                  <span className="rounded-full border border-white/10 px-1.5 text-[9px] font-black uppercase tracking-widest text-stone-400">
                    Dealer
                  </span>
                )}
                {game.seats.human.fantasyland > 0 && (
                  <span className="flex items-center gap-1 rounded-full border border-[#d4af37]/40 px-1.5 text-[9px] font-black uppercase tracking-widest text-[#d4af37]">
                    <Sparkles size={9} aria-hidden="true" /> Fantasyland
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {!scored && prefs.helpers.royalties && previewTotal > 0 && (
                  <span
                    title="Royalties locked in so far, if the board does not foul"
                    className="rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#e7c25d]"
                  >
                    Royalties +{previewTotal}
                  </span>
                )}
                {/* On an empty board the estimate is just the base rate: not worth a warning. */}
                {!scored && prefs.helpers.foulWarning && boardCount(humanBoard) > 0 && (
                  <FoulChip risk={foulRisk} />
                )}
              </div>
            </div>
            <BoardView
              board={humanBoard}
              size="human"
              interactive={ix.turn !== null}
              highlightSlots={highlightSlots}
              stagedIds={ix.stagedIds}
              names={humanNames}
              royalties={humanRoyalties}
              outs={!scored && prefs.helpers.outs ? outs : undefined}
              rowPoints={humanRowPoints}
              fouled={scored && reveal.stage >= 1 && !!result?.seats.human.fouled}
              onSlotClick={(row) => ix.placeOn(row)}
              onStagedClick={ix.undo}
              dragBind={drag.bind}
            />
          </section>
        </main>
      )}

      {dialog === 'settings' && (
        <SettingsModal
          config={session.config}
          locked={game.phase === 'placing'}
          onConfig={api.setConfig}
          onNewSession={api.newSession}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'tracker' && (
        <Modal title="Cards remaining" onClose={() => setDialog(null)}>
          <CardTracker unseen={view.unseen} />
        </Modal>
      )}
      {dialog === 'details' && result && (
        <Modal title="Hand result" onClose={() => setDialog(null)}>
          <ResultDetails result={result} cpuName={persona.name} stake={config.stake} />
        </Modal>
      )}
    </div>
  );
};

export default Table;
