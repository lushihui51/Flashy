import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { readSubjects, createSubject, deleteSubject, updateSubject } from 'src/api/subject';
import NewButton from 'src/components/NewButton';
import All from 'src/components/All';
import FormModal from 'src/components/FormModal';
import type { FieldProperties } from 'src/components/FormModal';
import type { components } from 'src/api/types';
import EntityCard from 'src/components/EntityCard';
import { BookOpen } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
type SubjectRead = components['schemas']['SubjectRead'];

type SubjectFormValues = {
  name: string;
  icon: string;
  description: string;
};

const subjectFields: Record<keyof SubjectFormValues, FieldProperties> = {
  name: { displayName: 'Name', mandatory: true },
  icon: { displayName: 'Icon', mandatory: false, type: 'icon' },
  description: { displayName: 'Description', mandatory: false },
};

export default function SubjectsOverview() {
  const [newOpen, setNewOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectRead | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    data: subjects = [],
    isPending,
    isError,
    error,
  } = useQuery({ queryKey: ['subjects'], queryFn: readSubjects });

  const createSubjectMutation = useMutation({
    mutationFn: (values: SubjectFormValues) => {
      const name = values.name.trim();
      if (!name) {
        throw new Error('Name is required');
      }
      return createSubject({
        name,
        description: values.description || undefined,
        icon: values.icon || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setNewOpen(false);
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: (subjectId: string) => {
      return deleteSubject(subjectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });

  const editSubjectMutation = useMutation({
    mutationFn: ({ subjectId, values }: { subjectId: string; values: SubjectFormValues }) => {
      const name = values.name.trim();
      if (!name) {
        throw new Error('Name is required');
      }
      return updateSubject(subjectId, {
        name,
        description: values.description || undefined,
        icon: values.icon || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setEditingSubject(null);
    },
  });

  if (isPending) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  const numSubjects = subjects.length;
  const numDecks = subjects.reduce((sum, subject) => sum + subject.deck_count, 0);

  const handleClickNew = () => {
    setNewOpen(true);
  };

  const handleClose = () => {
    setNewOpen(false);
    setEditingSubject(null);
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
          navigate(`/decks?subject=${subject.id}`);
        }}
        onEdit={() => {
          setEditingSubject(subject);
        }}
        onDelete={() => {
          deleteSubjectMutation.mutate(subject.id);
        }}
        disableActions={deleteSubjectMutation.isPending || editSubjectMutation.isPending}
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
      {deleteSubjectMutation.isError && (
        <p className="text-sm text-red-600">
          Error deleting subject: {deleteSubjectMutation.error.message}
        </p>
      )}
      {newOpen && (
        <FormModal<SubjectFormValues>
          title="Create New Subject"
          caption="Add a new subject to organize your flashcard decks."
          fields={subjectFields}
          handleClose={handleClose}
          isSubmitting={createSubjectMutation.isPending}
          error={createSubjectMutation.error}
          onSubmit={(values) => createSubjectMutation.mutate(values)}
        />
      )}
      {editingSubject && (
        <FormModal<SubjectFormValues>
          title="Edit Subject"
          caption="Edit the details of this subject."
          fields={subjectFields}
          initialValues={{
            name: editingSubject.name,
            icon: editingSubject.icon ?? '',
            description: editingSubject.description ?? '',
          }}
          handleClose={handleClose}
          isSubmitting={editSubjectMutation.isPending}
          error={editSubjectMutation.error}
          onSubmit={(values) =>
            editSubjectMutation.mutate({ subjectId: editingSubject.id, values })
          }
        />
      )}
    </div>
  );
}
