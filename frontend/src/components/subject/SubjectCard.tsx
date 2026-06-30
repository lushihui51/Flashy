import FallbackIcon from 'src/components/overview/FallbackIcon';
import { DynamicIcon, type IconName } from 'lucide-react/dynamic';
import type { components } from 'src/api/types';
type SubjectRead = components['schemas']['SubjectRead'];

export default function SubjectCard({ subject }: { subject: SubjectRead }) {
  return (
    <div className="relative rounded-xl border p-4">
      {subject.icon ? (
        <DynamicIcon name={subject.icon as IconName} size={20} />
      ) : (
        <FallbackIcon size={20} />
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
    </div>
  );
}
