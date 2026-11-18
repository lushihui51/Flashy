import type { ReactNode } from 'react';
import { Rows3, Shuffle } from 'lucide-react';
import { usePageTitle } from 'src/lib/pageTitle';

/** A mastery circle filled about 0.93 of a turn, the picture beside "Mastery for every field". */
function MasteryIdeaIcon() {
  return (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 22 22" className="mt-px shrink-0">
      <circle cx="11" cy="11" r="9.5" className="fill-(--color-surface)" />
      <path d="M11,11 L11,1.5 A9.5,9.5 0 1 1 6.96,2.40 Z" className="fill-(--color-ink)" />
      <circle
        cx="11"
        cy="11"
        r="9.5"
        fill="none"
        strokeWidth="1.5"
        className="stroke-(--color-ink)"
      />
    </svg>
  );
}

/** One of Flashy's ideas: its picture beside its title over its one line. */
function Idea({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      {icon}
      <div>
        <div className="text-base leading-5.5 font-semibold">{title}</div>
        <div className="text-body leading-[1.3125rem]">{children}</div>
      </div>
    </li>
  );
}

/** One numbered step of "How it works". */
function Step({ number, children }: { number: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-body leading-[1.3125rem]">
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 items-center justify-center rounded-full outlined-ink text-label leading-none font-semibold"
      >
        {number}
      </span>
      <span>{children}</span>
    </li>
  );
}

const IDEA_ICON_CLASS = 'mt-px size-6 shrink-0';

/** "About Flashy": what Flashy is, the three ideas it is built on, and how a user goes from a deck
 * to a run. */
export default function AboutPage() {
  usePageTitle('About Flashy');

  return (
    <div className="p-4 text-(--color-ink)">
      <h1 className="text-page leading-[2.125rem] font-bold tracking-[-0.02em]">About Flashy</h1>
      <p className="mt-3.5 text-[1.3125rem] leading-7 font-semibold">
        Flashcards for knowledge that doesn't fit on two sides of a card.
      </p>

      <ul className="mt-5 flex flex-col gap-3.5 border-t border-(--color-line) pt-4.5">
        <Idea
          icon={<Rows3 aria-hidden="true" className={IDEA_ICON_CLASS} />}
          title="One card, many fields"
        >
          A word's spelling, meaning, gender and example, all on one card.
        </Idea>
        <Idea
          icon={<Shuffle aria-hidden="true" className={IDEA_ICON_CLASS} />}
          title="A new question every time"
        >
          Choose what each card shows and asks. Fields drawn at random keep the same card fresh.
        </Idea>
        <Idea icon={<MasteryIdeaIcon />} title="Mastery for every field">
          See exactly what you know. The fields you know least come up most.
        </Idea>
      </ul>

      <h2 className="mt-5.5 border-t border-(--color-line) pt-4.5 text-title leading-6 font-bold">
        How it works
      </h2>
      <ol className="mt-3 flex flex-col gap-2.5">
        <Step number={1}>Make a deck and fill it with cards.</Step>
        <Step number={2}>Make a practice from your decks, and choose what each one asks.</Step>
        <Step number={3}>Start a run. Rate each answer, and missed cards come back.</Step>
        <Step number={4}>See how each card's mastery moved, then run it again.</Step>
      </ol>
    </div>
  );
}
