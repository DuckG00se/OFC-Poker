import React from 'react';
import type { Difficulty, FantasylandMode, GameConfig, Variant } from '../engine';

const STAKES = [1, 5, 10, 25, 50];

interface OptionProps<T extends string | number> {
  label: string;
  value: T;
  options: readonly { value: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
}

function Segmented<T extends string | number>({ label, value, options, onChange }: OptionProps<T>) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1 text-[10px] font-black uppercase tracking-[0.25em] text-stone-400">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={o.value === value}
            title={o.hint}
            onClick={() => onChange(o.value)}
            className={`rounded-full border px-4 py-1.5 text-xs font-black transition ${
              o.value === value
                ? 'border-[#d4af37] bg-[#d4af37] text-stone-900'
                : 'border-white/10 bg-black/30 text-stone-300 hover:border-[#d4af37]/50'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

interface SettingsPanelProps {
  config: GameConfig;
  onChange: (patch: Partial<GameConfig>) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, onChange }) => (
  <div className="flex w-full flex-col gap-4 text-left">
    <Segmented<Variant>
      label="Variant"
      value={config.variant}
      onChange={(variant) => onChange({ variant })}
      options={[
        { value: 'classic', label: 'Classic', hint: '5 cards, then one at a time' },
        { value: 'pineapple', label: 'Pineapple', hint: 'Deal 3, place 2, discard 1' },
      ]}
    />
    <Segmented<FantasylandMode>
      label="Fantasyland"
      value={config.fantasyland}
      onChange={(fantasyland) => onChange({ fantasyland })}
      options={[
        { value: 'off', label: 'Off' },
        { value: 'flat', label: '14 cards', hint: 'QQ+ in front earns 14 cards' },
        { value: 'progressive', label: 'Progressive', hint: 'QQ 14, KK 15, AA 16, trips 17' },
      ]}
    />
    <Segmented<Difficulty>
      label="CPU level"
      value={config.difficulty}
      onChange={(difficulty) => onChange({ difficulty })}
      options={[
        { value: 'easy', label: 'Easy', hint: 'Plays by feel and makes mistakes' },
        { value: 'medium', label: 'Medium', hint: 'Simulates a few outcomes per move' },
        { value: 'hard', label: 'Hard', hint: 'Simulates many outcomes and chases Fantasyland' },
      ]}
    />
    <Segmented<number>
      label="Stake per point"
      value={config.stake}
      onChange={(stake) => onChange({ stake })}
      options={STAKES.map((s) => ({ value: s, label: `$${s}` }))}
    />
  </div>
);

export default SettingsPanel;
