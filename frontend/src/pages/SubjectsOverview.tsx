import { useState } from 'react';
import { readSubjects, createSubject } from 'src/api/subject';
import NewButton from 'src/components/overview/NewButton';
import All from 'src/components/overview/All';
import New from 'src/components/new/New';
import type { components } from 'src/api/types';
import EntityCard from 'src/components/overview/EntityCard';
import { BookOpen } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
type SubjectRead = components['schemas']['SubjectRead'];

const createInput: Record<string, { displayName: string; mandatory: boolean }> = {
  name: { displayName: 'Name', mandatory: true },
  icon: { displayName: 'Icon', mandatory: false },
  description: { displayName: 'Description', mandatory: false },
};

export default function SubjectsOverview() {
  const [newOpen, setNewOpen] = useState(false);
  const queryClient = useQueryClient();
  const {
    data: subjects = [],
    isPending,
    isError,
    error,
  } = useQuery({ queryKey: ['subjects'], queryFn: readSubjects });

  const createSubjectMutation = useMutation({
    mutationFn: (raw: Record<string, string>) => {
      for (const [key, field] of Object.entries(createInput)) {
        if (field.mandatory && !raw[key]?.trim()) {
          throw new Error(`${field.displayName} is required`);
        }
      }
      return createSubject({
        name: raw.name?.trim() ?? '',
        description: raw.description || undefined,
        icon: raw.icon || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setNewOpen(false);
    },
  });

  if (isPending) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  const numSubjects = subjects.length;
  const numDecks = subjects.reduce((sum, subject) => sum + subject.deck_count, 0);

  const handleClickNew = () => {
    setNewOpen(true);
  };

  const handleCloseAndCancel = () => {
    setNewOpen(false);
  };

  const renderItem = (subject: SubjectRead) => {
    return (
      <EntityCard
        key={subject.id}
        icon={subject.icon}
        fallbackIcon={BookOpen}
        name={subject.name}
        description={subject.description}
        fallbackDescription="An exciting subject"
        countLabel="decks"
        count={subject.deck_count}
        footerLabel="View decks"
        onClick={() => {
          console.log(`Clicked on subject ${subject.id}`);
        }}
        onEdit={() => {
          console.log(`Editing subject ${subject.id}`);
        }}
        onDelete={() => {
          console.log(`Deleting subject ${subject.id}`);
        }}
      />
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-9">
        <p className="text-sm text-small-text">
          {numSubjects} subjects, {numDecks} decks total
        </p>
        <div className="bg-black text-white rounded-lg px-4 py-2">
          <NewButton description="+ New Subject" onClick={handleClickNew} />
        </div>
      </div>
      <All items={subjects} renderItem={renderItem} />
      {newOpen && (
        <New
          title="Create New Subject"
          caption="Add a new subject to organize your flashcard decks."
          fields={createInput}
          onClose={handleCloseAndCancel}
          isSubmitting={createSubjectMutation.isPending}
          error={createSubjectMutation.error}
          onSubmit={createSubjectMutation.mutate}
        />
      )}
    </div>
  );
}
