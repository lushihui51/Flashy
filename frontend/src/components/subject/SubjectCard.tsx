import FallbackIcon from 'src/components/overview/FallbackIcon';
import { DynamicIcon, type IconName } from 'lucide-react/dynamic';
import { BookOpen } from 'lucide-react';
import type { components } from 'src/api/types';
import DeleteCardButton from '../overview/DeleteCardButton';
import EditCardButton from '../overview/EditCardButton';
type SubjectRead = components['schemas']['SubjectRead'];

export default function SubjectCard({ subject }: { subject: SubjectRead }) {
  return (
    <div className="relative rounded-xl border pt-4 px-4 pb-2">
      {subject.icon ? (
        <DynamicIcon name={subject.icon as IconName} size={20} />
      ) : (
        <FallbackIcon size={20} icon={BookOpen} />
      )}
      <span>{subject.deck_count} decks</span>
      {subject.description ? (
        <p className="text-sm text-gray-500">{subject.description}</p>
      ) : (
        <p className="text-sm text-gray-500 italic">An exciting subject</p>
      )}
      {subject.name}
      <button
        className="absolute inset-0 z-0 cursor-pointer rounded-xl"
        onClick={() => {
          console.log(`Clicked on subject ${subject.id}`);
        }}
      />
      <div className="z-10 relative">
        <EditCardButton handleEditCard={() => console.log(`Editing subject ${subject.id}`)} />
      </div>
      <div className="z-10 relative">
        <DeleteCardButton handleDeleteCard={() => console.log(`Deleting subject ${subject.id}`)} />
      </div>
      <div className="border-t-2 border-gray-200 py-2"> View decks &gt; </div>
    </div>
  );
}
