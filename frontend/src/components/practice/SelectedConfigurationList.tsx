import { X } from 'lucide-react';
import type { components } from 'src/api/types';

type DeckPracticeConfigSummary = components['schemas']['DeckPracticeConfigSummary'];

type SelectedConfigurationListProps = {
  /** Selected configs that resolved against the unfiltered list, in that list's order
   * (subject → deck → name). */
  configs: DeckPracticeConfigSummary[];
  onRemove: (configId: string) => void;
};

/**
 * New practice's selection as a list, including configurations a filter hides from the
 * pick list (task 019 MD-5). Purely presentational: the page resolves the selected ids
 * and owns the heading and the empty state (AGENTS.md — reusable components don't fetch).
 */
export default function SelectedConfigurationList({
  configs,
  onRemove,
}: SelectedConfigurationListProps) {
  return (
    <ul className="flex flex-col divide-y divide-(--color-surface-elevated)">
      {configs.map((config) => (
        <li key={config.id} className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-col py-2">
            <span className="truncate text-[15px] text-(--color-text)">{config.name}</span>
            <span className="truncate text-[11px] text-(--color-text-muted)">
              {config.deck_name} · {config.subject_name}
            </span>
          </div>
          <button
            type="button"
            aria-label={`Remove ${config.name}`}
            onClick={() => onRemove(config.id)}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-(--color-text-muted)"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
