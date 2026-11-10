import React, { useState } from 'react';
import type { GameConfig } from '../engine';
import { DEFAULT_PREFS, usePrefs, type CardBack, type MotionLevel } from '../ui/prefs';
import Modal from './Modal';
import SettingsPanel from './SettingsPanel';
import Toggle from './Toggle';

interface SettingsModalProps {
  config: GameConfig;
  /** Game settings can only change between hands. */
  locked: boolean;
  onConfig: (patch: Partial<GameConfig>) => void;
  onNewSession: () => void;
  /** Erase everything: bankroll, stats, history, achievements and preferences. */
  onResetAll: () => void;
  onClose: () => void;
}

const BACKS: readonly { value: CardBack; label: string; swatch: string }[] = [
  { value: 'red', label: 'Red', swatch: 'bg-red-800' },
  { value: 'blue', label: 'Blue', swatch: 'bg-blue-800' },
  { value: 'green', label: 'Green', swatch: 'bg-green-800' },
];

const MOTION: readonly { value: MotionLevel; label: string }[] = [
  { value: 'full', label: 'Normal' },
  { value: 'fast', label: 'Fast' },
  { value: 'off', label: 'Off' },
];

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="border-b border-white/5 py-3 last:border-b-0">
    <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-stone-400">{title}</h3>
    {children}
  </section>
);

const SettingsModal: React.FC<SettingsModalProps> = ({ config, locked, onConfig, onNewSession, onResetAll, onClose }) => {
  const { prefs, update, setHelper } = usePrefs();
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <Modal title="Settings" onClose={onClose}>
      <Section title="Game">
        {locked && (
          <p className="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Game settings can be changed between hands. Finish this hand first.
          </p>
        )}
        <div className={locked ? 'pointer-events-none opacity-40' : ''} aria-disabled={locked}>
          <SettingsPanel config={config} onChange={onConfig} />
        </div>
      </Section>

      <Section title="Sound and motion">
        <Toggle label="Sound effects" checked={prefs.sound} onChange={(sound) => update({ sound })} />
        <Toggle
          label="Vibration"
          description="Subtle feedback on phones that support it"
          checked={prefs.haptics}
          onChange={(haptics) => update({ haptics })}
        />
        <div className="flex items-center justify-between gap-4 py-1.5">
          <span className="text-sm font-bold text-stone-100">Animation</span>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Animation speed">
            {MOTION.map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={prefs.motion === m.value}
                onClick={() => update({ motion: m.value })}
                className={`rounded-full border px-3 py-1 text-xs font-black transition ${
                  prefs.motion === m.value
                    ? 'border-[#d4af37] bg-[#d4af37] text-stone-900'
                    : 'border-white/10 text-stone-300 hover:border-[#d4af37]/50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Deck style">
        <Toggle
          label="Four-colour deck"
          description="Clubs green and diamonds blue: easier to tell suits apart"
          checked={prefs.fourColorDeck}
          onChange={(fourColorDeck) => update({ fourColorDeck })}
        />
        <div className="flex items-center justify-between gap-4 py-1.5">
          <span className="text-sm font-bold text-stone-100">Card backs</span>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Card back colour">
            {BACKS.map((b) => (
              <button
                key={b.value}
                type="button"
                role="radio"
                aria-checked={prefs.cardBack === b.value}
                aria-label={b.label}
                title={b.label}
                onClick={() => update({ cardBack: b.value })}
                className={`h-8 w-8 rounded-lg border-2 transition ${b.swatch} ${
                  prefs.cardBack === b.value ? 'border-[#d4af37] ring-2 ring-[#d4af37]/40' : 'border-white/15'
                }`}
              />
            ))}
          </div>
        </div>
      </Section>

      <Section title="Helpers">
        <Toggle label="Hand names" description="What each row currently makes" checked={prefs.helpers.handNames} onChange={(v) => setHelper('handNames', v)} />
        <Toggle label="Foul warning" description="Risk estimate, and a warning when a foul is certain" checked={prefs.helpers.foulWarning} onChange={(v) => setHelper('foulWarning', v)} />
        <Toggle label="Outs" description="Live cards that complete a draw" checked={prefs.helpers.outs} onChange={(v) => setHelper('outs', v)} />
        <Toggle label="Royalty preview" description="Royalties you have locked in so far" checked={prefs.helpers.royalties} onChange={(v) => setHelper('royalties', v)} />
        <Toggle label="Cards remaining" description="Tracker of live and dead cards" checked={prefs.helpers.tracker} onChange={(v) => setHelper('tracker', v)} />
        <Toggle label="CPU move reasons" description="A short explanation of some CPU moves" checked={prefs.cpuHints} onChange={(cpuHints) => update({ cpuHints })} />
      </Section>

      <Section title="Your data">
        <p className="mb-2 text-xs text-stone-400">
          Your bankroll, settings, stats, history and any hand in progress are saved on this
          device only.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              onNewSession();
              onClose();
            }}
            className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-stone-200 transition hover:border-[#d4af37]/50"
          >
            New session (reset bankroll)
          </button>
          <button
            type="button"
            onClick={() => {
              if (!confirmReset) {
                setConfirmReset(true);
                return;
              }
              onResetAll();
              update(DEFAULT_PREFS);
              onClose();
            }}
            className={`rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-wider transition ${
              confirmReset
                ? 'border-rose-400 bg-rose-600 text-white'
                : 'border-rose-400/40 text-rose-300 hover:bg-rose-500/15'
            }`}
          >
            {confirmReset ? 'Tap again to erase everything' : 'Erase all data'}
          </button>
        </div>
      </Section>
    </Modal>
  );
};

export default SettingsModal;
