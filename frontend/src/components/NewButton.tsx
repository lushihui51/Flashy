export default function NewButton({
  description,
  onClick = () => {},
}: {
  description: string;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="cursor-pointer">
      {description}
    </button>
  );
}
