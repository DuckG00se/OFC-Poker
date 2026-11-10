import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import {
  createDeck,
  evaluateRow,
  rankLabel,
  replay,
  type Action,
  type Card,
  type RowName,
} from '../engine';
import type { HandRecord } from '../state/stats';
import { FlipProvider } from '../ui/flip';
import { useMotionScale } from '../ui/prefs';
import BoardView from './BoardView';
import { suitGlyph } from './Card';
import DeckPile from './DeckPile';
import Modal from './Modal';
import ResultDetails from './ResultDetails';

const ROW_WORD: Readonly<Record<RowName, string>> = { front: 'front', mid: 'middle', back: 'back' };
const CARDS = new Map<string, Card>(createDeck().map((c) => [c.id, c]));
const cardText = (id: string): string => {
  const card = CARDS.get(id);
  return card ? `${rankLabel(card.rank)}${suitGlyph(card.suit)}` : id;
};

/** The points in the log to stop at: after the deal, then after each confirmed turn. */
const frameEnds = (log: readonly Action[]): number[] => {
  const ends = [1];
  log.forEach((action, i) => {
    if (action.type === 'CONFIRM') ends.push(i + 1);
  });
  return ends;
};

/** Plain-language summary of one confirmed turn. */
const describeTurn = (actions: readonly Action[], cpuName: string): string => {
  const confirm = actions[actions.length - 1];
  if (!confirm || confirm.type !== 'CONFIRM') return 'Cards are dealt.';
  const who = confirm.seat === 'human' ? 'You' : cpuName;
  // Only what was still in place at the confirm counts (cards may have been moved or undone).
  const placed = new Map<string, RowName>();
  const discarded = new Set<string>();
  for (const a of actions) {
    if (a.type === 'PLACE' || a.type === 'MOVE') placed.set(a.cardId, a.row);
    else if (a.type === 'DISCARD') discarded.add(a.cardId);
    else if (a.type === 'UNDO') {
      placed.delete(a.cardId);
      discarded.delete(a.cardId);
    }
  }
  if (placed.size > 5) return `${who} set a Fantasyland hand.`;
  const parts = [...placed].map(([id, row]) => `${cardText(id)} ${ROW_WORD[row]}`);
  if (discarded.size > 0) parts.push(`discarded ${[...discarded].map(cardText).join(' ')}`);
  return `${who}: ${parts.join(' · ')}`;
};

const pick = <T,>(fn: (row: RowName) => T): Record<RowName, T> => ({
  front: fn('front'),
  mid: fn('mid'),
  back: fn('back'),
});

const ControlButton: React.FC<{ label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }> = ({ label, onClick, disabled, children }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    disabled={disabled}
    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-stone-200 transition enabled:hover:border-[#d4af37]/60 disabled:opacity-30"
  >
    {children}
  </button>
);

interface ReplayViewProps {
  record: HandRecord;
  cpuName: string;
  onClose: () => void;
}

/**
 * Plays a finished hand back turn by turn. Nothing is stored except the hand's seed and
 * action log: every position shown here is rebuilt by running that log through the engine.
 * Being after the fact, it shows everything, including a hidden Fantasyland board.
 */
const ReplayView: React.FC<ReplayViewProps> = ({ record, cpuName, onClose }) => {
  const motion = useMotionScale();
  const frames = useMemo(() => frameEnds(record.log), [record.log]);
  const last = frames.length - 1;
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);

  const end = frames[frame] ?? 1;
  const state = useMemo(() => replay(record.log.slice(0, end)), [record.log, end]);
  const caption = describeTurn(record.log.slice(frames[frame - 1] ?? 0, end), cpuName);
  const result = frame === last ? state.result : null;

  useEffect(() => {
    if (!playing) return;
    if (frame >= last) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => setFrame((f) => Math.min(last, f + 1)), 900);
    return () => window.clearTimeout(id);
  }, [playing, frame, last]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowRight') setFrame((f) => Math.min(last, f + 1));
      else if (e.key === 'ArrowLeft') setFrame((f) => Math.max(0, f - 1));
      else if (e.key === ' ') {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [last]);

  const boards = (['ai', 'human'] as const).map((seat) => {
    const board = state.seats[seat].board;
    const score = result?.seats[seat];
    const sign = seat === 'human' ? 1 : -1;
    return (
      <section key={seat} aria-label={seat === 'human' ? 'Replay: your board' : `Replay: ${cpuName}'s board`}>
        <h3 className="px-1 pb-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
          {seat === 'human' ? 'You' : cpuName}
          {state.seats[seat].fantasyland > 0 && <span className="ml-2 text-[#d4af37]">Fantasyland</span>}
        </h3>
        <BoardView
          board={board}
          size="replay"
          names={pick((row) => evaluateRow(board[row], row).name)}
          royalties={score?.royalties}
          rowPoints={result ? pick((row) => result.rowResults[row] * sign || 0) : undefined}
          fouled={score?.fouled}
        />
      </section>
    );
  });

  return (
    <Modal title={`Replay: hand ${record.handNo}`} onClose={onClose}>
      <FlipProvider resetKey={record.id} scale={motion}>
        <div className="flex flex-col gap-2">
          {boards[0]}
          <div className="flex items-center gap-2">
            <DeckPile remaining={52 - state.deckPos} />
            <p aria-live="polite" className="min-w-0 flex-1 rounded-xl border border-white/5 bg-black/40 px-3 py-1.5 text-center text-xs font-bold text-stone-200">
              {caption}
            </p>
          </div>
          {boards[1]}

          <div className="flex flex-col items-center gap-2 pt-1">
            <input
              type="range"
              min={0}
              max={last}
              value={frame}
              onChange={(e) => {
                setPlaying(false);
                setFrame(Number(e.target.value));
              }}
              aria-label="Position in the hand"
              className="w-full accent-[#d4af37]"
            />
            <div className="flex items-center gap-2">
              <ControlButton label="Back to the deal" onClick={() => setFrame(0)} disabled={frame === 0}>
                <SkipBack size={15} aria-hidden="true" />
              </ControlButton>
              <ControlButton label="Previous turn" onClick={() => setFrame((f) => Math.max(0, f - 1))} disabled={frame === 0}>
                <ChevronLeft size={17} aria-hidden="true" />
              </ControlButton>
              <button
                type="button"
                onClick={() => {
                  if (frame >= last) setFrame(0);
                  setPlaying((p) => !p);
                }}
                className="flex items-center gap-2 rounded-full bg-gradient-to-b from-[#e7c25d] to-[#d4af37] px-5 py-2 text-xs font-black uppercase tracking-widest text-stone-900"
              >
                {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} fill="currentColor" aria-hidden="true" />}
                {playing ? 'Pause' : 'Play'}
              </button>
              <ControlButton label="Next turn" onClick={() => setFrame((f) => Math.min(last, f + 1))} disabled={frame === last}>
                <ChevronRight size={17} aria-hidden="true" />
              </ControlButton>
              <ControlButton label="Skip to the result" onClick={() => setFrame(last)} disabled={frame === last}>
                <SkipForward size={15} aria-hidden="true" />
              </ControlButton>
            </div>
            <p className="text-[11px] font-bold tabular-nums text-stone-400">
              Turn {frame} of {last} · {record.variant} · seed {record.id}
            </p>
          </div>

          {result && (
            <div className="ofc-pop border-t border-white/5 pt-3">
              <ResultDetails result={result} cpuName={cpuName} stake={record.stake} />
            </div>
          )}
        </div>
      </FlipProvider>
    </Modal>
  );
};

export default ReplayView;
