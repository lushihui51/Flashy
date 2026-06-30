export default function Close({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick}>&times;</button>;
}
