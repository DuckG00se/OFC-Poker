import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, GraduationCap, Play, Zap } from 'lucide-react';
import { INTRO, INTRO_UI, WELCOME } from '../../content/onboarding';
import { COPY } from '../../content/rules';
import { WORKED, FOULED_BOARD, LEGAL_BOARD } from './examples';
import MiniBoard from './MiniBoard';

interface WelcomeProps {
  /** "I know how to play". */
  onKnow: () => void;
  /** The intro is finished (or skipped): start the guided first hand. */
  onStartGuided: () => void;
}

const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

/** The picture that goes with each intro slide, drawn with the game's own cards. */
const Picture: React.FC<{ id: (typeof INTRO)[number]['id'] }> = ({ id }) => {
  if (id === 'goal') return <MiniBoard board={LEGAL_BOARD} title="Your board" tone="good" />;
  if (id === 'rule') {
    return (
      <div className="grid gap-2">
        <MiniBoard board={LEGAL_BOARD} title={COPY.rule.goodLabel} tone="good" />
        <MiniBoard board={FOULED_BOARD} title={COPY.rule.badLabel} tone="bad" flagged={['front', 'mid']} />
      </div>
    );
  }
  if (id === 'play') {
    return (
      <ol className="flex flex-col gap-2 text-sm text-stone-200" aria-label="The three steps of a turn">
        {['Tap a card', 'Tap a row (or drag the card there)', 'Press Confirm'].map((text, i) => (
          <li key={text} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[#d4af37] text-sm font-black text-stone-900">{i + 1}</span>
            {text}
          </li>
        ))}
      </ol>
    );
  }
  const { score } = WORKED;
  const rows = Object.values(score.rowResults).reduce<number>((n, r) => n + r, 0);
  const royalty = score.seats.human.royaltyTotal - score.seats.ai.royaltyTotal;
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-stone-200">
      <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-stone-400">Example</p>
      <p className="font-bold">
        Rows {signed(rows)} · Royalties {signed(royalty)}
      </p>
      <p className="mt-1 text-2xl font-black text-emerald-300">{signed(score.points.human)} points</p>
    </div>
  );
};

/**
 * The first-launch screen: "learn in 60 seconds" or "I know how to play". The intro is four
 * short slides with pictures; every slide can be skipped.
 */
const Welcome: React.FC<WelcomeProps> = ({ onKnow, onStartGuided }) => {
  const [slide, setSlide] = useState<number | null>(null);

  if (slide === null) {
    return (
      <main className="relative z-10 flex w-full max-w-md flex-1 flex-col items-center justify-center px-3 py-6">
        <div className="ofc-pop flex w-full flex-col items-center gap-5 rounded-[2rem] border border-[#d4af37]/15 bg-black/55 p-6 text-center shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">{WELCOME.title}</h1>
            <div className="mx-auto mt-2 h-0.5 w-24 rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
            <p className="mt-3 text-sm text-stone-300">{WELCOME.tagline}</p>
          </div>
          <button
            type="button"
            onClick={() => setSlide(0)}
            autoFocus
            className="flex w-full flex-col items-center gap-0.5 rounded-2xl bg-gradient-to-b from-[#e7c25d] to-[#d4af37] px-5 py-3.5 text-stone-900 shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="flex items-center gap-2 text-base font-black">
              <GraduationCap size={18} aria-hidden="true" /> {WELCOME.learn}
            </span>
            <span className="text-xs font-bold text-stone-800">{WELCOME.learnNote}</span>
          </button>
          <button
            type="button"
            onClick={onKnow}
            className="flex w-full flex-col items-center gap-0.5 rounded-2xl border border-white/15 px-5 py-3 text-stone-100 transition hover:border-[#d4af37]/60"
          >
            <span className="flex items-center gap-2 text-base font-black">
              <Zap size={17} aria-hidden="true" /> {WELCOME.know}
            </span>
            <span className="text-xs text-stone-400">{WELCOME.knowNote}</span>
          </button>
        </div>
      </main>
    );
  }

  const current = INTRO[slide];
  if (!current) return null;
  const last = slide === INTRO.length - 1;
  return (
    <main className="relative z-10 flex w-full max-w-md flex-1 flex-col items-center justify-center px-3 py-4">
      <h1 className="sr-only">Open Face Chinese Poker: introduction</h1>
      <section aria-label="Introduction" className="ofc-pop flex w-full flex-col gap-4 rounded-[2rem] border border-[#d4af37]/15 bg-black/55 p-5 shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">{INTRO_UI.progress(slide + 1, INTRO.length)}</span>
          <button type="button" onClick={onStartGuided} className="text-[11px] font-black uppercase tracking-wider text-stone-400 transition hover:text-stone-200">
            {INTRO_UI.skip}
          </button>
        </div>
        <div key={current.id} className="ofc-fade flex flex-col gap-3">
          <h2 className="text-xl font-black text-white">{current.title}</h2>
          <div className="cards-guide">
            <Picture id={current.id} />
          </div>
          {current.body.map((line) => (
            <p key={line} className="text-sm leading-relaxed text-stone-300">
              {line}
            </p>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setSlide(slide - 1)}
            disabled={slide === 0}
            className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-stone-300 transition enabled:hover:border-[#d4af37]/50 disabled:opacity-30"
          >
            <ArrowLeft size={14} aria-hidden="true" /> {INTRO_UI.back}
          </button>
          <div className="flex gap-1.5" aria-hidden="true">
            {INTRO.map((s, i) => (
              <span key={s.id} className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-5 bg-[#d4af37]' : 'w-1.5 bg-white/20'}`} />
            ))}
          </div>
          {last ? (
            <button
              type="button"
              onClick={onStartGuided}
              autoFocus
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#e7c25d] to-[#d4af37] px-4 py-2 text-xs font-black uppercase tracking-wider text-stone-900"
            >
              <Play size={13} fill="currentColor" aria-hidden="true" /> {INTRO_UI.start}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSlide(slide + 1)}
              autoFocus
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#e7c25d] to-[#d4af37] px-4 py-2 text-xs font-black uppercase tracking-wider text-stone-900"
            >
              {INTRO_UI.next} <ArrowRight size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </section>
    </main>
  );
};

export default Welcome;
