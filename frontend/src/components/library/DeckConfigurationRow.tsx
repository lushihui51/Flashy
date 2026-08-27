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
  if (pooled > 0) parts.push('pooled');
  return parts.join(' · ');
}

export default function DeckConfigurationRow({
  configuration,
  onDelete,
}: DeckConfigurationRowProps) {
  return (
    <div className="flex items-center gap-2">
      <Link
        to={`/deck-configurations/${configuration.id}/edit`}
        className="flex min-h-16 min-w-0 flex-1 flex-col justify-center py-2"
      >
        <span className="truncate text-[15px] leading-5 text-(--color-text)">{configuration.name}</span>
        <span className="truncate text-[11px] text-(--color-text-muted)">{shape(configuration)}</span>
      </Link>

      <button
        type="button"
        aria-label={`Delete ${configuration.name}`}
        onClick={onDelete}
        className="flex h-11 w-11 shrink-0 items-center justify-center text-(--color-text-muted)"
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
