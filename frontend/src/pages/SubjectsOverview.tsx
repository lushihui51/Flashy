import { useState } from 'react';
import { readSubjects } from 'src/api/subject';
import Title from 'src/components/overview/Title';
import NewButton from 'src/components/overview/NewButton';
import All from 'src/components/overview/All';
import New from 'src/components/new/New';
import type { components } from 'src/api/types';
import SubjectCard from 'src/components/subject/SubjectCard';
type SubjectRead = components['schemas']['SubjectRead'];

export default function SubjectsOverview() {
  const [newOpen, setNewOpen] = useState(false);

  const handleClickNew = () => {
    setNewOpen(true);
  };

  const handleCloseAndCancel = () => {
    setNewOpen(false);
  };

  const renderItem = (subject: SubjectRead) => {
    return <SubjectCard key={subject.id} subject={subject} />;
  };

  return (
    <>
      <Title text="Subjects" />
      <NewButton onClick={handleClickNew} />
      <All queryKey={['subjects']} queryFn={readSubjects} renderItem={renderItem} />
      {newOpen && (
        <New
          title="Create New Subject"
          caption="Add a new subject to organize your flashcard decks."
          label="Subject Name"
          description="Enter the details for the new subject"
          onClose={handleCloseAndCancel}
        />
      )}
    </>
  );
}
