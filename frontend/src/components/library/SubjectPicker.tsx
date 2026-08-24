import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { readSubjects } from 'src/api/subject';
import SubjectIcon from 'src/components/library/SubjectIcon';
import PickerCombobox from 'src/components/library/PickerCombobox';
import FullScreenDialog from 'src/components/library/FullScreenDialog';
import { SubjectFormBody } from 'src/components/library/SubjectForm';

/** Only what the picker itself actually needs to display — satisfied by
 * SubjectSummary (the `items` list, from readSubjects), SubjectRead (whatever
 * createSubject/readSubject return), or a hand-built object a caller already has in
 * memory (e.g. SubjectDetailPage's own loaded subject). Deliberately narrower than
 * either full schema so none of them need reshaping just to pass through. */
export type SubjectPickerItem = { id: string; name: string; icon?: string | null };

type SubjectPickerProps = {
  /** Preselects on mount (a true "default": later changes to this prop are ignored,
   * same as a native `<input defaultValue>`) — this is how a contextual entry point
   * (e.g. deck creation opened from a subject's own page) sets the starting parent
   * without removing the choice to change it (D1, corrected in Phase 5.5). */
  defaultValue?: SubjectPickerItem | null;
  /** Static chip, no combobox — edit mode only. Subjects don't have an edit-mode
   * picker today, but the prop stays for symmetry with DeckPicker's identical one. */
  locked?: boolean;
  onChange: (subjectId: string) => void;
};

/** Subject combobox (§4.3), rebuilt in Phase 5.5 on the shared PickerCombobox. The
 * create row (always present, always last — no more "type first" gating, D9 is
 * gone) opens SubjectForm's create body in a FullScreenDialog *over* whatever this
 * picker is embedded in, rather than navigating away — unlike DeckPicker's "New
 * deck…", there's nothing here for the surrounding form to lose (§3 vs §4). */
export default function SubjectPicker({ defaultValue = null, locked, onChange }: SubjectPickerProps) {
  const queryClient = useQueryClient();
  const subjectsQuery = useQuery({ queryKey: ['subjects'], queryFn: readSubjects });
  const items = subjectsQuery.data ?? [];

  const [selected, setSelected] = useState<SubjectPickerItem | null>(defaultValue);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <PickerCombobox<SubjectPickerItem>
        items={items}
        selected={selected}
        onSelect={(item) => {
          setSelected(item);
          onChange(item.id);
        }}
        onSelectCreate={() => setOverlayOpen(true)}
        createLabel="New subject…"
        placeholder="Subject"
        locked={locked}
        renderLeading={(item) => <SubjectIcon icon={item.icon} className="h-4 w-4" />}
        inputRef={inputRef}
      />
      <FullScreenDialog
        open={overlayOpen}
        onClose={() => setOverlayOpen(false)}
        ariaLabel="New subject"
        triggerRef={inputRef}
      >
        <SubjectFormBody
          mode="create"
          subjectId={undefined}
          original={undefined}
          deckCount={0}
          onSuccess={(subject) => {
            void queryClient.invalidateQueries({ queryKey: ['subjects'] });
            setSelected(subject);
            onChange(subject.id);
            setOverlayOpen(false);
          }}
          onCancel={() => setOverlayOpen(false)}
        />
      </FullScreenDialog>
    </>
  );
}
