import { Trash2 } from 'lucide-react';

export default function DeleteCardButton({ handleDeleteCard }: { handleDeleteCard: () => void }) {
  return (
    <button onClick={handleDeleteCard} className="cursor-pointer">
      <Trash2 />
    </button>
  );
}
