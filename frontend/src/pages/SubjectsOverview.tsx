import { useState } from 'react';
import { readSubjects } from 'src/api/subject';
import Title from 'src/components/overview/Title';
import NewButton from 'src/components/overview/NewButton';
import All from 'src/components/overview/All';
import New from 'src/components/new/New';

export default function SubjectsOverview() {
  const [newOpen, setNewOpen] = useState(false);

  const handleCloseAndCancel = () => {
    setNewOpen(false);
  };
  const handleClickNew = () => {
    setNewOpen(true);
  };

  return (
    <>
      <Title text="Subjects" />
      <NewButton onClick={handleClickNew} />
      <All queryKey={['subjects']} queryFn={readSubjects} />
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
