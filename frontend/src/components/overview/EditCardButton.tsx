import { SquarePen } from 'lucide-react';

export default function EditCardButton({ handleEditCard }: { handleEditCard: () => void }) {
  return (
    <button onClick={handleEditCard} className="cursor-pointer">
      <SquarePen />
    </button>
  );
}
