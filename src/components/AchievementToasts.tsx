import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { achievementById } from '../state/achievements';
import { sound } from '../ui/sound';

interface AchievementToastsProps {
  /** Achievements to announce (shown once per distinct list). */
  ids: readonly string[];
  onOpen: () => void;
}

const VISIBLE_MS = 6000;

/** Brief "achievement unlocked" notes at the top of the screen. */
const AchievementToasts: React.FC<AchievementToastsProps> = ({ ids, onOpen }) => {
  const key = ids.join(',');
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    if (key === '') return;
    sound.play('achievement', 0.9);
    const id = window.setTimeout(() => setDismissed(key), VISIBLE_MS);
    return () => window.clearTimeout(id);
  }, [key]);

  if (key === '' || dismissed === key) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-[60] flex flex-col items-center gap-1.5 px-3" role="status" aria-live="polite">
      {ids.map((id) => {
        const achievement = achievementById(id);
        if (!achievement) return null;
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              setDismissed(key);
              onOpen();
            }}
            className="ofc-pop pointer-events-auto flex max-w-full items-center gap-2.5 rounded-full border border-[#d4af37]/60 bg-[#0b1f16]/95 py-1.5 pl-2 pr-4 shadow-[0_12px_30px_rgba(0,0,0,0.6)]"
          >
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[#d4af37] text-stone-900">
              <Trophy size={14} aria-hidden="true" />
            </span>
            <span className="min-w-0 text-left leading-tight">
              <span className="block text-[9px] font-black uppercase tracking-widest text-stone-400">Achievement unlocked</span>
              <span className="block truncate text-sm font-black text-[#e7c25d]">{achievement.title}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default AchievementToasts;
