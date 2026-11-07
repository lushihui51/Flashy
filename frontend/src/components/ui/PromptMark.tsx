import type { ReactNode } from 'react';

/** Whether one attempt showed a prompt field. It is silent, so its caller speaks the mark. */
export default function PromptMark({ shown }: { shown: boolean }): ReactNode {
  return (
    <svg aria-hidden="true" viewBox="0 0 13 13" className="size-[0.8125rem]">
      {shown ? (
        <circle cx={6.5} cy={6.5} r={6.5} fill="var(--color-ink)" />
      ) : (
        <circle
          cx={6.5}
          cy={6.5}
          r={5.75}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}
