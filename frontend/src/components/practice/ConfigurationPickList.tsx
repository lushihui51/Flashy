import type { ConfigurationGroup } from 'src/lib/practiceConfigurationGroups';

type ConfigurationPickListProps = {
  groups: ConfigurationGroup[];
  /** deck id → the configuration selected for that deck (invariant 7: one per deck). */
  selection: Record<string, string>;
  /** The one failure that names a specific row (`stale_config`) — every other error
   * renders elsewhere on the page. */
  rowError: { configId: string; message: string } | null;
  onSelect: (deckId: string, configId: string) => void;
};

/**
 * A radio per deck group (invariant 7): choosing a different configuration in the same
 * group replaces the previous choice, never adds to it — enforced both natively (one
 * `name` per deck) and by `selection` being keyed by deck id.
 *
 * Purely presentational: the page fetches, groups (`groupConfigurationsByDeck`), and
 * owns selection state; this only renders what it's given (AGENTS.md — reusable
 * components don't fetch).
 */
export default function ConfigurationPickList({
  groups,
  selection,
  rowError,
  onSelect,
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
                  <label htmlFor={inputId} className="flex min-h-11 items-center gap-3">
                    <input
                      id={inputId}
                      type="radio"
                      name={`deck-${group.deckId}`}
                      checked={selection[group.deckId] === config.id}
                      onChange={() => onSelect(group.deckId, config.id)}
                    />
                    <span className="text-[15px] text-(--color-text)">{config.name}</span>
                  </label>
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
