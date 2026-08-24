import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { pluralize } from 'src/lib/pluralize';
import type { components } from 'src/api/types';

type DeckPracticeConfigSummary = components['schemas']['DeckPracticeConfigSummary'];

type PracticeConfigRowProps = {
  config: DeckPracticeConfigSummary;
  onDelete: () => void;
};

/** How many fields this config actually shows per card is a range when a pool is
 * involved, so the row states what it is made of rather than pretending it's one number. */
function shape(config: DeckPracticeConfigSummary): string {
  const parts = [
    `${pluralize(config.prompt_field_ids.length + config.prompt_pool_ids.length, 'prompt field')}`,
    `${pluralize(config.answer_field_ids.length + config.answer_pool_ids.length, 'answer field')}`,
  ];
  const pooled = config.prompt_pool_ids.length + config.answer_pool_ids.length;
  if (pooled > 0) parts.push('pooled');
  return parts.join(' · ');
}

export default function PracticeConfigRow({ config, onDelete }: PracticeConfigRowProps) {
  return (
    <div className="flex items-center gap-2">
      <Link
        to={`/practice/configs/${config.id}/edit`}
        className="flex min-h-16 min-w-0 flex-1 flex-col justify-center py-2"
      >
        <span className="truncate text-[15px] leading-5 text-(--color-text)">{config.name}</span>
        <span className="truncate text-[13px] leading-4 text-(--color-text-secondary)">
          {config.subject_name} · {config.deck_name}
        </span>
        <span className="truncate text-[11px] text-(--color-text-muted)">{shape(config)}</span>
      </Link>

      <button
        type="button"
        aria-label={`Delete ${config.name}`}
        onClick={onDelete}
        className="flex h-11 w-11 shrink-0 items-center justify-center text-(--color-text-muted)"
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
