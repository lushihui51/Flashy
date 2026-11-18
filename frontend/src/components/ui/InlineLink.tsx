import type { ReactNode } from 'react';

type InlineLinkProps = { href: string; children: ReactNode };

/** A link inside a sentence: underlined words in the sentence's own color, never a block. */
export default function InlineLink({ href, children }: InlineLinkProps): ReactNode {
  return (
    <a href={href} className="font-semibold underline underline-offset-3">
      {children}
    </a>
  );
}
