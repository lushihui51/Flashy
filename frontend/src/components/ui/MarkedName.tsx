import type { ReactNode } from 'react';

type MarkedNameProps = {
  /** The kind's mark: `<DeckMark />`, `<PracticeMark />` or `<RunMark />`. */
  mark: ReactNode;
  /** The name, or the run's day, whole. */
  name: string;
};

/** A name with its kind's mark inline before it, spoken as the mark's word and the name. The mark
 * never ends a line apart from the name: it always starts the line of the name's first word. It
 * renders no element around the two, so the element it is placed in sets the name's text, and
 * that element's clamp or word breaking holds the mark and the name alike. */
export default function MarkedName({ mark, name }: MarkedNameProps): ReactNode {
  const [firstCharacter = '', ...rest] = Array.from(name);
  return (
    <>
      {/* Only the first character is held to the mark, so the rest of the name still breaks
          between its words, and inside a word wider than its whole line. */}
      <span className="whitespace-nowrap">
        {mark} {firstCharacter}
      </span>
      {rest.join('')}
    </>
  );
}
