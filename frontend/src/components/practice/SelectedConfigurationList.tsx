import { X } from 'lucide-react';
import type { components } from 'src/api/types';

type DeckPracticeConfigSummary = components['schemas']['DeckPracticeConfigSummary'];

type SelectedConfigurationListProps = {
  /** Selected configs that resolved against the unfiltered list, in that list's order
   * (decks by their most recent change, then configurations by theirs). */
  configs: DeckPracticeConfigSummary[];
  onRemove: (configId: string) => void;
};

/**
 * New practice's selection as a list, including configurations a filter hides from the
 * pick list. Purely presentational: the page resolves the selected ids and owns the
 * heading and the empty state (AGENTS.md — reusable components don't fetch).
 */
export default function SelectedConfigurationList({
  configs,
  onRemove,
}: SelectedConfigurationListProps) {
  return (
    <ul className="tappable flex flex-col divide-y divide-(--color-line) rounded-[20px] bg-(--color-surface)">
      {configs.map((config) => (
        <li key={config.id} className="flex items-center gap-1.5 pr-1 pl-4">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-3">
            <span className="truncate text-[15px] leading-5 font-semibold text-(--color-ink)">
              {config.name}
            </span>
            <span className="truncate text-[13px] leading-4 text-(--color-aside)">
              {config.subject_name} · {config.deck_name}
            </span>
          </div>
          <button
            type="button"
            aria-label={`Remove ${config.name}`}
            onClick={() => onRemove(config.id)}
            className="flex h-11 w-10 shrink-0 items-center justify-center text-(--color-aside)"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
