import React from 'react';
import { HandCategory, rankLabel, rowRoyalty, type RowEval, type RowName } from '../engine';
import Modal from './Modal';

/** A bare evaluation, just enough to ask the engine what a hand pays. */
const made = (category: HandCategory, rank = 0, royal = false): RowEval => ({
  category,
  tiebreak: [rank],
  name: '',
  isRoyalFlush: royal,
});
const pays = (row: RowName, category: HandCategory, rank = 0, royal = false): number =>
  rowRoyalty(made(category, rank, royal), row);

const FIVE_CARD: readonly { name: string; category: HandCategory; royal?: boolean }[] = [
  { name: 'Three of a kind', category: HandCategory.Trips },
  { name: 'Straight', category: HandCategory.Straight },
  { name: 'Flush', category: HandCategory.Flush },
  { name: 'Full house', category: HandCategory.FullHouse },
  { name: 'Four of a kind', category: HandCategory.Quads },
  { name: 'Straight flush', category: HandCategory.StraightFlush },
  { name: 'Royal flush', category: HandCategory.StraightFlush, royal: true },
];

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="border-b border-white/5 py-3 last:border-b-0">
    <h3 className="mb-1.5 text-xs font-black uppercase tracking-[0.2em] text-[#d4af37]">{title}</h3>
    <div className="flex flex-col gap-1.5 text-sm leading-relaxed text-stone-300">{children}</div>
  </section>
);

const Th: React.FC<{ children: React.ReactNode; right?: boolean }> = ({ children, right }) => (
  <th scope="col" className={`pb-1 text-[10px] font-black uppercase tracking-widest text-stone-400 ${right ? 'text-right' : 'text-left'}`}>
    {children}
  </th>
);

/**
 * The rules and royalty reference. Royalty values are asked of the engine rather than typed
 * in here, so this page cannot drift from what the game actually pays.
 */
const RulesModal: React.FC<{ onClose: () => void; onStartTutorial?: () => void }> = ({ onClose, onStartTutorial }) => (
  <Modal title="Rules and royalties" onClose={onClose}>
    <Section title="The goal">
      <p>
        Build three poker rows from 13 cards: <b>Front</b> (3 cards), <b>Middle</b> (5) and{' '}
        <b>Back</b> (5). Cards are placed face up and cannot be moved once you confirm.
      </p>
      <p>
        <b>The one rule:</b> the back must be at least as strong as the middle, and the middle at
        least as strong as the front. Break it and your board <b className="text-rose-300">fouls</b>.
      </p>
    </Section>

    <Section title="Dealing">
      <p><b>Classic:</b> 5 cards to start, then one card at a time.</p>
      <p><b>Pineapple:</b> 5 cards to start, then 3 at a time: place 2, discard 1.</p>
      <p>Players take turns. The dealer acts last, and the deal alternates each hand.</p>
    </Section>

    <Section title="Scoring">
      <p>Each of your rows is compared with the same row of your opponent.</p>
      <ul className="list-disc pl-5">
        <li><b>+1</b> for each row you win, nothing for a tie.</li>
        <li><b>+3 scoop</b> bonus for winning all three.</li>
        <li>
          <b>Foul:</b> you lose a full scoop (6 points) and earn no royalties. If both boards
          foul, nothing changes hands.
        </li>
        <li>Royalties (below) are added on top, for both players.</li>
      </ul>
      <p>You win or lose your net points × the stake per point.</p>
    </Section>

    <Section title="Royalties: front row">
      <table className="w-full text-sm">
        <thead>
          <tr><Th>Hand</Th><Th right>Points</Th></tr>
        </thead>
        <tbody>
          {[6, 7, 8, 9, 10, 11, 12, 13, 14].map((rank) => (
            <tr key={rank} className="border-t border-white/5">
              <td className="py-0.5">
                Pair of {rankLabel(rank)}s{rank >= 12 && <span className="ml-1.5 text-[10px] font-black uppercase text-[#d4af37]">Fantasyland</span>}
              </td>
              <td className="py-0.5 text-right font-black text-[#e7c25d]">{pays('front', HandCategory.Pair, rank)}</td>
            </tr>
          ))}
          <tr className="border-t border-white/5">
            <td className="py-0.5">Three of a kind, 2s up to Aces <span className="ml-1.5 text-[10px] font-black uppercase text-[#d4af37]">Fantasyland</span></td>
            <td className="py-0.5 text-right font-black text-[#e7c25d]">
              {pays('front', HandCategory.Trips, 2)} to {pays('front', HandCategory.Trips, 14)}
            </td>
          </tr>
        </tbody>
      </table>
    </Section>

    <Section title="Royalties: middle and back rows">
      <table className="w-full text-sm">
        <thead>
          <tr><Th>Hand</Th><Th right>Middle</Th><Th right>Back</Th></tr>
        </thead>
        <tbody>
          {FIVE_CARD.map((hand) => (
            <tr key={hand.name} className="border-t border-white/5">
              <td className="py-0.5">{hand.name}</td>
              <td className="py-0.5 text-right font-black text-[#e7c25d]">{pays('mid', hand.category, 14, hand.royal) || '–'}</td>
              <td className="py-0.5 text-right font-black text-[#e7c25d]">{pays('back', hand.category, 14, hand.royal) || '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-stone-400">The middle row pays double because strong hands are harder to make there.</p>
    </Section>

    <Section title="Fantasyland">
      <p>
        Finish a legal board with <b>a pair of queens or better in front</b> and your next hand is
        a Fantasyland hand: you get all your cards at once (14, or 14 to 17 in progressive mode:
        QQ 14, KK 15, AA 16, trips 17), set 13 of them in private, and discard the rest.
      </p>
      <p>
        <b>Stay</b> in Fantasyland with three of a kind in front, a full house or better in the
        middle, or four of a kind or better in back.
      </p>
    </Section>

    <Section title="Controls">
      <p>Tap a card, then a row. Or drag it. Placed cards can be moved until you confirm.</p>
      <p className="text-xs text-stone-400">
        Keyboard: 1 2 3 place on front / middle / back · ← → pick a card · D discard · Backspace
        undo · Enter confirm.
      </p>
    </Section>

    {onStartTutorial && (
      <div className="pt-3">
        <button
          type="button"
          onClick={onStartTutorial}
          className="rounded-full border border-[#d4af37]/50 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-[#e7c25d] transition hover:bg-[#d4af37]/10"
        >
          Take the guided hand
        </button>
      </div>
    )}
  </Modal>
);

export default RulesModal;
