import { useState } from 'react';
import { readDecks, createDeck, deleteDeck, updateDeck } from 'src/api/deck';
import { readSubjects } from 'src/api/subject';
import NewButton from 'src/components/overview/NewButton';
import All from 'src/components/overview/All';
import FormModal from 'src/components/new/FormModal';
import type { FieldProperties } from 'src/components/new/FormModal';
import type { components } from 'src/api/types';
import EntityCard from 'src/components/overview/EntityCard';
import { Layers } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
type DeckRead = components['schemas']['DeckRead'];

type DeckCreateFormValues = {
  subject_id: string;
  name: string;
  deck_schema: Record<string, string>;
};

// The backend doesn't support changing a deck's schema after creation, so
// editing only exposes subject_id and name.
type DeckEditFormValues = {
  subject_id: string;
  name: string;
};

export default function DecksOverview() {
  const [newOpen, setNewOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<DeckRead | null>(null);
  const queryClient = useQueryClient();

  const {
    data: decks = [],
    isPending,
    isError,
    error,
  } = useQuery({ queryKey: ['decks'], queryFn: readDecks });

  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: readSubjects });

  const subjectOptions = subjects.map((subject) => ({ value: subject.id, label: subject.name }));
  const subjectNameById = new Map(subjects.map((subject) => [subject.id, subject.name]));

  const deckCreateFields: Record<keyof DeckCreateFormValues, FieldProperties> = {
    subject_id: {
      displayName: 'Subject',
      mandatory: true,
      type: 'select',
      options: subjectOptions,
    },
    name: { displayName: 'Name', mandatory: true },
    deck_schema: { displayName: 'Fields', mandatory: true, type: 'keyvalue' },
  };

  const deckEditFields: Record<keyof DeckEditFormValues, FieldProperties> = {
    subject_id: {
      displayName: 'Subject',
      mandatory: true,
      type: 'select',
      options: subjectOptions,
    },
    name: { displayName: 'Name', mandatory: true },
  };

  const createDeckMutation = useMutation({
    mutationFn: (values: DeckCreateFormValues) => {
      const name = values.name.trim();
      if (!name) {
        throw new Error('Name is required');
      }
      if (!values.subject_id) {
        throw new Error('Subject is required');
      }
      if (Object.keys(values.deck_schema).length === 0) {
        throw new Error('At least one field is required');
      }
      return createDeck({
        name,
        subject_id: values.subject_id,
        deck_schema: values.deck_schema,
      });
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
    mutationFn: ({ deckId, values }: { deckId: string; values: DeckEditFormValues }) => {
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
  const numCards = decks.reduce((sum, deck) => sum + deck.card_count, 0);

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
        countLabel="cards"
        count={deck.card_count}
        footerLabel="View cards"
        onClick={() => {
          console.log(`Clicked on deck ${deck.id}`);
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
      <div className="flex items-center justify-between mb-9">
        <p className="text-sm text-small-text">
          {numDecks} decks, {numCards} cards total
        </p>
        <div className="bg-black text-white rounded-lg px-4 py-2">
          <NewButton description="+ New Deck" onClick={handleClickNew} />
        </div>
      </div>
      <All items={decks} renderItem={renderItem} />
      {deleteDeckMutation.isError && (
        <p className="text-sm text-red-600">
          Error deleting deck: {deleteDeckMutation.error.message}
        </p>
      )}
      {newOpen && (
        <FormModal<DeckCreateFormValues>
          title="Create New Deck"
          caption="Add a new deck with the fields every card in it will share."
          fields={deckCreateFields}
          handleClose={handleClose}
          isSubmitting={createDeckMutation.isPending}
          error={createDeckMutation.error}
          onSubmit={(values) => createDeckMutation.mutate(values)}
        />
      )}
      {editingDeck && (
        <FormModal<DeckEditFormValues>
          title="Edit Deck"
          caption="Edit the details of this deck."
          fields={deckEditFields}
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
