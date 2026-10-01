import { Pencil } from 'lucide-react';
import type { ConfigurationGroup } from 'src/lib/practiceConfigurationGroups';

type ConfigurationPickListProps = {
  groups: ConfigurationGroup[];
  /** Every selected configuration id, across all decks — the page reads them from the
   * URL (ADR 061). */
  selectedIds: ReadonlySet<string>;
  /** The one failure that names a specific row (`stale_config`) — every other error
   * renders elsewhere on the page. */
  rowError: { configId: string; message: string } | null;
  /** One tap on a row's checkbox. `group` is the row's deck group, so the page can
   * untick that deck's other configuration (MD-1). */
  onToggle: (group: ConfigurationGroup, configId: string) => void;
  /** The row's pencil: open this configuration for editing (task 019 MD-6). */
  onEdit: (configId: string) => void;
};

/**
 * A checkbox per configuration, at most one ticked per deck group (task 019 MD-1):
 * ticking a second configuration in a deck unticks the first, and tapping a ticked one
 * clears it. Nothing here enforces that natively — `toggleConfig` does, in the page's
 * handler — so the inputs carry no `name`, and a hand-edited URL can show two ticks in
 * one deck until the next tap there (MD-8).
 *
 * Purely presentational: the page fetches, groups (`groupConfigurationsByDeck`), and
 * owns the selection; this only renders what it's given (AGENTS.md — reusable
 * components don't fetch).
 */
export default function ConfigurationPickList({
  groups,
  selectedIds,
  rowError,
  onToggle,
  onEdit,
}: ConfigurationPickListProps) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <fieldset key={group.deckId} className="flex flex-col gap-1">
          <legend className="pb-1 text-sm font-medium text-(--color-text)">
            {group.deckName} · {group.subjectName}
          </legend>
          <div className="flex flex-col divide-y divide-(--color-surface-elevated)">
            {group.configs.map((config) => {
              const inputId = `config-${config.id}`;
              return (
                <div key={config.id} className="flex flex-col gap-1 py-2">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={inputId}
                      className="flex min-h-11 min-w-0 flex-1 items-center gap-3"
                    >
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={selectedIds.has(config.id)}
                        onChange={() => onToggle(group, config.id)}
                      />
                      <span className="text-[15px] text-(--color-text)">{config.name}</span>
                    </label>
                    <button
                      type="button"
                      aria-label={`Edit ${config.name}`}
                      onClick={() => onEdit(config.id)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center text-(--color-text-muted)"
                    >
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                  {rowError?.configId === config.id && (
                    <p role="alert" className="pl-7 text-sm text-(--color-danger)">
                      {rowError.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
