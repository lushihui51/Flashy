import type { components } from 'src/api/types';

type DeckPracticeConfigSummary = components['schemas']['DeckPracticeConfigSummary'];

export type ConfigurationGroup = {
  deckId: string;
  deckName: string;
  configs: DeckPracticeConfigSummary[];
};

/**
 * Configs come back ordered by their deck's most recent change, then by their own (the
 * backend contract), so grouping by first-seen `deck_id` preserves that order without a
 * second sort.
 */
export function groupConfigurationsByDeck(
  configs: DeckPracticeConfigSummary[],
): ConfigurationGroup[] {
  const groups: ConfigurationGroup[] = [];
  const indexByDeck = new Map<string, number>();
  for (const config of configs) {
    let index = indexByDeck.get(config.deck_id);
    if (index === undefined) {
      index = groups.length;
      indexByDeck.set(config.deck_id, index);
      groups.push({
        deckId: config.deck_id,
        deckName: config.deck_name,
        configs: [],
      });
    }
    groups[index]!.configs.push(config);
  }
  return groups;
}
