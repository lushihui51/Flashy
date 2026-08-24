import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { readSubjects } from 'src/api/subject';
import { readDecks } from 'src/api/deck';
import SubjectIcon from 'src/components/library/SubjectIcon';
import ListRow from 'src/components/ui/ListRow';
import { pluralize } from 'src/lib/pluralize';

type Tab = 'subjects' | 'decks';

function CreateButton({ label, to }: { label: string; to: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="h-9 shrink-0 rounded-full bg-(--color-primary) px-3 text-sm font-semibold text-(--color-primary-contrast)"
    >
      {label}
    </button>
  );
}

function EmptyState({ copy, createLabel, createTo }: { copy: string; createLabel: string; createTo: string }) {
  return (
    <div className="flex flex-col items-start gap-3 py-8">
      <p className="text-(--color-text-muted)">{copy}</p>
      <CreateButton label={createLabel} to={createTo} />
    </div>
  );
}

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>('subjects');

  const subjectsQuery = useQuery({ queryKey: ['subjects'], queryFn: readSubjects });
  const decksQuery = useQuery({ queryKey: ['decks'], queryFn: () => readDecks() });

  const subjectNameById = new Map((subjectsQuery.data ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-(--color-text)">Your library</h1>

      <div role="tablist" aria-label="Library" className="mt-4 flex gap-4 border-b border-(--color-surface-elevated)">
        {(['subjects', 'decks'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`h-11 border-b-2 px-1 text-sm font-medium ${
              tab === t
                ? 'border-(--color-primary) text-(--color-text)'
                : 'border-transparent text-(--color-text-muted)'
            }`}
          >
            {t === 'subjects' ? 'Subjects' : 'Decks'}
          </button>
        ))}
      </div>

      {tab === 'subjects' ? (
        <section aria-label="Subjects">
          <div className="flex items-center justify-between py-3">
            <h2 className="text-sm font-medium text-(--color-text-muted)">
              {subjectsQuery.data ? `${subjectsQuery.data.length} subjects` : 'Subjects'}
            </h2>
            <CreateButton label="New subject" to="/subjects/new" />
          </div>

          {subjectsQuery.data && subjectsQuery.data.length === 0 ? (
            <EmptyState
              copy="No subjects yet."
              createLabel="New subject"
              createTo="/subjects/new"
            />
          ) : (
            <ul className="flex flex-col divide-y divide-(--color-surface-elevated)">
              {(subjectsQuery.data ?? []).map((subject) => (
                <li key={subject.id}>
                  <ListRow
                    leading={
                      <span className="flex h-8 w-8 items-center justify-center">
                        <SubjectIcon icon={subject.icon} className="h-5 w-5 text-(--color-text)" />
                      </span>
                    }
                    title={subject.name}
                    subtitle={subject.description || undefined}
                    meta={pluralize(subject.deck_count, 'deck')}
                    to={`/subjects/${subject.id}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section aria-label="Decks">
          <div className="flex items-center justify-between py-3">
            <h2 className="text-sm font-medium text-(--color-text-muted)">
              {decksQuery.data ? `${decksQuery.data.length} decks` : 'Decks'}
            </h2>
            <CreateButton label="New deck" to="/decks/new" />
          </div>

          {decksQuery.data && decksQuery.data.length === 0 ? (
            <EmptyState copy="No decks yet." createLabel="New deck" createTo="/decks/new" />
          ) : (
            <ul className="flex flex-col divide-y divide-(--color-surface-elevated)">
              {(decksQuery.data ?? []).map((deck) => (
                <li key={deck.id}>
                  <Link to={`/decks/${deck.id}`} className="flex min-h-14 flex-col justify-center py-2">
                    <span className="font-medium text-(--color-text)">{deck.name}</span>
                    {subjectNameById.get(deck.subject_id) && (
                      <span className="text-sm text-(--color-text-muted)">
                        {subjectNameById.get(deck.subject_id)}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
