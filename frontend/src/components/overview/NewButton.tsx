export default function NewButton({
  onClick = () => {},
}: {
  onClick?: () => void;
}) {
  return <button onClick={onClick}>New</button>;
}
