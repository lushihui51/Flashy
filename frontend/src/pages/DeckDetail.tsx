import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readDeck } from 'src/api/deck';
import { readFieldDefs, createFieldDef } from 'src/api/field_def';
import { readCards, createCard, deleteCard } from 'src/api/card';
import { readDeckPracticeConfigs, createDeckPracticeConfig } from 'src/api/deck_practice_config';
import { createPracticeSession } from 'src/api/practice_session';
import Select from 'src/components/Select';
import FieldLabel from 'src/components/FieldLabel';
import type { components } from 'src/api/types';

type FieldType = components['schemas']['FieldType'];

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
  { value: 'audio', label: 'Audio' },
];

const inputClasses = 'w-full bg-gray-100 rounded-xl px-4 py-3 text-gray-900';

function toggleId(id: string, list: string[]): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

// Smoke-path UI only: prompt/answer fields, no pools. "Ugly is fine" — this is a
// stand-in for the frontend rewrite, not a product. See docs/cc/2026-08-19-frontend-rewrite-survey.md.
export default function DeckDetail() {
  const { deckId = '' } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: deck, isPending: deckPending } = useQuery({
    queryKey: ['deck', deckId],
    queryFn: () => readDeck(deckId),
    enabled: !!deckId,
  });
  const { data: fields = [], isPending: fieldsPending } = useQuery({
    queryKey: ['fields', deckId],
    queryFn: () => readFieldDefs(deckId),
    enabled: !!deckId,
  });
  const { data: cards = [], isPending: cardsPending } = useQuery({
    queryKey: ['cards', deckId],
    queryFn: () => readCards(deckId),
    enabled: !!deckId,
  });
  const { data: configs = [] } = useQuery({
    queryKey: ['deck_practice_configs', deckId],
    queryFn: () => readDeckPracticeConfigs(deckId),
    enabled: !!deckId,
  });

  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<FieldType>('text');
  const createFieldMutation = useMutation({
    mutationFn: () => createFieldDef(deckId, { name: fieldName.trim(), type: fieldType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fields', deckId] });
      setFieldName('');
      setFieldType('text');
    },
  });

  const [cardValues, setCardValues] = useState<Record<string, string>>({});
  const createCardMutation = useMutation({
    mutationFn: () =>
      createCard({
        deck_id: deckId,
        values: Object.fromEntries(fields.map((f) => [f.id, cardValues[f.id] ?? ''])),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', deckId] });
      setCardValues({});
    },
  });
  const deleteCardMutation = useMutation({
    mutationFn: (cardId: string) => deleteCard(cardId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards', deckId] }),
  });

  const [configName, setConfigName] = useState('');
  const [promptFieldIds, setPromptFieldIds] = useState<string[]>([]);
  const [answerFieldIds, setAnswerFieldIds] = useState<string[]>([]);
  const createConfigMutation = useMutation({
    mutationFn: () =>
      createDeckPracticeConfig({
        deck_id: deckId,
        name: configName.trim(),
        prompt_field_ids: promptFieldIds,
        answer_field_ids: answerFieldIds,
        prompt_pool_ids: [],
        prompt_pool_counts: [],
        answer_pool_ids: [],
        answer_pool_counts: [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck_practice_configs', deckId] });
      setConfigName('');
      setPromptFieldIds([]);
      setAnswerFieldIds([]);
    },
  });

  const startSessionMutation = useMutation({
    mutationFn: (configId: string) =>
      createPracticeSession({ deck_practice_config_ids: [configId] }),
    onSuccess: (session) => {
      if (session) navigate(`/practices/${session.id}`);
    },
  });

  if (!deckId) return <div>Deck not found</div>;
  if (deckPending || fieldsPending || cardsPending) return <div>Loading...</div>;

  return (
    <div className="space-y-10">
      <div>
        <button className="text-sm text-small-text mb-2 cursor-pointer" onClick={() => navigate('/decks')}>
          &lt; Back to decks
        </button>
        <h1 className="text-2xl font-bold">{deck?.name}</h1>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Fields</h2>
        <ul className="mb-4 space-y-1">
          {fields.map((f) => (
            <li key={f.id} className="text-sm">
              {f.name} <span className="text-small-text">({f.type})</span>
            </li>
          ))}
          {fields.length === 0 && (
            <li className="text-sm text-small-text italic">No fields yet</li>
          )}
        </ul>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <FieldLabel name="Field name" mandatory={false} />
            <input
              className={inputClasses}
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Select
              label="Type"
              value={fieldType}
              options={FIELD_TYPE_OPTIONS}
              onChange={(v) => setFieldType(v as FieldType)}
            />
          </div>
          <button
            className="bg-black text-white rounded-lg px-4 py-3 disabled:bg-gray-400"
            disabled={!fieldName.trim() || createFieldMutation.isPending}
            onClick={() => createFieldMutation.mutate()}
          >
            Add field
          </button>
        </div>
        {createFieldMutation.isError && (
          <p className="text-sm text-red-600 mt-2">{createFieldMutation.error.message}</p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Cards</h2>
        <ul className="mb-4 space-y-2">
          {cards.map((card) => (
            <li
              key={card.id}
              className="flex items-center justify-between text-sm bg-accent rounded-lg px-3 py-2"
            >
              <span>{Object.values(card.values).join(' / ')}</span>
              <button
                className="text-small-text cursor-pointer"
                onClick={() => deleteCardMutation.mutate(card.id)}
              >
                Delete
              </button>
            </li>
          ))}
          {cards.length === 0 && (
            <li className="text-sm text-small-text italic">No cards yet</li>
          )}
        </ul>
        {fields.length === 0 ? (
          <p className="text-sm text-small-text italic">Add a field before adding cards.</p>
        ) : (
          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.id}>
                <FieldLabel name={f.name} mandatory />
                <input
                  className={inputClasses}
                  value={cardValues[f.id] ?? ''}
                  onChange={(e) =>
                    setCardValues((prev) => ({ ...prev, [f.id]: e.target.value }))
                  }
                />
              </div>
            ))}
            <button
              className="bg-black text-white rounded-lg px-4 py-3 disabled:bg-gray-400"
              disabled={createCardMutation.isPending}
              onClick={() => createCardMutation.mutate()}
            >
              Add card
            </button>
          </div>
        )}
        {createCardMutation.isError && (
          <p className="text-sm text-red-600 mt-2">{createCardMutation.error.message}</p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Practice configs</h2>
        <ul className="mb-4 space-y-2">
          {configs.map((config) => (
            <li
              key={config.id}
              className="flex items-center justify-between text-sm bg-accent rounded-lg px-3 py-2"
            >
              <span>{config.name}</span>
              <button
                className="bg-black text-white rounded-lg px-3 py-1.5 disabled:bg-gray-400"
                disabled={startSessionMutation.isPending}
                onClick={() => startSessionMutation.mutate(config.id)}
              >
                Start practice
              </button>
            </li>
          ))}
          {configs.length === 0 && (
            <li className="text-sm text-small-text italic">No practice configs yet</li>
          )}
        </ul>
        {fields.length === 0 ? (
          <p className="text-sm text-small-text italic">
            Add fields before creating a practice config.
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <FieldLabel name="Config name" mandatory />
              <input
                className={inputClasses}
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel name="Prompt fields" mandatory />
                {fields.map((f) => (
                  <label key={f.id} className="flex items-center gap-2 text-sm mb-1">
                    <input
                      type="checkbox"
                      checked={promptFieldIds.includes(f.id)}
                      onChange={() => setPromptFieldIds((prev) => toggleId(f.id, prev))}
                    />
                    {f.name}
                  </label>
                ))}
              </div>
              <div>
                <FieldLabel name="Answer fields" mandatory />
                {fields.map((f) => (
                  <label key={f.id} className="flex items-center gap-2 text-sm mb-1">
                    <input
                      type="checkbox"
                      checked={answerFieldIds.includes(f.id)}
                      onChange={() => setAnswerFieldIds((prev) => toggleId(f.id, prev))}
                    />
                    {f.name}
                  </label>
                ))}
              </div>
            </div>
            <button
              className="bg-black text-white rounded-lg px-4 py-3 disabled:bg-gray-400"
              disabled={
                !configName.trim() ||
                promptFieldIds.length === 0 ||
                answerFieldIds.length === 0 ||
                createConfigMutation.isPending
              }
              onClick={() => createConfigMutation.mutate()}
            >
              Create config
            </button>
          </div>
        )}
        {createConfigMutation.isError && (
          <p className="text-sm text-red-600 mt-2">{createConfigMutation.error.message}</p>
        )}
        {startSessionMutation.isError && (
          <p className="text-sm text-red-600 mt-2">{startSessionMutation.error.message}</p>
        )}
      </section>
    </div>
  );
}
