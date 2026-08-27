import type { components } from 'src/api/types';

type DeckPracticeConfigSummary = components['schemas']['DeckPracticeConfigSummary'];

export type ConfigurationGroup = {
  deckId: string;
  deckName: string;
  subjectName: string;
  configs: DeckPracticeConfigSummary[];
};

/**
 * Configs come back subject → deck → name ordered (the backend contract), so grouping
 * by first-seen `deck_id` preserves that order without a second sort. Two decks that
 * share a name in different subjects still land in separate groups — each keyed by
 * `deck_id` and carrying its own `subject_name` — so the group header can tell them
 * apart (a deck name alone is not unique).
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
        subjectName: config.subject_name,
        configs: [],
      });
    }
    groups[index]!.configs.push(config);
  }
  return groups;
}
