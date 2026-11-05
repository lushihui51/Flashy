import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { pluralize } from 'src/lib/pluralize';
import type { components } from 'src/api/types';

type DeckPracticeConfigSummary = components['schemas']['DeckPracticeConfigSummary'];

type DeckConfigurationRowProps = {
  configuration: DeckPracticeConfigSummary;
  onDelete: () => void;
};

/** How many fields a card actually shows is a range when a pool is involved, so the row
 * states what the configuration is made of rather than pretending it's one number. */
function shape(config: DeckPracticeConfigSummary): string {
  const parts = [
    `${pluralize(config.prompt_field_ids.length + config.prompt_pool_ids.length, 'prompt field')}`,
    `${pluralize(config.answer_field_ids.length + config.answer_pool_ids.length, 'answer field')}`,
  ];
  const pooled = config.prompt_pool_ids.length + config.answer_pool_ids.length;
  if (pooled > 0) parts.push('random draw');
  return parts.join(' · ');
}

export default function DeckConfigurationRow({
  configuration,
  onDelete,
}: DeckConfigurationRowProps) {
  return (
    <div className="flex items-center gap-1.5 pr-1 pl-4">
      <Link
        to={`/deck-configurations/${configuration.id}/edit`}
        className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-3"
      >
        <span className="truncate text-body leading-5 font-semibold text-(--color-ink)">{configuration.name}</span>
        <span className="truncate text-label text-(--color-aside)">{shape(configuration)}</span>
      </Link>

      <button
        type="button"
        aria-label={`Delete ${configuration.name}`}
        onClick={onDelete}
        className="flex h-11 w-11 shrink-0 items-center justify-center text-(--color-aside)"
      >
        <Trash2 aria-hidden="true" className="size-icon" />
      </button>
    </div>
  );
}
