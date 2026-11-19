import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  BACK_ROYALTIES,
  FRONT_PAIR_MIN_RANK,
  HAND_NAMES,
  HandCategory,
  MID_ROYALTIES,
  ROYAL_FLUSH_ROYALTY,
  frontPairRoyalty,
  frontTripsRoyalty,
  rankLabel,
} from '../../engine';
import { COPY } from '../../content/rules';

const ORDER: readonly HandCategory[] = [
  HandCategory.HighCard,
  HandCategory.Pair,
  HandCategory.TwoPair,
  HandCategory.Trips,
  HandCategory.Straight,
  HandCategory.Flush,
  HandCategory.FullHouse,
  HandCategory.Quads,
  HandCategory.StraightFlush,
];
const PAYING: readonly HandCategory[] = [
  HandCategory.Trips,
  HandCategory.Straight,
  HandCategory.Flush,
  HandCategory.FullHouse,
  HandCategory.Quads,
  HandCategory.StraightFlush,
];

type Tab = 'order' | 'hands' | 'royalties';
const TABS: readonly { id: Tab; label: string }[] = [
  { id: 'order', label: 'Row order' },
  { id: 'hands', label: 'Hands' },
  { id: 'royalties', label: 'Royalties' },
];

const OrderTab: React.FC = () => (
  <div className="flex flex-col gap-1.5">
    <p className="text-sm font-black text-white">Back ≥ Middle ≥ Front</p>
    <p className="leading-snug text-stone-300">
      Your back row must be at least as strong as your middle row, and your middle at least as strong as your front.
    </p>
    <p className="leading-snug text-stone-300">
      Break it and your board <b className="text-rose-300">fouls</b> and loses the hand. {COPY.rule.equalNote}
    </p>
  </div>
);

const HandsTab: React.FC = () => (
  <div>
    <p className="mb-1 text-stone-400">Weakest to strongest:</p>
    <ol className="flex flex-wrap gap-1">
      {ORDER.map((c, i) => (
        <li key={c} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 leading-tight">
          <span className="mr-1 text-stone-400">{i + 1}</span>
          {HAND_NAMES[c]}
        </li>
      ))}
    </ol>
    <p className="mt-1.5 text-stone-400">{COPY.rankings.frontNote}</p>
  </div>
);

const RoyaltiesTab: React.FC = () => (
  <div>
    <table className="w-full">
      <caption className="sr-only">Royalty points by row</caption>
      <thead>
        <tr className="text-[10px] font-black uppercase tracking-widest text-stone-400">
          <th scope="col" className="pb-0.5 text-left">Hand</th>
          <th scope="col" className="pb-0.5 text-right">Mid</th>
          <th scope="col" className="pb-0.5 text-right">Back</th>
        </tr>
      </thead>
      <tbody>
        {PAYING.map((c) => (
          <tr key={c} className="border-t border-white/5">
            <td className="py-px">{HAND_NAMES[c]}</td>
            <td className="py-px text-right font-black text-[#e7c25d]">{MID_ROYALTIES[c] ?? '–'}</td>
            <td className="py-px text-right font-black text-[#e7c25d]">{BACK_ROYALTIES[c] ?? '–'}</td>
          </tr>
        ))}
        <tr className="border-t border-white/5">
          <td className="py-px">{COPY.royalties.royalFlush}</td>
          <td className="py-px text-right font-black text-[#e7c25d]">{ROYAL_FLUSH_ROYALTY.mid}</td>
          <td className="py-px text-right font-black text-[#e7c25d]">{ROYAL_FLUSH_ROYALTY.back}</td>
        </tr>
      </tbody>
    </table>
    <p className="mt-1.5 leading-snug">
      <b className="text-white">Front row:</b> a pair of {rankLabel(FRONT_PAIR_MIN_RANK)}s pays {frontPairRoyalty(FRONT_PAIR_MIN_RANK)}, up to
      aces ({frontPairRoyalty(14)}). Three of a kind pays {frontTripsRoyalty(2)} to {frontTripsRoyalty(14)}.
    </p>
  </div>
);

interface QuickRefProps {
  onClose: () => void;
}

/**
 * A cheat sheet that floats over the opponent's board without pausing the game or taking
 * focus. It is deliberately short (tabs, and capped in height) so it never covers your hand
 * or the Undo and Confirm buttons. Everything is read from the engine.
 */
const QuickRef: React.FC<QuickRefProps> = ({ onClose }) => {
  const [tab, setTab] = useState<Tab>('order');
  return (
    <aside
      id="quick-ref"
      aria-label="Quick reference"
      className="ofc-pop fixed left-1/2 top-14 z-40 flex max-h-[min(34dvh,20rem)] w-[min(94vw,24rem)] -translate-x-1/2 flex-col rounded-2xl border border-[#d4af37]/40 bg-[#0b1f16] p-2.5 text-xs text-stone-200 shadow-[0_18px_40px_rgba(0,0,0,0.6)]"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div role="tablist" aria-label="Quick reference sections" className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider transition ${
                tab === t.id ? 'border-[#d4af37] bg-[#d4af37] text-stone-900' : 'border-white/10 text-stone-300 hover:border-[#d4af37]/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick reference"
          className="rounded-full p-1 text-stone-400 transition hover:bg-white/10 hover:text-white"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
      <div role="tabpanel" className="min-h-0 overflow-y-auto pr-0.5">
        {tab === 'order' && <OrderTab />}
        {tab === 'hands' && <HandsTab />}
        {tab === 'royalties' && <RoyaltiesTab />}
      </div>
    </aside>
  );
};

export default QuickRef;
