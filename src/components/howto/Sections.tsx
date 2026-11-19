import React from 'react';
import {
  BACK_ROYALTIES,
  FANTASYLAND,
  FRONT_PAIR_MIN_RANK,
  HAND_NAMES,
  HandCategory,
  MID_ROYALTIES,
  ROW_NAMES,
  ROYAL_FLUSH_ROYALTY,
  evaluateRow,
  frontPairRoyalty,
  frontTripsRoyalty,
  rankLabel,
  type RowName,
} from '../../engine';
import { COPY, progressiveRows } from '../../content/rules';
import Card from '../Card';
import { FOULED_BOARD, LEGAL_BOARD, RANKING_EXAMPLES, WORKED } from './examples';
import MiniBoard from './MiniBoard';

const ROW_LABEL: Readonly<Record<RowName, string>> = { front: 'Front', mid: 'Middle', back: 'Back' };
const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

export const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section id={`howto-${id}`} aria-labelledby={`howto-${id}-h`} className="scroll-mt-2 border-b border-white/5 py-4 last:border-b-0">
    <h3 id={`howto-${id}-h`} className="mb-2 text-sm font-black uppercase tracking-[0.18em] text-[#d4af37]">
      {title}
    </h3>
    <div className="flex flex-col gap-2.5 text-sm leading-relaxed text-stone-300">{children}</div>
  </section>
);

const Term: React.FC<{ children: React.ReactNode }> = ({ children }) => <b className="font-black text-white">{children}</b>;
/** Renders `text` with the first occurrence of `word` in bold (used to define a term in place). */
const Emphasis: React.FC<{ text: string; word: string }> = ({ text, word }) => {
  const at = text.indexOf(word);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <Term>{word}</Term>
      {text.slice(at + word.length)}
    </>
  );
};
const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="text-xs leading-snug text-stone-400">{children}</p>;

export const GoalSection: React.FC = () => (
  <Section id="goal" title={COPY.goal.title}>
    <p>{COPY.goal.lead}</p>
    <ul className="flex flex-col gap-1">
      {COPY.goal.rows.map((r) => (
        <li key={r.name} className="flex items-baseline gap-2">
          <Term>{r.name}</Term>
          <span>{r.note}</span>
        </li>
      ))}
    </ul>
    <p>{COPY.goal.versus}</p>
  </Section>
);

export const RuleSection: React.FC = () => (
  <Section id="rule" title={COPY.rule.title}>
    <p>{COPY.rule.lead}</p>
    <p>
      <Emphasis text={COPY.rule.foulDefinition} word="foul" />
    </p>
    <div className="grid gap-2.5 sm:grid-cols-2">
      <div>
        <MiniBoard board={LEGAL_BOARD} title={COPY.rule.goodLabel} tone="good" />
        <Note>{COPY.rule.goodNote}</Note>
      </div>
      <div>
        <MiniBoard board={FOULED_BOARD} title={COPY.rule.badLabel} tone="bad" flagged={['front', 'mid']} />
        <Note>{COPY.rule.badNote}</Note>
      </div>
    </div>
    <Note>
      {COPY.rule.equalNote} {COPY.rule.tip}
    </Note>
  </Section>
);

export const DealingSection: React.FC = () => (
  <Section id="dealing" title={COPY.dealing.title}>
    <p>{COPY.dealing.lead}</p>
    <ul className="flex list-disc flex-col gap-1 pl-5">
      <li>{COPY.dealing.classic}</li>
      <li>{COPY.dealing.pineapple}</li>
    </ul>
    <p>{COPY.dealing.lock}</p>
    <p>{COPY.dealing.turns}</p>
  </Section>
);

export const ScoringSection: React.FC = () => {
  const { you, cpu, score } = WORKED;
  const results: Partial<Record<RowName, string>> = {};
  for (const row of ROW_NAMES) results[row] = signed(score.rowResults[row]);
  const rowsNet = ROW_NAMES.reduce((n, r) => n + score.rowResults[r], 0);
  const yourRoyalties = score.seats.human.royaltyTotal;
  const royaltyNet = yourRoyalties - score.seats.ai.royaltyTotal;
  return (
    <Section id="scoring" title={COPY.scoring.title}>
      <p>{COPY.scoring.lead}</p>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        <li>{COPY.scoring.rowLine}</li>
        <li>{COPY.scoring.scoopLine}</li>
        <li>{COPY.scoring.foulLine}</li>
        <li>{COPY.scoring.bothFoul}</li>
        <li>{COPY.scoring.royaltyLine}</li>
      </ul>

      <h4 className="pt-1 text-xs font-black uppercase tracking-widest text-white">{COPY.scoring.exampleTitle}</h4>
      <p>{COPY.scoring.exampleIntro}</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <MiniBoard board={you} title="You" tone="good" results={results} />
        <MiniBoard board={cpu} title="Opponent" />
      </div>
      <ol className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-black/30 p-3 text-[13px]">
        {ROW_NAMES.map((row) => {
          const yours = evaluateRow(you[row], row).name;
          const theirs = evaluateRow(cpu[row], row).name;
          const r = score.rowResults[row];
          const text =
            r > 0
              ? COPY.scoring.exampleRowWin(ROW_LABEL[row], yours, theirs)
              : r < 0
                ? COPY.scoring.exampleRowLoss(ROW_LABEL[row], yours, theirs)
                : COPY.scoring.exampleRowTie(ROW_LABEL[row]);
          return (
            <li key={row} className="flex justify-between gap-3">
              <span>{text}</span>
              <b className={r > 0 ? 'text-emerald-300' : r < 0 ? 'text-rose-300' : 'text-stone-400'}>{signed(r)}</b>
            </li>
          );
        })}
        {score.scoop !== 0 && (
          <li className="flex justify-between gap-3">
            <span>Scoop bonus.</span>
            <b className="text-[#e7c25d]">{signed(score.scoop)}</b>
          </li>
        )}
        {royaltyNet !== 0 && (
          <li className="flex justify-between gap-3">
            <span>
              Royalties: your {evaluateRow(you.front, 'front').name} on the front row pays {yourRoyalties}
              {score.seats.ai.royaltyTotal > 0 ? `, theirs pays ${score.seats.ai.royaltyTotal}` : ''}.
            </span>
            <b className="text-[#e7c25d]">{signed(royaltyNet)}</b>
          </li>
        )}
        <li className="mt-1 flex justify-between gap-3 border-t border-[#d4af37]/30 pt-1.5 text-white">
          <span>Add it up: {[rowsNet, score.scoop, royaltyNet].filter((n) => n !== 0).map(signed).join(' ')}</span>
          <b>{COPY.scoring.exampleTotal(score.points.human)}</b>
        </li>
      </ol>
    </Section>
  );
};

const PointsCell: React.FC<{ value: number | undefined }> = ({ value }) => (
  <td className="py-0.5 text-right font-black text-[#e7c25d]">{value ? value : '–'}</td>
);

const FIVE_CARD_HANDS: readonly HandCategory[] = [
  HandCategory.Trips,
  HandCategory.Straight,
  HandCategory.Flush,
  HandCategory.FullHouse,
  HandCategory.Quads,
  HandCategory.StraightFlush,
];

export const RoyaltiesSection: React.FC = () => {
  const pairRanks = Array.from({ length: 14 - FRONT_PAIR_MIN_RANK + 1 }, (_, i) => FRONT_PAIR_MIN_RANK + i);
  return (
    <Section id="royalties" title={COPY.royalties.title}>
      <p>{COPY.royalties.lead}</p>

      <table className="w-full text-sm">
        <caption className="pb-1 text-left text-xs font-black uppercase tracking-widest text-white">{COPY.royalties.frontPairs}</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">{COPY.royalties.colHand}</th>
            <th scope="col">{COPY.royalties.colPoints}</th>
          </tr>
        </thead>
        <tbody>
          {pairRanks.map((r) => (
            <tr key={r} className="border-t border-white/5">
              <td className="py-0.5">Pair of {rankLabel(r)}s</td>
              <PointsCell value={frontPairRoyalty(r)} />
            </tr>
          ))}
        </tbody>
      </table>
      <table className="w-full text-sm">
        <caption className="pb-1 text-left text-xs font-black uppercase tracking-widest text-white">{COPY.royalties.frontTrips}</caption>
        <tbody>
          <tr className="border-t border-white/5">
            <td className="py-0.5">Three twos</td>
            <PointsCell value={frontTripsRoyalty(2)} />
          </tr>
          <tr className="border-t border-white/5">
            <td className="py-0.5">Three aces</td>
            <PointsCell value={frontTripsRoyalty(14)} />
          </tr>
        </tbody>
      </table>
      <Note>{COPY.royalties.frontNote}</Note>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-black uppercase tracking-widest text-stone-400">
            <th scope="col" className="pb-1 text-left">{COPY.royalties.colHand}</th>
            <th scope="col" className="pb-1 text-right">{COPY.royalties.colMiddle}</th>
            <th scope="col" className="pb-1 text-right">{COPY.royalties.colBack}</th>
          </tr>
        </thead>
        <tbody>
          {FIVE_CARD_HANDS.map((category) => (
            <tr key={category} className="border-t border-white/5">
              <td className="py-0.5">{HAND_NAMES[category]}</td>
              <PointsCell value={MID_ROYALTIES[category]} />
              <PointsCell value={BACK_ROYALTIES[category]} />
            </tr>
          ))}
          <tr className="border-t border-white/5">
            <td className="py-0.5">{COPY.royalties.royalFlush}</td>
            <PointsCell value={ROYAL_FLUSH_ROYALTY.mid} />
            <PointsCell value={ROYAL_FLUSH_ROYALTY.back} />
          </tr>
        </tbody>
      </table>
      <Note>{COPY.royalties.middleNote}</Note>
    </Section>
  );
};

export const FantasylandSection: React.FC = () => (
  <Section id="fantasyland" title={COPY.fantasyland.title}>
    <p>{COPY.fantasyland.lead}</p>
    <p>
      <Term>How to get in.</Term> {COPY.fantasyland.howToEnter}
    </p>
    <p>
      <Term>What happens.</Term> {COPY.fantasyland.whatHappens}
    </p>
    <table className="w-full text-sm">
      <caption className="pb-1 text-left text-xs font-black uppercase tracking-widest text-white">{COPY.fantasyland.cardsTitle}</caption>
      <tbody>
        {progressiveRows().map((row) => (
          <tr key={row.label} className="border-t border-white/5">
            <td className="py-0.5">{row.label}</td>
            <td className="py-0.5 text-right font-black text-[#e7c25d]">{row.cards} cards</td>
          </tr>
        ))}
      </tbody>
    </table>
    <Note>{COPY.fantasyland.flatNote}</Note>
    <p>
      <Term>How to stay.</Term> {COPY.fantasyland.howToStay}
    </p>
    <ul className="flex list-disc flex-col gap-1 pl-5">
      {FANTASYLAND.stay.frontTrips && <li>{COPY.fantasyland.stayFront}</li>}
      <li>{COPY.fantasyland.stayMid(HAND_NAMES[FANTASYLAND.stay.midAtLeast])}</li>
      <li>{COPY.fantasyland.stayBack(HAND_NAMES[FANTASYLAND.stay.backAtLeast])}</li>
    </ul>
  </Section>
);

export const RankingsSection: React.FC = () => (
  <Section id="rankings" title={COPY.rankings.title}>
    <p>{COPY.rankings.lead}</p>
    <ol className="flex flex-col gap-1.5">
      {RANKING_EXAMPLES.map((ex, i) => (
        <li key={ex.blurb} className="cards-guide flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/5 px-2 py-1.5">
          <span className="w-4 flex-none text-center text-[11px] font-black text-stone-400">{i + 1}</span>
          <div className="flex flex-none gap-0.5" role="group" aria-label={`${ex.royal ? 'Royal Flush' : HAND_NAMES[ex.category]}: ${ex.cards.map((c) => `${rankLabel(c.rank)}${c.suit}`).join(' ')}`}>
            {ex.cards.map((card) => (
              <Card key={card.id} card={card} />
            ))}
          </div>
          <span className="min-w-0 leading-tight">
            <b className="block text-[13px] font-black text-white">{ex.royal ? 'Royal Flush' : HAND_NAMES[ex.category]}</b>
            <span className="text-[11px] text-stone-400">{ex.blurb}</span>
          </span>
        </li>
      ))}
    </ol>
    <Note>{COPY.rankings.wheel}</Note>
    <Note>{COPY.rankings.frontNote}</Note>
  </Section>
);
