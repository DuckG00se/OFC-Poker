import React from 'react';

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** A labelled on/off switch. */
const Toggle: React.FC<ToggleProps> = ({ label, description, checked, onChange }) => (
  <label className="flex cursor-pointer items-center justify-between gap-4 py-1.5">
    <span className="min-w-0">
      <span className="block text-sm font-bold text-stone-100">{label}</span>
      {description && <span className="block text-xs text-stone-400">{description}</span>}
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 flex-none rounded-full transition-colors ${
        checked ? 'bg-[#d4af37]' : 'bg-stone-700'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${
          checked ? 'left-[1.375rem]' : 'left-0.5'
        }`}
      />
    </button>
  </label>
);

export default Toggle;
