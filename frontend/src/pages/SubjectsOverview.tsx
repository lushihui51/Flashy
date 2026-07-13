import { useState } from 'react';
import { readSubjects } from 'src/api/subject';
import NewButton from 'src/components/overview/NewButton';
import All from 'src/components/overview/All';
import New from 'src/components/new/New';
import type { components } from 'src/api/types';
import EntityCard from 'src/components/overview/EntityCard';
import { BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
type SubjectRead = components['schemas']['SubjectRead'];

export default function SubjectsOverview() {
  const [newOpen, setNewOpen] = useState(false);
  const {
    data: subjects = [],
    isPending,
    isError,
    error,
  } = useQuery({ queryKey: ['subjects'], queryFn: readSubjects });

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
          label="Subject Name"
          description="Enter the details for the new subject"
          onClose={handleCloseAndCancel}
        />
      )}
    </div>
  );
}
