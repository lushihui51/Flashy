import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { readDecks, createDeck, deleteDeck, updateDeck } from 'src/api/deck';
import { readSubjects } from 'src/api/subject';
import NewButton from 'src/components/NewButton';
import All from 'src/components/All';
import FormModal from 'src/components/FormModal';
import type { FieldProperties } from 'src/components/FormModal';
import FilterChips from 'src/components/FilterChips';
import type { components } from 'src/api/types';
import EntityCard from 'src/components/EntityCard';
import { Layers } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
type DeckRead = components['schemas']['DeckRead'];

type DeckFormValues = {
  subject_id: string;
  name: string;
};

export default function DecksOverview() {
  const [newOpen, setNewOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<DeckRead | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const subjectFilter = searchParams.get('subject') ?? '';

  const {
    data: decks = [],
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['decks', subjectFilter],
    queryFn: () => readDecks(subjectFilter || undefined),
  });

  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: readSubjects });

  const subjectOptions = subjects.map((subject) => ({ value: subject.id, label: subject.name }));
  const subjectNameById = new Map(subjects.map((subject) => [subject.id, subject.name]));

  const handleFilterChange = (value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value) {
      nextParams.set('subject', value);
    } else {
      nextParams.delete('subject');
    }
    setSearchParams(nextParams);
  };

  const deckFields: Record<keyof DeckFormValues, FieldProperties> = {
    subject_id: {
      displayName: 'Subject',
      mandatory: true,
      type: 'select',
      options: subjectOptions,
    },
    name: { displayName: 'Name', mandatory: true },
  };

  const createDeckMutation = useMutation({
    mutationFn: (values: DeckFormValues) => {
      const name = values.name.trim();
      if (!name) {
        throw new Error('Name is required');
      }
      if (!values.subject_id) {
        throw new Error('Subject is required');
      }
      return createDeck({ name, subject_id: values.subject_id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      setNewOpen(false);
    },
  });
  const deleteDeckMutation = useMutation({
    mutationFn: (deckId: string) => {
      return deleteDeck(deckId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
  });

  const editDeckMutation = useMutation({
    mutationFn: ({ deckId, values }: { deckId: string; values: DeckFormValues }) => {
      const name = values.name.trim();
      if (!name) {
        throw new Error('Name is required');
      }
      if (!values.subject_id) {
        throw new Error('Subject is required');
      }
      return updateDeck(deckId, {
        name,
        subject_id: values.subject_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      setEditingDeck(null);
    },
  });

  if (isPending) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  const numDecks = decks.length;

  const handleClickNew = () => {
    setNewOpen(true);
  };

  const handleClose = () => {
    setNewOpen(false);
    setEditingDeck(null);
  };

  const renderItem = (deck: DeckRead) => {
    return (
      <EntityCard
        key={deck.id}
        fallbackIcon={Layers}
        name={deck.name}
        description={subjectNameById.get(deck.subject_id)}
        fallbackDescription="Uncategorized"
        footerLabel="View deck"
        onClick={() => {
          navigate(`/decks/${deck.id}`);
        }}
        onEdit={() => {
          setEditingDeck(deck);
        }}
        onDelete={() => {
          deleteDeckMutation.mutate(deck.id);
        }}
        disableActions={deleteDeckMutation.isPending || editDeckMutation.isPending}
      />
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-9">
        <FilterChips
          options={[{ value: '', label: 'All' }, ...subjectOptions]}
          value={subjectFilter}
          onChange={handleFilterChange}
        />
        <div className="ml-auto flex items-center gap-4">
          <p className="text-sm text-small-text whitespace-nowrap">{numDecks} decks</p>
          <div className="bg-black text-white rounded-lg px-4 py-2">
            <NewButton description="+ New Deck" onClick={handleClickNew} />
          </div>
        </div>
      </div>
      <All items={decks} renderItem={renderItem} />
      {deleteDeckMutation.isError && (
        <p className="text-sm text-red-600">
          Error deleting deck: {deleteDeckMutation.error.message}
        </p>
      )}
      {newOpen && (
        <FormModal<DeckFormValues>
          title="Create New Deck"
          caption="Add a new deck. You'll add fields and cards from the deck's page next."
          fields={deckFields}
          initialValues={subjectFilter ? { subject_id: subjectFilter } : undefined}
          handleClose={handleClose}
          isSubmitting={createDeckMutation.isPending}
          error={createDeckMutation.error}
          onSubmit={(values) => createDeckMutation.mutate(values)}
        />
      )}
      {editingDeck && (
        <FormModal<DeckFormValues>
          title="Edit Deck"
          caption="Edit the details of this deck."
          fields={deckFields}
          initialValues={{
            subject_id: editingDeck.subject_id,
            name: editingDeck.name,
          }}
          handleClose={handleClose}
          isSubmitting={editDeckMutation.isPending}
          error={editDeckMutation.error}
          onSubmit={(values) => editDeckMutation.mutate({ deckId: editingDeck.id, values })}
        />
      )}
    </div>
  );
}
